from typing import Dict, List, Literal, Optional
from urllib.parse import urlparse

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from mock_data import (
    DIGILOCKER_RECORDS,
    INTENT_KEYWORDS,
    KNOWLEDGE_BASE,
    KNOWN_FRAUD_KEYWORDS,
    LANGUAGE_MAP,
    OFFICIAL_PORTALS,
    SCHEMES,
)


app = FastAPI(title="JanSahayak AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
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

    return ChatResponse(
        answer=answer,
        confidence=confidence,
        references=[best_item["title"]] if best_score > 0 else ["Official government portal verification recommended"],
    )


@app.post("/api/auth/login", response_model=LoginResponse)
def authenticate(payload: LoginRequest) -> LoginResponse:
    if payload.username == "admin" and payload.password == "Secure@2026!":
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
    consent_granted = payload.consent_token.strip().lower() == "jansahayak-consent-ok"
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
