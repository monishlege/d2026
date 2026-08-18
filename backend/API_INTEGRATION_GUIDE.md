# JanRakshak AI Backend - API Integration Guide

## Overview

The JanRakshak AI backend integrates two major external services:

1. **Bhashini / AI4Bharat API** - Multilingual speech and translation
2. **Qdrant Vector Database** - Semantic search and RAG (Retrieval-Augmented Generation)

All integrations include graceful fallback to mock responses when APIs are unavailable.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   FastAPI Backend                        │
└──────────┬────────────────────────────┬──────────────────┘
           │                            │
    ┌──────▼──────┐            ┌────────▼────────┐
    │  Bhashini   │            │  Qdrant Vector  │
    │  AI4Bharat  │            │   Database      │
    └──────┬──────┘            └────────┬────────┘
           │                            │
    ┌──────▼──────┐            ┌────────▼────────┐
    │   STT       │            │  Semantic       │
    │   TTS       │            │  Search (RAG)   │
    │Translation  │            │                 │
    └─────────────┘            └─────────────────┘
```

## Environment Setup

### 1. Create `.env.local` file in backend directory

```bash
# Copy from .env.example
cp .env.example .env.local

# Edit .env.local with your credentials
# NEVER commit .env.local to git
```

### 2. Required Dependencies

```bash
pip install -r requirements.txt
```

Key packages:
- `fastapi` - Web framework
- `qdrant-client` - Vector database client
- `python-dotenv` - Environment variable loading
- `requests` - HTTP client for Bhashini API
- `httpx` - Async HTTP client

## API Endpoints

### Configuration & Status

#### Get System Configuration Status
```
GET /api/config/status
```

Response:
```json
{
  "environment": "development",
  "debug": true,
  "bhashini_configured": true,
  "qdrant_configured": true,
  "cors_origins": ["http://localhost:5173"]
}
```

#### Get Detailed Health Check
```
GET /api/health/detailed
```

Response:
```json
{
  "status": "ok",
  "environment": "development",
  "bhashini": {
    "configured": true,
    "provider": "bhashini"
  },
  "qdrant": {
    "configured": true,
    "collection": "government_schemes",
    "provider": "qdrant"
  },
  "services": {
    "speech_recognition": "enabled",
    "translation": "enabled",
    "tts": "enabled",
    "rag": "enabled"
  }
}
```

---

## Bhashini / AI4Bharat Integration

### Overview

Bhashini provides multilingual AI services for:
- **Speech-to-Text (STT)** - Recognize speech in regional languages
- **Text-to-Speech (TTS)** - Synthesize speech in regional languages
- **Neural Machine Translation (NMT)** - Translate between Indian languages

### Setup Instructions

#### Step 1: Register with Bhashini
1. Visit [https://bhashini.gov.in/](https://bhashini.gov.in/)
2. Create an account
3. Request API access

#### Step 2: Get API Credentials
After approval, you'll receive:
- `BHASHINI_API_KEY` - Main API key for authentication
- `BHASHINI_USER_ID` - Your user ID for API tracking
- `BHASHINI_ULCA_API_KEY` - Optional ULCA integration key

#### Step 3: Configure in `.env.local`
```
BHASHINI_API_KEY=your_actual_key_here
BHASHINI_USER_ID=your_user_id
BHASHINI_API_URL=https://api.bhashini.gov.in/services/inference
```

### API Endpoints

#### Text Translation
```
POST /api/translate
Content-Type: application/json

{
  "text": "What are the eligibility criteria for PM-KISAN?",
  "source_language": "en",
  "target_language": "hi"
}
```

Response:
```json
{
  "original_text": "What are the eligibility criteria for PM-KISAN?",
  "translated_text": "PM-KISAN के लिए पात्रता मानदंड क्या हैं?",
  "source_language": "en",
  "target_language": "hi",
  "provider": "bhashini"
}
```

**Supported Languages:**
- `en` - English
- `hi` - Hindi
- `ta` - Tamil
- `te` - Telugu
- `kn` - Kannada
- `mr` - Marathi
- `bn` - Bengali

#### Text-to-Speech
```
POST /api/tts
Content-Type: application/json

{
  "text": "You are eligible for PM-KISAN scheme",
  "language": "hi",
  "gender": "female"
}
```

Response:
```json
{
  "text": "You are eligible for PM-KISAN scheme",
  "language": "hi",
  "audio_url": "https://bhashini-audio-bucket.s3.amazonaws.com/...",
  "provider": "bhashini"
}
```

### Code Integration

#### Using Bhashini Client

```python
from bhashini_client import bhashini_client

# Translate text
result = bhashini_client.translate_text(
    text="Hello world",
    source_lang="en",
    target_lang="hi"
)
print(result["translated_text"])  # "नमस्ते दुनिया"

# Text to Speech
result = bhashini_client.text_to_speech(
    text="Welcome to JanRakshak",
    language="hi"
)
print(result["audio_url"])
```

### Error Handling

If Bhashini is not configured or API fails:
- Falls back to mock responses
- Logs warnings but doesn't crash
- Returns valid responses with `provider: "mock"`

```python
try:
    result = bhashini_client.translate_text(text, source, target)
except BhashiniAPIError as e:
    logger.error(f"Translation failed: {e}")
    # Application continues with graceful degradation
```

---

## Qdrant Vector Database Integration

### Overview

Qdrant provides semantic search and RAG capabilities:
- **Vector Storage** - Store embeddings of government scheme documents
- **Semantic Search** - Find relevant schemes by meaning, not just keywords
- **RAG (Retrieval-Augmented Generation)** - Retrieve documents before generating responses

### Setup Instructions

#### Option A: Cloud Qdrant (Recommended for Production)

1. Visit [https://qdrant.to/cloud](https://qdrant.to/cloud)
2. Sign up and create a cluster
3. Get your cluster URL and API key
4. Configure in `.env.local`:

```
QDRANT_URL=https://your-cluster.qdrant.io:6333
QDRANT_API_KEY=your_qdrant_api_key
QDRANT_COLLECTION_NAME=government_schemes
```

#### Option B: Docker (For Local Development)

```bash
# Start Qdrant locally
docker run -p 6333:6333 \
  -e QDRANT__API_KEY=dev-key \
  qdrant/qdrant:latest

# Configure in .env.local
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=dev-key
```

#### Option C: Kubernetes (For Scalable Deployment)

See [Qdrant Kubernetes docs](https://qdrant.tech/documentation/deployment/)

### API Endpoints

#### Semantic Search (RAG Query)
```
POST /api/rag/search
Content-Type: application/json

{
  "query": "I am a farmer with less than 1 acre of land, what schemes can I apply for?",
  "language": "en",
  "limit": 5
}
```

Response:
```json
{
  "query": "I am a farmer with less than 1 acre of land...",
  "documents": [
    {
      "id": 1,
      "similarity_score": 0.92,
      "content": {
        "scheme_name": "PM-KISAN",
        "eligibility": "Small and marginal farmers",
        "benefit": "₹6000 per year"
      }
    },
    {
      "id": 2,
      "similarity_score": 0.85,
      "content": {
        "scheme_name": "MGNREGA",
        "eligibility": "Rural unemployed adults",
        "benefit": "100 days wage employment"
      }
    }
  ],
  "total_found": 2,
  "search_provider": "qdrant"
}
```

#### Get Collection Statistics
```
GET /api/rag/stats
```

Response:
```json
{
  "collection_name": "government_schemes",
  "status": "ready",
  "points_count": 1250,
  "vectors_count": 1250,
  "configured": true
}
```

### Code Integration

#### Using RAG Client

```python
from qdrant_client import rag_client

# Search by text query
results = rag_client.search_by_text(
    query_text="farmer income support scheme",
    limit=5
)

for doc in results:
    print(f"Score: {doc['score']}, Content: {doc['payload']}")

# Get collection stats
stats = rag_client.get_collection_stats()
print(f"Total documents: {stats['points_count']}")
```

### Embedding Models

To convert text queries to vectors, use:

```python
from sentence_transformers import SentenceTransformer

# Download once, use many times
model = SentenceTransformer('all-MiniLM-L6-v2')

query = "What are the eligibility criteria for PM-KISAN?"
vector = model.encode(query)  # 384-dimensional vector

# Use vector with Qdrant
results = rag_client.search_similar(
    query_vector=vector,
    limit=5
)
```

### Populating the Database

Example: Add government scheme documents to Qdrant

```python
from sentence_transformers import SentenceTransformer
from qdrant_client.models import PointStruct

model = SentenceTransformer('all-MiniLM-L6-v2')

# Sample documents
schemes = [
    {
        "id": 1,
        "scheme_name": "PM-KISAN",
        "description": "Direct income support to farmers"
    },
    # ... more schemes
]

# Create vectors and points
points = [
    PointStruct(
        id=scheme["id"],
        vector=model.encode(scheme["description"]),
        payload={
            "scheme_name": scheme["scheme_name"],
            "description": scheme["description"]
        }
    )
    for scheme in schemes
]

# Add to Qdrant
rag_client.add_documents(points)
```

### Error Handling

If Qdrant is not configured:
- Falls back to mock search results
- Returns predefined government schemes
- Logs warnings but doesn't crash
- `search_provider` will be "mock"

```python
# This works regardless of Qdrant configuration
results = rag_client.search_by_text(query)
# Results are either from Qdrant or mocks
```

---

## Configuration Priority

Variables are loaded in this order (first found wins):

1. **`.env.local`** - Local development overrides
2. **`.env`** - Committed configuration
3. **Environment variables** - System-level
4. **Defaults** - Built-in fallbacks

```python
# Example: Load with defaults
BHASHINI_API_KEY = os.getenv("BHASHINI_API_KEY")  # From .env or .env.local
if not BHASHINI_API_KEY:
    logger.warning("Bhashini not configured, using mock mode")
```

## Logging

All integrations log their status on startup:

```
INFO - Configuration Status
INFO - environment: development
INFO - debug: true
INFO - bhashini_configured: true
INFO - qdrant_configured: true
INFO - cors_origins: ['http://localhost:5173']
```

View logs while running:

```bash
# Development with verbose logging
python -m uvicorn main:app --reload --log-level info

# Production with error logging
python -m uvicorn main:app --log-level warning
```

## Testing

### Test Bhashini Integration

```bash
curl -X POST http://localhost:8000/api/translate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello",
    "source_language": "en",
    "target_language": "hi"
  }'
```

### Test Qdrant Integration

```bash
curl -X POST http://localhost:8000/api/rag/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "farmer scheme",
    "limit": 5
  }'
```

### Test Configuration Status

```bash
curl http://localhost:8000/api/config/status
curl http://localhost:8000/api/health/detailed
```

## Troubleshooting

### Bhashini Issues

**"BHASHINI_API_KEY not configured"**
- Add `BHASHINI_API_KEY` to `.env.local`
- Restart the application
- Check Bhashini Console for active keys

**"Failed to connect to Bhashini API"**
- Verify API key is correct
- Check internet connection
- Verify Bhashini API URL is accessible
- Check Bhashini service status

### Qdrant Issues

**"Qdrant configuration incomplete"**
- Add both `QDRANT_URL` and `QDRANT_API_KEY` to `.env.local`
- Or start local Docker container
- Restart the application

**"Failed to connect to Qdrant"**
- Verify URL and API key
- Check if Qdrant service is running
- For Docker: `docker ps | grep qdrant`
- For Cloud: Check cluster status in Qdrant Console

**Collection not found**
- RAG client auto-creates collection on first use
- Or manually create via Qdrant API
- Check collection name matches `QDRANT_COLLECTION_NAME`

## Performance Tips

1. **Cache Embeddings** - Don't re-encode same queries
2. **Batch Requests** - Send multiple translations together
3. **Use Async** - Implement FastAPI async handlers for I/O
4. **Vector Compression** - Use Qdrant's quantization for large databases
5. **Connection Pooling** - Reuse HTTP connections

## Security Best Practices

1. ✅ **Never commit `.env` files** - Use `.env.example` template
2. ✅ **Rotate API keys** - Regularly update credentials
3. ✅ **Use HTTPS** - In production, use SSL/TLS
4. ✅ **Validate input** - Use Pydantic models for validation
5. ✅ **Rate limit** - Add request throttling in production
6. ✅ **Monitor logs** - Track failed API calls and errors

## Production Deployment

### Dockerfile Example

```dockerfile
FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Environment Variables in Production

Use secrets management:
- AWS Secrets Manager
- Google Cloud Secret Manager
- HashiCorp Vault
- Kubernetes Secrets

**Never use `.env` files in production!**

### Scaling

1. **Horizontal** - Multiple API instances behind load balancer
2. **Caching** - Redis for API response caching
3. **Queue** - Celery/RabbitMQ for async jobs
4. **CDN** - Serve audio files from CDN

## API Documentation

Full interactive documentation available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Support & Resources

- [Bhashini Documentation](https://bhashini.gov.in/)
- [Qdrant Documentation](https://qdrant.tech/documentation/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Project GitHub Issues](https://github.com/your-org/janrakshak-ai)

