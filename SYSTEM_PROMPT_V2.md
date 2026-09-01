# JanSahayak System Prompt - Refined Version 2.0

**Updated**: 2026-09-01  
**Version**: 2.0 (Refined for TTS optimization and scheme analysis)

## Overview

This document describes the refined system prompt for JanSahayak AI, the multi-lingual digital assistant for Indian government welfare schemes.

## Key Improvements in Version 2.0

### 1. **Enhanced Clarity & Structure**
- Organized into clear sections with explicit constraints
- Input, Analysis, and Output formats explicitly defined
- Easier to understand role boundaries and expectations

### 2. **TTS Optimization**
- Explicit prohibition of markdown symbols (*, #, **, _)
- Constraint on response length (max 3 sentences)
- Emphasis on conversational plain-text output
- Ensures audio playback renders correctly without special characters

### 3. **Language-Specific Response**
- **MUST** be written in detected language (not English)
- Supports 7 Indian languages with proper BCP-47 tags
- Warm, accessible tone for low-literacy users

### 4. **Consistent JSON Output**
- Standardized schema across all endpoints
- Exact field names and types specified
- Validates against same schema in Vercel and FastAPI

## System Prompt Structure

```
[ROLE & PERSONA]
├── JanSahayak AI identity
├── Multi-lingual assistant
└── Focus on central and state schemes

[INPUT & INTAKE CONSTRAINTS]
├── Multi-modal audio input handling
├── Auto-language detection
└── Transcription and normalization

[ANALYSIS & SCHEME ENGINE]
├── Intent evaluation
├── Scheme matching
└── Conversational tone

[OUTPUT FORMAT & CONSTRAINTS]
├── Spoken Response Rules
│   ├── Must be in detected language
│   ├── Max 3 sentences
│   ├── NO markdown symbols
│   ├── NO bullet points
│   ├── NO raw links
│   └── NO special characters
└── JSON Output Schema
    ├── detected_language
    ├── user_speech_transcript
    ├── scheme_analysis
    └── spoken_response
```

## Supported Welfare Schemes

1. **PM-KISAN** - Pradhan Mantri Kisan Samman Nidhi
   - Income support for farmer families
   - Rs. 6,000 per year in three installments

2. **Ayushman Bharat - PMJAY**
   - Cashless healthcare access
   - Health cover up to Rs. 5 lakh per family per year

3. **e-SHRAM**
   - Registration for unorganized workers
   - Unified worker identity and scheme visibility

4. **PM Awas Yojana**
   - Housing support for eligible households
   - Affordable housing assistance

5. **PM Swanidhi**
   - Working capital for street vendors
   - Collateral-free loan support

## Supported Languages

| Code | Language | Native | BCP-47 Tag |
|------|----------|--------|-----------|
| hi | Hindi | हिंदी | hi-IN |
| kn | Kannada | ಕನ್ನಡ | kn-IN |
| ta | Tamil | தமிழ் | ta-IN |
| te | Telugu | తెలుగు | te-IN |
| mr | Marathi | मराठी | mr-IN |
| bn | Bengali | বাংলা | bn-IN |
| en | English | English | en-IN |

## Response Format Example

### Input Audio
User speaks in Hindi: "मुझे पीएम किसान के बारे में जानना है"

### Expected JSON Response
```json
{
  "detected_language": "Hindi (hi-IN)",
  "user_speech_transcript": "मुझे पीएम किसान के बारे में जानना है",
  "scheme_analysis": "User is asking about PM-KISAN eligibility. As a farmer with landholding, they may be eligible if annual income is below the specified threshold.",
  "spoken_response": "आप पीएम किसान योजना के लिए पात्र हो सकते हैं अगर आपके पास खेती योग्य भूमि है और वार्षिक आय सीमा के अंतर्गत है। इसके लिए आपको अपने निकटतम CSC या तहसील में आवेदन करना होगा। आपको प्रति वर्ष छह हजार रुपये सहायता मिल सकती है।"
}
```

## Implementation Locations

### Backend Services

1. **FastAPI Backend** (`backend/main.py`)
   - Endpoint: `POST /api/gemini-voice-analyze`
   - Timeout: 30 seconds
   - Configuration: `backend/jansahayak_config.py`

2. **Vercel Serverless** (`api/gemini-voice-analyze.ts`)
   - Endpoint: `POST /api/gemini-voice-analyze`
   - Timeout: 30 seconds
   - Configuration: `frontend/src/config/jansahayak-config.ts`

### Frontend Integration

- **Component**: `GeminiVoiceRecorder.tsx`
- **Hook**: `useVoiceRecorder.ts`
- **Config**: `frontend/src/config/jansahayak-config.ts`

## Critical Rules for TTS Rendering

### ❌ FORBIDDEN (Breaks TTS)
```
"spoken_response": "### PM-KISAN Benefits:
* Rs. 6,000 per year
* 3 installments
Visit https://pmkisan.gov.in for more"
```

### ✅ CORRECT (TTS-Safe)
```
"spoken_response": "आप पीएम किसान के लिए पात्र हो सकते हैं और छह हजार रुपये सालाना पा सकते हैं। आवेदन के लिए अपने CSC में जाएं।"
```

### Key Differences
- No markdown symbols (#, *, **, _, ~~)
- No bullet points or lists
- No raw URLs
- No special characters
- Plain conversational text
- Under 3 sentences
- Natural language flow

## Error Handling

| Scenario | Response |
|----------|----------|
| No audio recorded | Return error status with "No audio was recorded" message |
| Language not detected | Use English as fallback, note in analysis |
| Scheme not recognized | Provide general guidance, explain limitations |
| User speaks too fast | Transcript may be partial, handle gracefully |
| API timeout | Return error with timeout message |

## Performance Targets

- **Recording**: Full audio capture until user stops
- **Analysis**: < 10 seconds total (including API call)
- **Response**: Real-time TTS playback
- **Language Detection**: Automatic, no user input needed
- **Accuracy**: >95% for common Indian languages

## Testing the System Prompt

### Test Case 1: Hindi Speaker
```
Input: "Mujhe PM-KISAN ke liye patrta hai kya?"
Expected Language: Hindi (hi-IN)
Expected Response: In Hindi, under 3 sentences, no markdown
```

### Test Case 2: Tamil Speaker
```
Input: "Ayushman Bharat pathi thozhilkaalikal?"
Expected Language: Tamil (ta-IN)
Expected Response: In Tamil, conversational, TTS-safe
```

### Test Case 3: Long Query
```
Input: "Main ek street vendor hoon aur PM Swanidhi..." (60+ seconds)
Expected: Full transcript captured, analyzed, response in detected language
```

## Deployment Checklist

- [ ] System prompt updated in `backend/main.py`
- [ ] System prompt updated in `api/gemini-voice-analyze.ts`
- [ ] Configuration files created/updated
- [ ] GeminiVoiceRecorder component uses correct endpoint
- [ ] useVoiceRecorder hook handles responses correctly
- [ ] Error messages display in user's language
- [ ] TTS playback works for all supported languages
- [ ] Test with 2-3 users per language
- [ ] Verify no markdown in spoken_response fields
- [ ] Monitor API latency and timeouts

## Version History

### v2.0 (2026-09-01) - Current
- Refined prompt structure with explicit constraints
- TTS optimization (no markdown, short sentences)
- Language-specific response requirement
- Consistent JSON schema across endpoints

### v1.0 (2026-08-25) - Initial
- Basic JanSahayak implementation
- Gemini API integration
- Voice recording functionality

## References

- [JanSahayak System Prompt](../SYSTEM_PROMPT.md)
- [Vercel AI SDK Guide](./VERCEL_AI_SDK_GUIDE.md)
- [Gemini Voice Recorder Guide](./GEMINI_VOICE_RECORDER_GUIDE.md)
- [Google Generative AI API](https://ai.google.dev/)
