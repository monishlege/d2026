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


class JanRakshakBackendTests(unittest.TestCase):
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
        self.assertEqual(len(response.guidance_steps), 3)
        self.assertIn("beneficiary.nha.gov.in", response.security_check)

    def test_chat_creates_grievance_tracking_id(self) -> None:
        response = chat(ChatRequest(query="My PM-KISAN payment is delayed"))

        self.assertRegex(response.grievance_tracking_id or "", r"^GRV-[0-9A-F]{6}$")
        self.assertIn("7 to 30 days", response.answer)

    def test_auth_accepts_credentials_from_environment(self) -> None:
        original_username = os.environ.get("JANRAKSHAK_USERNAME")
        original_password = os.environ.get("JANRAKSHAK_PASSWORD")

        os.environ["JANRAKSHAK_USERNAME"] = "desih26"
        os.environ["JANRAKSHAK_PASSWORD"] = "Win@2026SIH!"

        try:
            response = authenticate(LoginRequest(username="desih26", password="Win@2026SIH!"))
            self.assertEqual(response.role, "admin")
            self.assertEqual(response.token, "demo-admin-token")
        finally:
            if original_username is None:
                os.environ.pop("JANRAKSHAK_USERNAME", None)
            else:
                os.environ["JANRAKSHAK_USERNAME"] = original_username

            if original_password is None:
                os.environ.pop("JANRAKSHAK_PASSWORD", None)
            else:
                os.environ["JANRAKSHAK_PASSWORD"] = original_password


if __name__ == "__main__":
    unittest.main()
