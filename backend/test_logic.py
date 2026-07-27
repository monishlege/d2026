import os
import unittest

from main import (
    ChatRequest,
    EligibilityRequest,
    LoginRequest,
    SecurityScanRequest,
    SpeechRequest,
    authenticate,
    chat,
    check_eligibility,
    security_scan,
    speech_to_text,
)


class JanSahayakBackendTests(unittest.TestCase):
    def test_speech_to_text_detects_eligibility_intent(self) -> None:
        response = speech_to_text(
            SpeechRequest(language="hi", text="Can I check eligibility for PM-KISAN?")
        )

        self.assertEqual(response.detected_intent, "eligibility_check")
        self.assertEqual(response.entities["scheme_name"], "PM-KISAN")

    def test_pm_kisan_eligibility_passes_for_low_income_farmer(self) -> None:
        response = check_eligibility(
            EligibilityRequest(
                scheme_name="PM-KISAN",
                annual_income=180000,
                landholding_acres=3,
                has_secc_card=False,
                occupation_code="UNORG",
                owns_pucca_house=False,
                is_street_vendor=False,
            )
        )

        self.assertTrue(response.eligible)
        self.assertGreater(len(response.matched_rules), 0)

    def test_security_scan_flags_spoofed_domain(self) -> None:
        response = security_scan(
            SecurityScanRequest(url="http://pmkisan-guaranteed-benefit.gov.org/login")
        )

        self.assertFalse(response.safe)
        self.assertLess(response.score, 70)

    def test_chat_returns_references(self) -> None:
        response = chat(ChatRequest(query="Tell me about Ayushman Bharat coverage"))

        self.assertIn(response.confidence, {"high", "medium", "low"})
        self.assertGreater(len(response.references), 0)

    def test_auth_accepts_credentials_from_environment(self) -> None:
        original_username = os.environ.get("JANSAHAYAK_USERNAME")
        original_password = os.environ.get("JANSAHAYAK_PASSWORD")

        os.environ["JANSAHAYAK_USERNAME"] = "desih26"
        os.environ["JANSAHAYAK_PASSWORD"] = "Win@2026SIH!"

        try:
            response = authenticate(LoginRequest(username="desih26", password="Win@2026SIH!"))
            self.assertEqual(response.role, "admin")
            self.assertEqual(response.token, "demo-admin-token")
        finally:
            if original_username is None:
                os.environ.pop("JANSAHAYAK_USERNAME", None)
            else:
                os.environ["JANSAHAYAK_USERNAME"] = original_username

            if original_password is None:
                os.environ.pop("JANSAHAYAK_PASSWORD", None)
            else:
                os.environ["JANSAHAYAK_PASSWORD"] = original_password


if __name__ == "__main__":
    unittest.main()
