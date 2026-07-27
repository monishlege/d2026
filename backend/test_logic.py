import unittest

from main import (
    ChatRequest,
    EligibilityRequest,
    SecurityScanRequest,
    SpeechRequest,
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


if __name__ == "__main__":
    unittest.main()
