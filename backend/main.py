import os
import logging
import json
from typing import Dict, List, Literal, Optional, Any
from urllib.parse import urlparse

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from config import Config, log_configuration
from bhashini_client import bhashini_client, BhashiniAPIError
from rag_service import rag_client

try:
    from google import genai
    from google.genai import types
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    logger = logging.getLogger(__name__)
    logger.warning(
        "google-genai library not installed. "
        "Install with: pip install google-genai>=0.3.0"
    )

from mock_data import (
    DIGILOCKER_RECORDS,
    INTENT_KEYWORDS,
    KNOWLEDGE_BASE,
    KNOWN_FRAUD_KEYWORDS,
    LANGUAGE_MAP,
    OFFICIAL_PORTALS,
    SCHEMES,
)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize API integrations
Config.validate_required_keys()
log_configuration()

# Initialize Gemini client
gemini_client = None
if GEMINI_AVAILABLE and Config.GEMINI_API_KEY:
    try:
        gemini_client = genai.Client(api_key=Config.GEMINI_API_KEY)
        logger.info("✅ Gemini API client initialized successfully.")
    except Exception as e:
        logger.warning(f"⚠️ Failed to initialize Gemini client: {str(e)}")
else:
    if not GEMINI_AVAILABLE:
        logger.warning("⚠️ google-genai library not available. Gemini voice analysis will be disabled.")
    if not Config.GEMINI_API_KEY:
        logger.warning("⚠️ GEMINI_API_KEY not configured. Gemini voice analysis will be disabled.")

app = FastAPI(
    title="JanRakshak AI API",
    version="1.0.0",
    description="Voice-first multilingual welfare assistant with Bhashini and Qdrant integration"
)

# Configure CORS
cors_origins = [o for o in Config.CORS_ORIGINS if o]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SpeechRequest(BaseModel):
    language: Literal["hi", "kn", "ta", "te", "mr", "bn", "en"]
    text: Optional[str] = ""
    audio_filename: Optional[str] = None


class SpeechResponse(BaseModel):
    original_language: str
    normalized_text: str
    detected_intent: str
    entities: Dict[str, str]


class EligibilityRequest(BaseModel):
    scheme_name: str
    annual_income: int = Field(ge=0)
    landholding_acres: Optional[float] = Field(default=0, ge=0)
    has_secc_card: bool = False
    occupation_code: Optional[str] = ""
    owns_pucca_house: bool = False
    is_street_vendor: bool = False


class EligibilityResponse(BaseModel):
    scheme_name: str
    eligible: bool
    matched_rules: List[str]
    failed_rules: List[str]
    required_documents: List[str]
    benefit_summary: str


class DigiLockerRequest(BaseModel):
    consent_token: str
    requested_documents: List[Literal["income_certificate", "caste_certificate", "aadhaar_metadata"]]


class DigiLockerDocument(BaseModel):
    type: str
    issuer: str
    verified: bool
    xml_record: str
    extracted_fields: Dict[str, str]


class DigiLockerResponse(BaseModel):
    consent_granted: bool
    documents: List[DigiLockerDocument]


class SecurityScanRequest(BaseModel):
    url: str


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    token: str
    role: str


DEFAULT_AUTH_USERNAME = "desih26"
DEFAULT_AUTH_PASSWORD = "Win@2026SIH!"


def get_expected_auth_credentials() -> tuple[str, str]:
    username = os.getenv("JANRAKSHAK_USERNAME", "").strip() or DEFAULT_AUTH_USERNAME
    password = os.getenv("JANRAKSHAK_PASSWORD", "").strip() or DEFAULT_AUTH_PASSWORD
    return username, password


class SecurityScanResponse(BaseModel):
    url: str
    safe: bool
    score: int
    indicators: List[str]
    official_portal_match: bool


class ChatRequest(BaseModel):
    query: str
    language: Optional[str] = "en"


class ChatResponse(BaseModel):
    answer: str
    confidence: Literal["high", "medium", "low"]
    references: List[str]
    voice_summary: str = ""
    guidance_steps: List[str] = []
    security_check: str = ""
    offline_alert: str = ""
    grievance_tracking_id: Optional[str] = None


class RAGQueryRequest(BaseModel):
    """Request for semantic search over government schemes."""
    query: str
    language: Optional[str] = "en"
    limit: int = Field(default=5, ge=1, le=20)


class RAGDocument(BaseModel):
    """Retrieved document from RAG."""
    id: int
    similarity_score: float
    content: Dict[str, Any]


class RAGQueryResponse(BaseModel):
    """Response with RAG-retrieved documents."""
    query: str
    documents: List[RAGDocument]
    total_found: int
    search_provider: str  # "qdrant" or "mock"


class TranslationRequest(BaseModel):
    """Request for Bhashini translation service."""
    text: str
    source_language: str = Field(default="en", description="Source language code (en, hi, ta, te, kn, mr, bn)")
    target_language: str = Field(default="hi", description="Target language code")


class TranslationResponse(BaseModel):
    """Response from translation service."""
    original_text: str
    translated_text: str
    source_language: str
    target_language: str
    provider: str  # "bhashini" or "mock"


class TTSRequest(BaseModel):
    """Request for Text-to-Speech synthesis."""
    text: str
    language: str = Field(default="hi", description="Language code")
    gender: Literal["male", "female"] = "female"


class TTSResponse(BaseModel):
    """Response with audio URL."""
    text: str
    language: str
    audio_url: str
    provider: str  # "bhashini" or "mock"


class GeminiVoiceAnalyzeResponse(BaseModel):
    """Response from Gemini voice analysis."""
    status: str  # "success" or "error"
    detected_language: Optional[str] = None
    user_speech_transcript: Optional[str] = None
    scheme_analysis: Optional[str] = None
    spoken_response: Optional[str] = None
    error_detail: Optional[str] = None


class ConfigStatusResponse(BaseModel):
    """System configuration status."""
    environment: str
    debug: bool
    bhashini_configured: bool
    qdrant_configured: bool
    cors_origins: List[str]


def detect_intent(text: str) -> str:
    normalized = text.lower().strip()
    for intent, keywords in INTENT_KEYWORDS.items():
        if any(keyword in normalized for keyword in keywords):
            return intent
    return "general_query"


def extract_entities(text: str) -> Dict[str, str]:
    lowered = text.lower()
    entities: Dict[str, str] = {}
    for scheme_name in SCHEMES:
        if scheme_name.lower() in lowered:
            entities["scheme_name"] = scheme_name
            break
    if "income" in lowered:
        entities["focus"] = "income"
    elif "health" in lowered:
        entities["focus"] = "health"
    elif "house" in lowered or "housing" in lowered:
        entities["focus"] = "housing"
    return entities


def normalize_speech(request: SpeechRequest) -> SpeechResponse:
    language_name = LANGUAGE_MAP.get(request.language, "English")
    source_text = (request.text or "").strip()
    normalized_text = source_text if source_text else f"Mock transcript from {language_name} audio input"
    detected_intent = detect_intent(normalized_text)
    entities = extract_entities(normalized_text)
    return SpeechResponse(
        original_language=language_name,
        normalized_text=normalized_text,
        detected_intent=detected_intent,
        entities=entities,
    )


def evaluate_eligibility(payload: EligibilityRequest) -> EligibilityResponse:
    scheme = SCHEMES.get(payload.scheme_name)
    if not scheme:
        return EligibilityResponse(
            scheme_name=payload.scheme_name,
            eligible=False,
            matched_rules=[],
            failed_rules=["Selected scheme is not supported in the prototype."],
            required_documents=[],
            benefit_summary="Scheme details unavailable.",
        )

    rules = scheme["eligibility_rules"]
    matched_rules: List[str] = []
    failed_rules: List[str] = []

    max_income = rules.get("max_income")
    if max_income is not None:
        if payload.annual_income < max_income:
            matched_rules.append(f"Annual income is below Rs. {max_income:,}.")
        else:
            failed_rules.append(f"Annual income must be below Rs. {max_income:,}.")

    max_landholding = rules.get("max_landholding_acres")
    if max_landholding is not None:
        if (payload.landholding_acres or 0) <= max_landholding:
            matched_rules.append(f"Landholding is within {max_landholding} acres.")
        else:
            failed_rules.append(f"Landholding must not exceed {max_landholding} acres.")

    if rules.get("requires_farmer"):
        if (payload.landholding_acres or 0) > 0:
            matched_rules.append("Applicant indicates active landholding for farming.")
        else:
            failed_rules.append("Applicant must have farming landholding.")

    if rules.get("requires_secc"):
        if payload.has_secc_card:
            matched_rules.append("SECC-linked eligibility proof is available.")
        else:
            failed_rules.append("SECC-linked eligibility proof is required.")

    if rules.get("requires_no_pucca_house"):
        if not payload.owns_pucca_house:
            matched_rules.append("Applicant does not own a pucca house.")
        else:
            failed_rules.append("Applicant must not own a pucca house.")

    allowed_occupations = rules.get("occupation_codes")
    if allowed_occupations is not None:
        if (payload.occupation_code or "").upper() in allowed_occupations:
            matched_rules.append("Occupation code matches scheme criteria.")
        else:
            failed_rules.append(f"Occupation code must be one of: {', '.join(allowed_occupations)}.")

    if rules.get("requires_street_vendor"):
        if payload.is_street_vendor:
            matched_rules.append("Applicant is identified as a street vendor.")
        else:
            failed_rules.append("Applicant must be a street vendor.")

    return EligibilityResponse(
        scheme_name=scheme["name"],
        eligible=len(failed_rules) == 0,
        matched_rules=matched_rules,
        failed_rules=failed_rules,
        required_documents=scheme["required_documents"],
        benefit_summary=scheme["benefit_summary"],
    )


def score_url(url: str) -> SecurityScanResponse:
    parsed = urlparse(url if "://" in url else f"https://{url}")
    hostname = (parsed.netloc or parsed.path).lower()
    indicators: List[str] = []
    score = 100

    if parsed.scheme != "https":
        indicators.append("Missing SSL/HTTPS protection.")
        score -= 35

    if hostname.endswith(".in.net") or hostname.endswith(".gov.org") or ".gov." in hostname and not hostname.endswith(".gov.in"):
        indicators.append("Suspicious government-like domain extension detected.")
        score -= 25

    if any(keyword in url.lower() for keyword in KNOWN_FRAUD_KEYWORDS):
        indicators.append("Fraud-associated promotional keyword detected in the URL.")
        score -= 20

    if hostname.count("-") >= 3 or hostname.count(".") > 3:
        indicators.append("Domain structure appears unusually noisy or spoof-like.")
        score -= 10

    official_match = any(portal in hostname for portal in OFFICIAL_PORTALS)
    if official_match:
        indicators.append("Matches a known official government portal pattern.")
        score = min(100, score + 10)

    safe = score >= 70 and official_match
    if not indicators:
        indicators.append("No immediate phishing heuristics were triggered.")

    return SecurityScanResponse(
        url=url,
        safe=safe,
        score=max(0, min(score, 100)),
        indicators=indicators,
        official_portal_match=official_match,
    )


def retrieve_knowledge(query: str) -> ChatResponse:
    lowered = query.lower()
    if any(term in lowered for term in ("grievance", "missing benefit", "payment delayed", "delay", "not received")):
        tracking_id = "GRV-" + os.urandom(3).hex().upper()
        answer = (
            "Please register a grievance with the scheme's official department or visit a CSC. "
            f"Your draft tracking ID is {tracking_id}. Expected first response: 7 to 30 days."
        )
        return ChatResponse(
            answer=answer,
            confidence="medium",
            references=["Citizen grievance guidance"],
            voice_summary="I can help you report a missing benefit or delay. Register a grievance and keep the tracking ID for follow-up.",
            guidance_steps=[
                "Step 1: Note the scheme name, application number, payment date, and the missing benefit.",
                "Step 2: Keep Aadhaar, bank details, acknowledgement, and relevant certificates ready.",
                "Step 3: Submit the grievance on the official scheme portal or at your nearest CSC or E-Seva Kendra.",
            ],
            security_check="Use only the verified .gov.in or .nic.in portal shown by the official department. Check HTTPS and the exact domain before submitting details.",
            offline_alert="Would you like an SMS or WhatsApp status alert for this grievance?",
            grievance_tracking_id=tracking_id,
        )

    ranked = []
    for item in KNOWLEDGE_BASE:
        score = 0
        if item["scheme"].lower() in lowered:
            score += 3
        for token in item["content"].lower().replace(",", "").split():
            if token in lowered:
                score += 1
        ranked.append((score, item))

    ranked.sort(key=lambda pair: pair[0], reverse=True)
    best_score, best_item = ranked[0]

    if best_score >= 6:
        confidence = "high"
    elif best_score >= 3:
        confidence = "medium"
    else:
        confidence = "low"

    answer = (
        f"{best_item['scheme']}: {best_item['content']}"
        if best_score > 0
        else "I could not strongly ground this answer in the scheme knowledge base. Please verify with an official portal or a human support officer."
    )

    scheme = SCHEMES.get(best_item["scheme"])
    official_domain = None
    if best_item["scheme"] == "Ayushman Bharat":
        official_domain = "beneficiary.nha.gov.in"
    elif best_item["scheme"] == "PM Awas Yojana":
        official_domain = "pmaymis.gov.in"
    elif best_item["scheme"] == "PM Swanidhi":
        official_domain = "pmsvanidhi.mohua.gov.in"
    elif best_item["scheme"] == "e-SHRAM":
        official_domain = "eshram.gov.in"
    elif best_item["scheme"] == "PM-KISAN":
        official_domain = "pmkisan.gov.in"

    required_documents = ", ".join(scheme["required_documents"]) if scheme else "Aadhaar, income or caste certificate, and relevant land or residence records"
    return ChatResponse(
        answer=answer,
        confidence=confidence,
        references=[best_item["title"]] if best_score > 0 else ["Official government portal verification recommended"],
        voice_summary=(
            f"{best_item['scheme']} may help with {scheme['benefit_summary'].lower()}"
            if scheme
            else answer
        ),
        guidance_steps=[
            "Step 1: Eligibility Check: compare your income, occupation, land, housing, or SECC details with the scheme criteria.",
            f"Step 2: Verified Documents Needed: {required_documents}.",
            f"Step 3: How to Apply: use https://{official_domain} or visit your nearest CSC or E-Seva Kendra." if official_domain else "Step 3: How to Apply: visit your nearest CSC or E-Seva Kendra and ask for the official scheme desk.",
        ],
        security_check=(
            f"Official domain pattern matched: {official_domain}. Use HTTPS and confirm the exact .gov.in or .nic.in domain before sharing details."
            if official_domain
            else "No official portal was matched locally. Do not open an unverified link; confirm it with a CSC or government office."
        ),
        offline_alert="Would you like an SMS or WhatsApp status alert for application updates?",
    )


@app.post("/api/auth/login", response_model=LoginResponse)
def authenticate(payload: LoginRequest) -> LoginResponse:
    expected_username, expected_password = get_expected_auth_credentials()

    if payload.username == expected_username and payload.password == expected_password:
        return LoginResponse(token="demo-admin-token", role="admin")

    raise HTTPException(status_code=401, detail="Invalid username or password")


@app.get("/api/health")
def healthcheck() -> Dict[str, str]:
    return {"status": "ok"}


@app.get("/api/schemes")
def list_schemes() -> Dict[str, List[Dict[str, str]]]:
    schemes = [
        {
            "name": item["name"],
            "description": item["description"],
            "benefit_summary": item["benefit_summary"],
        }
        for item in SCHEMES.values()
    ]
    return {"schemes": schemes}


@app.post("/api/speech-to-text", response_model=SpeechResponse)
def speech_to_text(request: SpeechRequest) -> SpeechResponse:
    return normalize_speech(request)


@app.post("/api/check-eligibility", response_model=EligibilityResponse)
def check_eligibility(payload: EligibilityRequest) -> EligibilityResponse:
    return evaluate_eligibility(payload)


@app.post("/api/digilocker/fetch", response_model=DigiLockerResponse)
def fetch_digilocker(payload: DigiLockerRequest) -> DigiLockerResponse:
    consent_granted = payload.consent_token.strip().lower() == "janrakshak-consent-ok"
    documents = []

    if consent_granted:
        for document_type in payload.requested_documents:
            record = DIGILOCKER_RECORDS[document_type]
            documents.append(
                DigiLockerDocument(
                    type=document_type,
                    issuer=record["issuer"],
                    verified=True,
                    xml_record=record["xml_record"],
                    extracted_fields=record["extracted_fields"],
                )
            )

    return DigiLockerResponse(consent_granted=consent_granted, documents=documents)


@app.post("/api/security/scan-url", response_model=SecurityScanResponse)
def security_scan(payload: SecurityScanRequest) -> SecurityScanResponse:
    return score_url(payload.url)


@app.post("/api/chat", response_model=ChatResponse)
def chat(payload: ChatRequest) -> ChatResponse:
    return retrieve_knowledge(payload.query)


# ============================================
# BHASHINI API Endpoints
# ============================================

@app.post("/api/translate", response_model=TranslationResponse)
def translate_text(request: TranslationRequest) -> TranslationResponse:
    """
    Translate text using Bhashini AI4Bharat service.
    
    Falls back to identity translation if Bhashini is not configured.
    """
    try:
        result = bhashini_client.translate_text(
            text=request.text,
            source_lang=request.source_language,
            target_lang=request.target_language
        )
        
        return TranslationResponse(
            original_text=request.text,
            translated_text=result.get("translated_text", request.text),
            source_language=request.source_language,
            target_language=request.target_language,
            provider=result.get("provider", "mock")
        )
    
    except BhashiniAPIError as e:
        logger.error(f"Translation error: {str(e)}")
        raise HTTPException(
            status_code=503,
            detail="Translation service temporarily unavailable. Please try again later."
        )
    except Exception as e:
        logger.error(f"Unexpected translation error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/tts", response_model=TTSResponse)
def text_to_speech(request: TTSRequest) -> TTSResponse:
    """
    Convert text to speech using Bhashini TTS service.
    
    Falls back to mock audio URL if Bhashini is not configured.
    """
    try:
        result = bhashini_client.text_to_speech(
            text=request.text,
            language=request.language,
            gender=request.gender
        )
        
        return TTSResponse(
            text=request.text,
            language=request.language,
            audio_url=result.get("audio_url", ""),
            provider=result.get("provider", "mock")
        )
    
    except BhashiniAPIError as e:
        logger.error(f"TTS error: {str(e)}")
        raise HTTPException(
            status_code=503,
            detail="Text-to-Speech service temporarily unavailable."
        )
    except Exception as e:
        logger.error(f"Unexpected TTS error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================
# GOOGLE GEMINI Voice Analysis Endpoints
# ============================================

@app.post("/api/gemini-voice-analyze", response_model=GeminiVoiceAnalyzeResponse)
async def analyze_voice_query(audio_file: UploadFile = File(...)) -> GeminiVoiceAnalyzeResponse:
    """
    Analyze voice input using Google Gemini multimodal API.
    
    Process:
    1. Detects the language spoken
    2. Transcribes the audio
    3. Analyzes scheme eligibility
    4. Generates plain-text response in detected language
    
    Returns structured JSON with language, transcript, analysis, and spoken response.
    """
    if not gemini_client:
        return GeminiVoiceAnalyzeResponse(
            status="error",
            error_detail="Gemini API is not configured. Please set GEMINI_API_KEY in environment variables."
        )
    
    try:
        # Read incoming audio bytes
        audio_bytes = await audio_file.read()
        
        if not audio_bytes:
            return GeminiVoiceAnalyzeResponse(
                status="error",
                error_detail="Audio file is empty or could not be read."
            )
        
        # System prompt: JanSahayak Voice & Welfare Intelligence Engine
        system_prompt = """You are "JanSahayak AI", a multi-lingual digital assistant designed for Indian citizens navigating central and state government welfare schemes (such as PM-KISAN, Ayushman Bharat, e-SHRAM, PM Awas Yojana).

[INPUT & INTAKE CONSTRAINTS]
1. Multi-modal Audio Input: You will receive an audio recording of a citizen speaking via microphone. Listen to the complete clip carefully.
2. Auto-Language Detection: Detect the primary native language spoken (e.g., Hindi, Kannada, Tamil, Telugu, English, Bengali, Marathi, etc.).
3. Transcribe & Normalize: Provide a transcript of the spoken query.

[ANALYSIS & SCHEME ENGINE]
1. Intent Evaluation: Analyze the user's intent, requested scheme details, or eligibility criteria.
2. Scheme Matching: Evaluate eligibility rules or provide accurate, concise policy guidance.
3. Conversational Tone: Maintain a warm, clear, and reassuring tone suitable for low-literacy or rural users.

[OUTPUT FORMAT & CONSTRAINTS]
Spoken Response Rules:
- The "spoken_response" field MUST be written in the DETECTED LANGUAGE.
- Keep the spoken response under 3 concise sentences for clear Text-to-Speech (TTS) rendering.
- STRICTLY DO NOT include markdown symbols (*, #, **, _), bullet points, raw links, or special characters in the "spoken_response" text, as these disrupt TTS audio output.

[JSON OUTPUT SCHEMA]
You must return ONLY a valid JSON object matching this exact schema:
{
  "detected_language": "<Detected Language Name & BCP-47 Tag, e.g., Hindi (hi-IN)>",
  "user_speech_transcript": "<Exact or normalized text transcript of the user's speech>",
  "scheme_analysis": "<1-2 sentence technical summary of eligibility or scheme matching>",
  "spoken_response": "<Conversational plain-text answer in the native language to be read aloud via TTS>"
}"""

        # Execute multimodal query with Gemini
        response = gemini_client.models.generate_content(
            model="gemini-3.6-flash",
            contents=[
                types.Part.from_bytes(
                    data=audio_bytes,
                    mime_type=audio_file.content_type or "audio/wav"
                ),
                "Analyze this audio clip: detect the language, transcribe it, analyze the welfare scheme eligibility, and provide the spoken response."
            ],
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                response_mime_type="application/json",
                response_schema={
                    "type": "OBJECT",
                    "properties": {
                        "detected_language": {"type": "STRING"},
                        "user_speech_transcript": {"type": "STRING"},
                        "scheme_analysis": {"type": "STRING"},
                        "spoken_response": {"type": "STRING"}
                    },
                    "required": ["detected_language", "user_speech_transcript", "scheme_analysis", "spoken_response"]
                }
            )
        )
        
        # Parse response
        response_text = response.text
        response_json = json.loads(response_text)
        
        logger.info(f"Gemini analysis completed successfully for audio file: {audio_file.filename}")
        
        return GeminiVoiceAnalyzeResponse(
            status="success",
            detected_language=response_json.get("detected_language"),
            user_speech_transcript=response_json.get("user_speech_transcript"),
            scheme_analysis=response_json.get("scheme_analysis"),
            spoken_response=response_json.get("spoken_response")
        )
    
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Gemini response as JSON: {str(e)}")
        return GeminiVoiceAnalyzeResponse(
            status="error",
            error_detail=f"Invalid response format from Gemini API: {str(e)}"
        )
    
    except Exception as e:
        logger.error(f"Gemini voice analysis error: {str(e)}")
        return GeminiVoiceAnalyzeResponse(
            status="error",
            error_detail=f"Gemini voice analysis failed: {str(e)}"
        )


# ============================================
# QDRANT RAG Endpoints
# ============================================

@app.post("/api/rag/search", response_model=RAGQueryResponse)
def rag_search(request: RAGQueryRequest) -> RAGQueryResponse:
    """
    Semantic search over government scheme documents using Qdrant.
    
    Uses vector similarity to find relevant eligibility rules and scheme info.
    Falls back to mock results if Qdrant is not configured.
    """
    try:
        documents = rag_client.search_by_text(
            query_text=request.query,
            limit=request.limit
        )
        
        rag_documents = [
            RAGDocument(
                id=doc["id"],
                similarity_score=doc["score"],
                content=doc.get("payload", {})
            )
            for doc in documents
        ]
        
        provider = "qdrant" if rag_client.is_configured else "mock"
        
        return RAGQueryResponse(
            query=request.query,
            documents=rag_documents,
            total_found=len(rag_documents),
            search_provider=provider
        )
    
    except Exception as e:
        logger.error(f"RAG search error: {str(e)}")
        raise HTTPException(status_code=500, detail="Search failed")


@app.get("/api/rag/stats")
def rag_stats() -> Dict[str, Any]:
    """Get Qdrant collection statistics."""
    return rag_client.get_collection_stats()


# ============================================
# System Status Endpoints
# ============================================

@app.get("/api/config/status", response_model=ConfigStatusResponse)
def config_status() -> ConfigStatusResponse:
    """Get system configuration status (without exposing keys)."""
    return ConfigStatusResponse(**Config.get_config_summary())


@app.get("/api/health/detailed")
def health_detailed() -> Dict[str, Any]:
    """
    Detailed health check including API integrations.
    """
    return {
        "status": "ok",
        "environment": Config.ENVIRONMENT,
        "bhashini": {
            "configured": bhashini_client.is_configured,
            "provider": "bhashini" if bhashini_client.is_configured else "mock"
        },
        "qdrant": {
            "configured": rag_client.is_configured,
            "collection": rag_client.collection_name,
            "provider": "qdrant" if rag_client.is_configured else "mock"
        },
        "services": {
            "speech_recognition": "enabled",
            "translation": "enabled",
            "tts": "enabled",
            "rag": "enabled"
        }
    }

