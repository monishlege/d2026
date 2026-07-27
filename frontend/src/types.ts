export type LanguageCode = "hi" | "kn" | "ta" | "te" | "mr" | "bn" | "en";

export type IntentType =
  | "scheme_discovery"
  | "eligibility_check"
  | "document_fetch"
  | "security_scan"
  | "general_query";

export type ConfidenceLevel = "high" | "medium" | "low";

export interface SchemeSummary {
  name: string;
  description: string;
  benefit_summary: string;
}

export interface SpeechToTextResponse {
  original_language: string;
  normalized_text: string;
  detected_intent: IntentType;
  entities: Record<string, string>;
}

export interface ChatResponse {
  answer: string;
  confidence: ConfidenceLevel;
  references: string[];
}

export interface EligibilityRequest {
  scheme_name: string;
  annual_income: number;
  landholding_acres: number;
  has_secc_card: boolean;
  occupation_code: string;
  owns_pucca_house: boolean;
  is_street_vendor: boolean;
}

export interface EligibilityResponse {
  scheme_name: string;
  eligible: boolean;
  matched_rules: string[];
  failed_rules: string[];
  required_documents: string[];
  benefit_summary: string;
}

export interface DigiLockerDocument {
  type: string;
  issuer: string;
  verified: boolean;
  xml_record: string;
  extracted_fields: Record<string, string>;
}

export interface DigiLockerResponse {
  consent_granted: boolean;
  documents: DigiLockerDocument[];
}

export interface SecurityScanResponse {
  url: string;
  safe: boolean;
  score: number;
  indicators: string[];
  official_portal_match: boolean;
}
