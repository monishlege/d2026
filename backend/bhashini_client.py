"""
Bhashini / AI4Bharat API Integration Module.

Handles multilingual speech-to-text, text-to-speech, and translation services
using the Bhashini unified API endpoint.

API Reference: https://bhashini.gov.in/
"""

import logging
import json
from typing import Dict, List, Optional, Any

import requests
from requests.exceptions import RequestException, Timeout, ConnectionError

from config import Config

logger = logging.getLogger(__name__)

# Supported languages mapping
LANGUAGE_CODES = {
    "hi": "hin_Deva",      # Hindi
    "en": "eng_Latn",      # English
    "ta": "tam_Taml",      # Tamil
    "te": "tel_Telu",      # Telugu
    "kn": "kan_Knda",      # Kannada
    "mr": "mar_Deva",      # Marathi
    "bn": "ben_Beng",      # Bengali
}

LANGUAGE_NAMES = {
    "hin_Deva": "Hindi",
    "eng_Latn": "English",
    "tam_Taml": "Tamil",
    "tel_Telu": "Telugu",
    "kan_Knda": "Kannada",
    "mar_Deva": "Marathi",
    "ben_Beng": "Bengali",
}


class BhashiniAPIError(Exception):
    """Custom exception for Bhashini API errors."""
    pass


class BhashiniClient:
    """Client for interacting with Bhashini AI4Bharat services."""

    def __init__(self):
        """Initialize Bhashini client with API credentials."""
        self.api_key = Config.BHASHINI_API_KEY
        self.api_url = Config.BHASHINI_API_URL
        self.user_id = Config.BHASHINI_USER_ID
        self.ulca_api_key = Config.BHASHINI_ULCA_API_KEY
        self.is_configured = bool(self.api_key)
        
        if not self.is_configured:
            logger.warning(
                "⚠️ Bhashini API not configured. "
                "Using mock responses for speech and translation services."
            )

    def translate_text(
        self,
        text: str,
        source_lang: str,
        target_lang: str = "eng_Latn"
    ) -> Dict[str, Any]:
        """
        Translate text from source language to target language.
        
        Args:
            text: Text to translate
            source_lang: Source language code (e.g., "hi", "ta")
            target_lang: Target language code (default: English)
            
        Returns:
            Dictionary with translated text and metadata
        """
        if not self.is_configured:
            logger.info(f"Mock translation: {text[:50]}... ({source_lang} → {target_lang})")
            return {
                "translated_text": text,
                "source_language": source_lang,
                "target_language": target_lang,
                "confidence": 0.85,
                "provider": "mock",
            }

        try:
            # Convert language code to Bhashini format
            bhashini_source = LANGUAGE_CODES.get(source_lang, source_lang)
            bhashini_target = LANGUAGE_CODES.get(target_lang, target_lang)

            payload = {
                "input": [{"source": text}],
                "config": {
                    "language": {
                        "sourceLanguage": bhashini_source,
                        "targetLanguage": bhashini_target,
                    },
                    "domain": "financial",
                    "userId": self.user_id or "janrakshak-user",
                },
            }

            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }

            response = requests.post(
                f"{self.api_url}/translate",
                json=payload,
                headers=headers,
                timeout=10
            )

            if response.status_code != 200:
                raise BhashiniAPIError(
                    f"Translation API error: {response.status_code} - {response.text}"
                )

            result = response.json()
            
            return {
                "translated_text": result.get("output", [{}])[0].get("target", text),
                "source_language": source_lang,
                "target_language": target_lang,
                "confidence": result.get("confidence", 0.9),
                "provider": "bhashini",
            }

        except (RequestException, Timeout, ConnectionError) as e:
            logger.error(f"❌ Bhashini API connection error: {str(e)}")
            raise BhashiniAPIError(f"Failed to connect to Bhashini API: {str(e)}")

        except (json.JSONDecodeError, KeyError) as e:
            logger.error(f"❌ Bhashini API response error: {str(e)}")
            raise BhashiniAPIError(f"Invalid response from Bhashini API: {str(e)}")

    def speech_to_text(
        self,
        audio_data: bytes,
        language: str
    ) -> Dict[str, Any]:
        """
        Convert speech audio to text using ASR.
        
        Args:
            audio_data: Audio bytes (WAV/MP3)
            language: Language code (e.g., "hi", "ta")
            
        Returns:
            Dictionary with transcribed text and metadata
        """
        if not self.is_configured:
            logger.info(f"Mock STT: audio input in {language}")
            return {
                "transcribed_text": "Mock transcription of audio input",
                "language": language,
                "confidence": 0.87,
                "provider": "mock",
            }

        try:
            bhashini_lang = LANGUAGE_CODES.get(language, language)

            files = {
                "audio": ("audio.wav", audio_data, "audio/wav")
            }
            
            data = {
                "language": bhashini_lang,
                "userId": self.user_id or "janrakshak-user",
            }

            headers = {
                "Authorization": f"Bearer {self.api_key}",
            }

            response = requests.post(
                f"{self.api_url}/asr",
                files=files,
                data=data,
                headers=headers,
                timeout=15
            )

            if response.status_code != 200:
                raise BhashiniAPIError(
                    f"ASR API error: {response.status_code} - {response.text}"
                )

            result = response.json()

            return {
                "transcribed_text": result.get("transcript", ""),
                "language": language,
                "confidence": result.get("confidence", 0.85),
                "provider": "bhashini",
            }

        except (RequestException, Timeout, ConnectionError) as e:
            logger.error(f"❌ Bhashini ASR connection error: {str(e)}")
            raise BhashiniAPIError(f"Failed to connect to Bhashini ASR: {str(e)}")

        except (json.JSONDecodeError, KeyError) as e:
            logger.error(f"❌ Bhashini ASR response error: {str(e)}")
            raise BhashiniAPIError(f"Invalid response from Bhashini ASR: {str(e)}")

    def text_to_speech(
        self,
        text: str,
        language: str,
        gender: str = "female"
    ) -> Dict[str, Any]:
        """
        Convert text to speech audio.
        
        Args:
            text: Text to convert to speech
            language: Language code (e.g., "hi", "ta")
            gender: Speaker gender ("male" or "female")
            
        Returns:
            Dictionary with audio data and metadata
        """
        if not self.is_configured:
            logger.info(f"Mock TTS: '{text[:30]}...' in {language}")
            return {
                "audio_url": f"mock://audio/{language}/sample.mp3",
                "language": language,
                "duration_seconds": len(text) * 0.1,  # Rough estimate
                "provider": "mock",
            }

        try:
            bhashini_lang = LANGUAGE_CODES.get(language, language)

            payload = {
                "input": [{"source": text}],
                "config": {
                    "language": {
                        "sourceLanguage": bhashini_lang,
                    },
                    "gender": gender,
                    "userId": self.user_id or "janrakshak-user",
                },
            }

            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }

            response = requests.post(
                f"{self.api_url}/tts",
                json=payload,
                headers=headers,
                timeout=15
            )

            if response.status_code != 200:
                raise BhashiniAPIError(
                    f"TTS API error: {response.status_code} - {response.text}"
                )

            result = response.json()

            return {
                "audio_url": result.get("audio_url", ""),
                "audio_data": result.get("audio", None),
                "language": language,
                "provider": "bhashini",
            }

        except (RequestException, Timeout, ConnectionError) as e:
            logger.error(f"❌ Bhashini TTS connection error: {str(e)}")
            raise BhashiniAPIError(f"Failed to connect to Bhashini TTS: {str(e)}")

        except (json.JSONDecodeError, KeyError) as e:
            logger.error(f"❌ Bhashini TTS response error: {str(e)}")
            raise BhashiniAPIError(f"Invalid response from Bhashini TTS: {str(e)}")


# Initialize global client
bhashini_client = BhashiniClient()
