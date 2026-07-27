SCHEMES = {
    "PM-KISAN": {
        "code": "pm_kisan",
        "name": "PM-KISAN",
        "benefit_summary": "Income support of Rs. 6,000 per year for eligible farmer families in three installments.",
        "eligibility_rules": {
            "max_income": 200000,
            "max_landholding_acres": 5,
            "requires_farmer": True,
        },
        "required_documents": [
            "Aadhaar Card",
            "Income Certificate",
            "Land Record",
            "Bank Account Passbook",
        ],
        "description": "Direct income support for small and marginal farming households.",
    },
    "Ayushman Bharat": {
        "code": "ayushman_bharat",
        "name": "Ayushman Bharat",
        "benefit_summary": "Health insurance cover up to Rs. 5 lakh per family per year for secondary and tertiary care.",
        "eligibility_rules": {
            "max_income": 250000,
            "requires_secc": True,
        },
        "required_documents": [
            "Aadhaar Card",
            "Ration Card",
            "SECC Verification",
            "Income Certificate",
        ],
        "description": "Cashless healthcare access for economically vulnerable households.",
    },
    "e-SHRAM": {
        "code": "e_shram",
        "name": "e-SHRAM",
        "benefit_summary": "National database registration for unorganized workers with access to welfare support.",
        "eligibility_rules": {
            "occupation_codes": ["UNORG", "LABOUR", "MIGRANT", "GIG"],
        },
        "required_documents": [
            "Aadhaar Card",
            "Mobile Number",
            "Bank Account Details",
            "Occupation Proof",
        ],
        "description": "Unified identity and access path for workers in the unorganized sector.",
    },
    "PM Awas Yojana": {
        "code": "pm_awas_yojana",
        "name": "PM Awas Yojana",
        "benefit_summary": "Housing assistance for eligible low-income households without permanent housing.",
        "eligibility_rules": {
            "requires_no_pucca_house": True,
            "requires_secc": True,
        },
        "required_documents": [
            "Aadhaar Card",
            "Income Certificate",
            "Residence Proof",
            "Housing Status Declaration",
        ],
        "description": "Affordable housing support for families lacking adequate housing.",
    },
    "PM Swanidhi": {
        "code": "pm_swanidhi",
        "name": "PM Swanidhi",
        "benefit_summary": "Working capital loan support for street vendors with interest subsidy and digital incentives.",
        "eligibility_rules": {
            "requires_street_vendor": True,
            "occupation_codes": ["VENDOR", "HAWKER", "STALL"],
        },
        "required_documents": [
            "Aadhaar Card",
            "Vendor ID or Letter of Recommendation",
            "Bank Account Details",
            "Mobile Number",
        ],
        "description": "Credit access for street vendors to restart and sustain livelihoods.",
    },
}

LANGUAGE_MAP = {
    "hi": "Hindi",
    "kn": "Kannada",
    "ta": "Tamil",
    "te": "Telugu",
    "mr": "Marathi",
    "bn": "Bengali",
    "en": "English",
}

INTENT_KEYWORDS = {
    "eligibility_check": ["eligible", "eligibility", "apply", "can i get", "qualify"],
    "document_fetch": ["document", "digilocker", "certificate", "aadhaar", "income proof"],
    "security_scan": ["fake", "fraud", "phishing", "link", "url", "website"],
    "scheme_discovery": ["scheme", "benefit", "yojana", "farmer", "health", "housing"],
}

KNOWN_FRAUD_KEYWORDS = [
    "lottery",
    "instant-approval",
    "guaranteed-benefit",
    "claim-now",
    "free-money",
    "kyc-update",
]

OFFICIAL_PORTALS = [
    "pmkisan.gov.in",
    "beneficiary.nha.gov.in",
    "eshram.gov.in",
    "pmaymis.gov.in",
    "pmsvanidhi.mohua.gov.in",
    "digilocker.gov.in",
]

DIGILOCKER_RECORDS = {
    "income_certificate": {
        "issuer": "State Revenue Department",
        "xml_record": "<IncomeCertificate><Name>Ravi Kumar</Name><AnnualIncome>185000</AnnualIncome><Verified>true</Verified></IncomeCertificate>",
        "extracted_fields": {
            "name": "Ravi Kumar",
            "annual_income": "185000",
            "verified": "true",
        },
    },
    "caste_certificate": {
        "issuer": "District Magistrate Office",
        "xml_record": "<CasteCertificate><Name>Ravi Kumar</Name><Category>OBC</Category><Verified>true</Verified></CasteCertificate>",
        "extracted_fields": {
            "name": "Ravi Kumar",
            "category": "OBC",
            "verified": "true",
        },
    },
    "aadhaar_metadata": {
        "issuer": "UIDAI",
        "xml_record": "<AadhaarMetadata><Name>Ravi Kumar</Name><MaskedNumber>XXXX-XXXX-1947</MaskedNumber><Verified>true</Verified></AadhaarMetadata>",
        "extracted_fields": {
            "name": "Ravi Kumar",
            "masked_number": "XXXX-XXXX-1947",
            "verified": "true",
        },
    },
}

KNOWLEDGE_BASE = [
    {
        "title": "PM-KISAN overview",
        "content": "PM-KISAN supports eligible farmer families with annual financial assistance of Rs. 6,000, usually split across three installments.",
        "scheme": "PM-KISAN",
    },
    {
        "title": "Ayushman Bharat coverage",
        "content": "Ayushman Bharat provides health coverage of up to Rs. 5 lakh for eligible families and commonly uses SECC-linked eligibility indicators.",
        "scheme": "Ayushman Bharat",
    },
    {
        "title": "e-SHRAM registration",
        "content": "e-SHRAM is meant for workers in the unorganized sector and helps them register for social security support and scheme visibility.",
        "scheme": "e-SHRAM",
    },
    {
        "title": "PM Awas Yojana housing support",
        "content": "PM Awas Yojana focuses on households without pucca housing and typically checks housing status and deprivation-related criteria.",
        "scheme": "PM Awas Yojana",
    },
    {
        "title": "PM Swanidhi vendor credit",
        "content": "PM Swanidhi provides collateral-free working capital support to street vendors and rewards timely repayment and digital transactions.",
        "scheme": "PM Swanidhi",
    },
]
