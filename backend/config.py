"""
Configuration and environment variable management for JanRakshak AI Backend.
Loads sensitive API keys securely from environment variables.
"""

import os
import logging
from typing import Optional, Dict, Any

from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

logger = logging.getLogger(__name__)


class Config:
    """Application configuration loaded from environment variables."""

    # ============================================
    # BHASHINI / AI4BHARAT API Configuration
    # ============================================
    BHASHINI_API_KEY: Optional[str] = os.getenv("BHASHINI_API_KEY")
    BHASHINI_API_URL: str = os.getenv(
        "BHASHINI_API_URL",
        "https://api.bhashini.gov.in/services/inference"
    )
    BHASHINI_USER_ID: Optional[str] = os.getenv("BHASHINI_USER_ID")
    BHASHINI_ULCA_API_KEY: Optional[str] = os.getenv("BHASHINI_ULCA_API_KEY")

    # ============================================
    # QDRANT VECTOR DATABASE Configuration
    # ============================================
    QDRANT_URL: Optional[str] = os.getenv("QDRANT_URL")
    QDRANT_API_KEY: Optional[str] = os.getenv("QDRANT_API_KEY")
    QDRANT_COLLECTION_NAME: str = os.getenv(
        "QDRANT_COLLECTION_NAME",
        "government_schemes"
    )

    # ============================================
    # AUTH Configuration
    # ============================================
    JANRAKSHAK_USERNAME: str = os.getenv("JANRAKSHAK_USERNAME", "desih26")
    JANRAKSHAK_PASSWORD: str = os.getenv("JANRAKSHAK_PASSWORD", "Win@2026SIH!")

    # ============================================
    # Server Configuration
    # ============================================
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"
    CORS_ORIGINS: list = [
        "http://localhost:5173",
        "http://localhost:3000",
        os.getenv("FRONTEND_URL", "").strip(),
    ]

    @classmethod
    def validate_required_keys(cls) -> bool:
        """
        Validate that all required API keys are configured.
        Returns True if all keys are present, False otherwise.
        """
        missing_keys = []

        if not cls.BHASHINI_API_KEY:
            missing_keys.append("BHASHINI_API_KEY")
            logger.warning(
                "⚠️ BHASHINI_API_KEY not configured. "
                "Speech and translation features will be limited."
            )

        if not cls.QDRANT_URL or not cls.QDRANT_API_KEY:
            missing_keys.append("QDRANT_URL" if not cls.QDRANT_URL else "QDRANT_API_KEY")
            logger.warning(
                "⚠️ QDRANT configuration incomplete. "
                "RAG and semantic search features will be unavailable."
            )

        if missing_keys:
            logger.info(
                f"Missing configuration for: {', '.join(missing_keys)}. "
                "See .env.example for setup instructions."
            )
            return False

        logger.info("✅ All required API keys validated successfully.")
        return True

    @classmethod
    def get_config_summary(cls) -> Dict[str, Any]:
        """Get a summary of current configuration (without exposing keys)."""
        return {
            "environment": cls.ENVIRONMENT,
            "debug": cls.DEBUG,
            "bhashini_configured": bool(cls.BHASHINI_API_KEY),
            "qdrant_configured": bool(cls.QDRANT_URL and cls.QDRANT_API_KEY),
            "cors_origins": [o for o in cls.CORS_ORIGINS if o],
        }


def log_configuration():
    """Log configuration status on startup."""
    logger.info("=" * 60)
    logger.info("JanRakshak AI Backend - Configuration Status")
    logger.info("=" * 60)
    config_summary = Config.get_config_summary()
    for key, value in config_summary.items():
        logger.info(f"  {key}: {value}")
    logger.info("=" * 60)
