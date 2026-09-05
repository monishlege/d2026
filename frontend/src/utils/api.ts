import type {
  ChatResponse,
  DigiLockerResponse,
  EligibilityRequest,
  EligibilityResponse,
  LanguageCode,
  SchemeSummary,
  SecurityScanResponse,
  SpeechToTextResponse,
} from "@/types";

const localHosts = new Set(["localhost", "127.0.0.1"]);
const configuredApiBase = import.meta.env.VITE_API_URL?.replace(/\/$/, "");
const productionApiBase = configuredApiBase || "https://decodesih2026.onrender.com";

function getApiCandidates(): string[] {
  const candidates = new Set<string>();
  const localBackend = "http://localhost:8000/api";
  const sameOrigin = typeof window !== "undefined" ? `${window.location.origin}/api` : "";
  const remoteBackend = `${productionApiBase}/api`;

  if (typeof window !== "undefined" && localHosts.has(window.location.hostname)) {
    candidates.add(localBackend);
  }

  if (sameOrigin) {
    candidates.add(sameOrigin);
  }

  if (remoteBackend) {
    candidates.add(remoteBackend);
  }

  if (!candidates.size) {
    candidates.add(localBackend);
  }

  return Array.from(candidates);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const requestOptions: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  };

  let lastError: unknown = null;

  for (const baseUrl of getApiCandidates()) {
    try {
      const response = await fetch(`${baseUrl}${path}`, requestOptions);

      if (!response.ok) {
        const message = await response.text();
        const errorText = message || `Request failed with status ${response.status}`;

        if (response.status >= 400 && response.status < 500 && response.status !== 404) {
          throw new Error(errorText);
        }

        lastError = new Error(errorText);
        continue;
      }

      return (await response.json()) as T;
    } catch (error) {
      lastError = error;
      continue;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Unable to contact backend services.");
}

export function login(payload: { username: string; password: string }): Promise<{ token: string; role: string }> {
  return request<{ token: string; role: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function fetchSchemes(): Promise<{ schemes: SchemeSummary[] }> {
  return request<{ schemes: SchemeSummary[] }>("/schemes");
}

export function submitSpeech(payload: {
  language: LanguageCode;
  text: string;
}): Promise<SpeechToTextResponse> {
  return request<SpeechToTextResponse>("/speech-to-text", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function askChat(query: string, language: LanguageCode): Promise<ChatResponse> {
  return request<ChatResponse>("/chat", {
    method: "POST",
    body: JSON.stringify({ query, language }),
  });
}

export function checkEligibility(payload: EligibilityRequest): Promise<EligibilityResponse> {
  return request<EligibilityResponse>("/check-eligibility", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchDigiLocker(payload: {
  consent_token: string;
  requested_documents: Array<"income_certificate" | "caste_certificate" | "aadhaar_metadata">;
}): Promise<DigiLockerResponse> {
  return request<DigiLockerResponse>("/digilocker/fetch", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function scanUrl(url: string): Promise<SecurityScanResponse> {
  return request<SecurityScanResponse>("/security/scan-url", {
    method: "POST",
    body: JSON.stringify({ url }),
  });
}
