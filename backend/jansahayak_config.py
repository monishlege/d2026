"""
JanSahayak AI System Prompt and Configuration

Centralized configuration used across all Gemini voice analysis endpoints.
Ensures consistent behavior in FastAPI backend and Vercel serverless.

Updated: 2026-09-01
Version: 2.0 (Refined for TTS optimization and scheme analysis)
"""

JANSAHAYAK_SYSTEM_PROMPT = """You are "JanSahayak AI", a multi-lingual digital assistant designed for Indian citizens navigating central and state government welfare schemes (such as PM-KISAN, Ayushman Bharat, e-SHRAM, PM Awas Yojana).

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

SUPPORTED_LANGUAGES = {
    "hi": {"name": "Hindi", "native": "हिंदी", "code": "hi-IN"},
    "kn": {"name": "Kannada", "native": "ಕನ್ನಡ", "code": "kn-IN"},
    "ta": {"name": "Tamil", "native": "தமிழ்", "code": "ta-IN"},
    "te": {"name": "Telugu", "native": "తెలుగు", "code": "te-IN"},
    "mr": {"name": "Marathi", "native": "मराठी", "code": "mr-IN"},
    "bn": {"name": "Bengali", "native": "বাংলা", "code": "bn-IN"},
    "en": {"name": "English", "native": "English", "code": "en-IN"},
}

WELFARE_SCHEMES = {
    "PM-KISAN": {
        "name": "Pradhan Mantri Kisan Samman Nidhi",
        "description": "Income support for eligible farmer families",
        "benefit": "Rs. 6,000 per year in three installments",
        "eligibility": [
            "Landholding farmer families",
            "Annual income below threshold",
            "Holding agricultural land"
        ],
        "documents": ["Aadhaar", "Land documents", "Bank account details"]
    },
    "Ayushman Bharat": {
        "name": "Ayushman Bharat - PMJAY",
        "description": "Cashless healthcare access for eligible families",
        "benefit": "Health cover up to Rs. 5 lakh per family per year",
        "eligibility": [
            "SECC/BPL cardholders",
            "Low-income households",
            "Unorganized sector workers"
        ],
        "documents": ["Aadhaar", "SECC card", "Family details"]
    },
    "e-SHRAM": {
        "name": "e-SHRAM Registration",
        "description": "Registration and welfare access for unorganized workers",
        "benefit": "Unified worker identity and scheme visibility",
        "eligibility": [
            "Unorganized sector workers",
            "Street vendors",
            "Construction workers",
            "Agricultural laborers"
        ],
        "documents": ["Aadhaar", "Bank details"]
    },
    "PM Awas Yojana": {
        "name": "Pradhan Mantri Awas Yojana",
        "description": "Housing support for families without a pucca house",
        "benefit": "Affordable housing assistance for eligible households",
        "eligibility": [
            "No pucca house ownership",
            "Annual income limits vary by region",
            "Indian citizen"
        ],
        "documents": ["Aadhaar", "Income certificate", "Property proof"]
    },
    "PM Swanidhi": {
        "name": "PM Swanidhi Scheme",
        "description": "Working capital support for street vendors",
        "benefit": "Collateral-free working capital loan support",
        "eligibility": [
            "Street vendors",
            "Self-employed",
            "Fixed place of business"
        ],
        "documents": ["Aadhaar", "Vending license", "Bank details"]
    }
}

ERROR_MESSAGES = {
    "NO_AUDIO": "No audio was recorded. Please speak clearly and try again.",
    "INVALID_LANGUAGE": "Unable to detect language. Please ensure you're speaking clearly.",
    "API_ERROR": "Service temporarily unavailable. Please try again in a few moments.",
    "INVALID_RESPONSE": "Unable to process your request. Please try again.",
    "EMPTY_TRANSCRIPT": "Could not understand the audio. Please speak clearly."
}

TTS_CONFIG = {
    "rate": 0.9,              # Slower speech for clarity
    "pitch": 1.0,             # Natural pitch
    "volume": 1.0,            # Maximum volume
    "max_sentences": 3,       # Maximum sentences in response
    "max_characters": 150     # Maximum characters for TTS readability
}
