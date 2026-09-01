# Vercel AI SDK Integration Guide

## Overview

This guide explains how to deploy JanSahayak with Vercel AI SDK for serverless voice and welfare scheme analysis.

## Architecture

### Two Deployment Options

#### Option 1: FastAPI Backend (Current)
- **Framework**: FastAPI
- **Location**: `backend/main.py`
- **Endpoint**: POST `/api/gemini-voice-analyze`
- **Timeout**: 30 seconds
- **Best for**: Traditional server deployment, Docker containers

#### Option 2: Vercel API Route (Next.js)
- **Framework**: Next.js + Vercel AI SDK
- **Location**: `api/gemini-voice-analyze.ts`
- **Endpoint**: POST `/api/gemini-voice-analyze`
- **Timeout**: 30 seconds
- **Best for**: Serverless edge deployment, fast cold-start times

## Vercel AI SDK Setup (Option 2)

### 1. Install Dependencies

```bash
cd frontend
npm install ai @ai-sdk/google zod
```

### 2. Environment Variables

Add to your Vercel project settings or `.env.local`:

```env
GOOGLE_GENERATIVE_AI_API_KEY=<your-gemini-api-key>
```

### 3. Update `next.config.js`

If migrating from Vite to Next.js:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Add other config as needed
};

module.exports = nextConfig;
```

### 4. API Route Structure

```
api/
└── gemini-voice-analyze.ts    # Main voice analysis endpoint
```

### 5. Usage

**Request:**
```bash
curl -X POST https://your-domain.com/api/gemini-voice-analyze \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "मुझे पीएम किसान योजना के बारे में जानना है",
    "userContext": "Annual income: Rs. 100,000, Farmer, 2 acres land"
  }'
```

**Response:**
```json
{
  "detected_language": "Hindi (hi-IN)",
  "user_speech_transcript": "मुझे पीएम किसान योजना के बारे में जानना है",
  "scheme_analysis": "User is asking about PM-KISAN eligibility. Based on self-identified farmer status with 2 acres landholding and income within eligible range.",
  "spoken_response": "आप पीएम किसान योजना के लिए पात्र हो सकते हैं। आपको प्रति वर्ष छह हजार रुपये की सहायता मिल सकती है। आवेदन के लिए अपने CSC या तहसील में जाएं।"
}
```

## System Prompt Features

The JanSahayak AI system prompt includes:

✅ **Automatic Language Detection**
- Hindi, Kannada, Tamil, Telugu, English, Bengali, Marathi
- Returns BCP-47 language code

✅ **Scheme Eligibility Analysis**
- Income-based criteria (PM-KISAN, Ayushman Bharat)
- Occupation-based (e-SHRAM, PM Swanidhi)
- Property/Land criteria (PM Awas Yojana)
- Special categories (street vendors, artisans)

✅ **TTS-Friendly Output**
- NO markdown formatting (*, #, **)
- NO raw URLs or HTML
- Plain conversational text
- Under 3 sentences per response

✅ **Serverless Optimization**
- Timeout: 30 seconds
- Response time: < 10 seconds target
- Minimal latency for real-time voice interaction

## Deployment Checklist

- [ ] Set `GOOGLE_GENERATIVE_AI_API_KEY` in Vercel project settings
- [ ] Update `vercel.json` with `maxDuration: 30` for the API route
- [ ] Test locally: `npm run dev`
- [ ] Deploy: `vercel deploy`
- [ ] Monitor cold-start times and timeouts

## Vercel Configuration (`vercel.json`)

```json
{
  "functions": {
    "api/gemini-voice-analyze.ts": {
      "maxDuration": 30,
      "memory": 3008
    }
  },
  "env": {
    "GOOGLE_GENERATIVE_AI_API_KEY": "@google_generative_ai_api_key"
  }
}
```

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `GEMINI_API_KEY not configured` | Missing API key | Set `GOOGLE_GENERATIVE_AI_API_KEY` in env |
| `Function exceeded timeout` | Large audio or slow response | Optimize prompt, reduce audio size |
| `Invalid JSON response` | Gemini returned malformed JSON | Retry or check system prompt |
| `Empty audio file` | No audio data received | Ensure audio encoding is correct |

## Performance Optimization

### Reduce Cold-Start Time
- Use `gemini-2.5-flash` (fastest model)
- Set memory to 3008 MB in `vercel.json`
- Avoid large dependencies in the API route

### Optimize Response Time
- Keep system prompt concise
- Use Zod schema for structured output
- Limit transcript length in prompt

### Monitor with Vercel Analytics
```bash
vercel analytics enable
```

## Testing the API Route Locally

```bash
# Terminal 1: Start Next.js dev server
npm run dev

# Terminal 2: Test with curl
curl -X POST http://localhost:3000/api/gemini-voice-analyze \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello, I am a farmer with 2 acres of land. Am I eligible for PM-KISAN?"}'
```

## Migration from FastAPI to Vercel

If switching from FastAPI backend to Vercel:

1. **Export FastAPI endpoint response schema** → Use same Zod schema
2. **Update frontend API client** to call `/api/gemini-voice-analyze` instead of `/api/gemini-voice-analyze`
3. **Remove backend dependency** (optional, keep for fallback)
4. **Deploy to Vercel** and update CORS origins

## References

- [Vercel AI SDK Documentation](https://sdk.vercel.ai/)
- [Google Generative AI API](https://ai.google.dev/)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [Zod Schema Validation](https://zod.dev/)
