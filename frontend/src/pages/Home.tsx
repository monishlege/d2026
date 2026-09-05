import { ArrowRight, AudioLines, Bell, Languages, LogOut, ShieldCheck, UserCircle2, Volume2 } from "lucide-react";
import { User } from "firebase/auth";
import { useCallback, useEffect, useMemo, useState } from "react";

import AntiPhishingScanner from "@/components/AntiPhishingScanner";
import DigiLockerSandbox from "@/components/DigiLockerSandbox";
import EligibilityWizard from "@/components/EligibilityWizard";
import LocationBasedSchemesFeed, { getLocatedSchemes } from "@/components/LocationBasedSchemesFeed";
import { useGeolocation } from "@/hooks/useGeolocation";
import SchemeHighlights from "@/components/SchemeHighlights";
import VoiceInputBar from "@/components/VoiceInputBar";
import { useAssistantStore } from "@/store/useAssistantStore";
import { askChat, fetchSchemes, submitSpeech } from "@/utils/api";
import { getSiteLanguageLabel, getSiteText } from "@/lib/i18n";
import type { LocatedScheme, SchemeSummary } from "@/types";

interface HomeProps {
  onLogout?: () => void;
  user?: User;
}

const PROTOTYPE_SCHEMES: SchemeSummary[] = [
  { name: "PM-KISAN", description: "Income support for eligible farmer families.", benefit_summary: "Rs. 6,000 per year in three installments." },
  { name: "Ayushman Bharat", description: "Cashless healthcare access for eligible families.", benefit_summary: "Health cover up to Rs. 5 lakh per family per year." },
  { name: "e-SHRAM", description: "Registration and welfare access for unorganized workers.", benefit_summary: "Unified worker identity and scheme visibility." },
  { name: "PM Awas Yojana", description: "Housing support for families without a pucca house.", benefit_summary: "Affordable housing assistance for eligible households." },
  { name: "PM Swanidhi", description: "Working capital support for street vendors.", benefit_summary: "Collateral-free working capital loan support." },
];

function readStoredAvatar(): string {
  if (typeof window === "undefined") return "";
  try {
    return typeof window.localStorage?.getItem === "function"
      ? window.localStorage.getItem("jansahayak.avatar.base64") ?? ""
      : "";
  } catch {
    return "";
  }
}

function buildOfflineFallbackResponse(query: string): NonNullable<ReturnType<typeof useAssistantStore.getState>['chatResult']> {
  const text = query.trim() || "scheme eligibility question";
  const lower = text.toLowerCase();

  let answer = "I can help check your scheme eligibility and guide you to the right official portal. Please verify the final information on the government website before submitting any personal details.";
  let voiceSummary = "I can help you check the right welfare scheme and the official portal to use.";
  let guidanceSteps = [
    "Step 1: Confirm the scheme name, income range, family size, and occupation details.",
    "Step 2: Check the official domain before sharing Aadhaar, bank, or income information.",
    "Step 3: Use your nearest CSC or official government portal to complete the application.",
  ];

  if (lower.includes("pm-kisan") || lower.includes("kisan")) {
    answer = "PM-KISAN is intended for eligible farmer families with annual income and landholding conditions. Please compare your details with the official PM-KISAN criteria before applying.";
    voiceSummary = "PM-KISAN is for eligible farmer families. Check income and landholding details before applying.";
    guidanceSteps = [
      "Step 1: Check whether you are a farmer family and confirm your annual income and landholding details.",
      "Step 2: Keep Aadhaar, bank account, and land records ready for verification.",
      "Step 3: Apply on the official PM-KISAN portal or through a nearby CSC.",
    ];
  } else if (lower.includes("ayushman") || lower.includes("health")) {
    answer = "Ayushman Bharat usually checks income and SECC-linked eligibility. Review your family details and use the official health portal to confirm coverage before applying.";
    voiceSummary = "Ayushman Bharat may help with health cover if your family meets the income and SECC eligibility checks.";
    guidanceSteps = [
      "Step 1: Check your SECC-linked eligibility and household income details.",
      "Step 2: Keep Aadhaar, ration card, and family details ready.",
      "Step 3: Verify the official Ayushman Bharat portal before submitting any information.",
    ];
  } else if (lower.includes("housing") || lower.includes("awas") || lower.includes("house")) {
    answer = "PM Awas Yojana is typically for households without a pucca house and with income or housing-related eligibility criteria. Review the latest official rules before applying.";
    voiceSummary = "PM Awas Yojana may help with housing support if your household meets the required housing and income criteria.";
    guidanceSteps = [
      "Step 1: Confirm whether your household owns a pucca house and your annual income bracket.",
      "Step 2: Keep Aadhaar, residence proof, and income documents ready.",
      "Step 3: Use the official PM Awas Yojana portal or a CSC for the final check.",
    ];
  } else if (lower.includes("document") || lower.includes("certificate") || lower.includes("digilocker")) {
    answer = "For document access, use DigiLocker or the official scheme portal, and only share verified records. Keep your Aadhaar and certificate details ready and check the official site before downloading anything.";
    voiceSummary = "Document access is easiest through DigiLocker and the official scheme portal with verified records.";
    guidanceSteps = [
      "Step 1: Confirm which certificate or document is required for the application.",
      "Step 2: Use DigiLocker or the official portal to fetch verified records.",
      "Step 3: Check the URL and keep personal details limited to trusted government sources.",
    ];
  }

  return {
    answer,
    confidence: "medium",
    references: ["Official government portal guidance", "Local CSC verification"],
    voice_summary: voiceSummary,
    guidance_steps: guidanceSteps,
    security_check: "Use only verified .gov.in or .nic.in services and confirm HTTPS before entering Aadhaar, bank, or income details.",
    offline_alert: "If the network is weak, visit the nearest CSC or official service center for the final verification.",
  };
}

export default function Home({ onLogout, user }: HomeProps) {
  const [schemes, setSchemes] = useState<SchemeSummary[]>([]);
  const [loadingSchemes, setLoadingSchemes] = useState(true);
  const [kioskMode, setKioskMode] = useState(false);
  const [selectedSchemeName, setSelectedSchemeName] = useState<string>("PM-KISAN");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [avatarSrc] = useState<string>(() => {
    return readStoredAvatar();
  });
  const geo = useGeolocation();
  const locationPrioritySchemes = useMemo(
    () => getLocatedSchemes(geo.location).slice(0, 4),
    [geo.location],
  );
  const {
    selectedLanguage,
    siteLanguage,
    chatResult,
    detectedIntent,
    transcript,
    startVoiceProcessing,
    finishVoiceProcessing,
  } = useAssistantStore();

  useEffect(() => {
    async function loadSchemes() {
      try {
        const response = await fetchSchemes();
        setSchemes(response.schemes);
      } catch {
        setSchemes(PROTOTYPE_SCHEMES);
      } finally {
        setLoadingSchemes(false);
      }
    }

    void loadSchemes();
  }, []);

  async function handleVoiceSubmit(text: string) {
    if (!text.trim()) {
      return;
    }

    startVoiceProcessing();
    try {
      const speech = await submitSpeech({ language: selectedLanguage, text });
      const chat = await askChat(speech.normalized_text, selectedLanguage);
      finishVoiceProcessing({
        transcript: speech.normalized_text,
        intent: speech.detected_intent,
        chatResult: chat,
      });
    } catch (error) {
      const fallback = buildOfflineFallbackResponse(text);
      finishVoiceProcessing({
        transcript: text,
        intent: "general_query",
        chatResult: {
          ...fallback,
          answer:
            error instanceof Error && error.message.toLowerCase().includes("backend")
              ? fallback.answer
              : error instanceof Error
                ? error.message
                : fallback.answer,
        },
      });
    }
  }

  async function handleEligibilityCheck(scheme: LocatedScheme) {
    setSelectedSchemeName(scheme.name);
    const wizard = document.getElementById("eligibility-wizard");
    if (wizard) {
      wizard.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    const prompt = `Check my eligibility for ${scheme.name} (${scheme.scope}) based on typical profile`;
    startVoiceProcessing();
    try {
      const speech = await submitSpeech({ language: selectedLanguage, text: prompt });
      const chat = await askChat(speech.normalized_text, selectedLanguage);
      finishVoiceProcessing({
        transcript: speech.normalized_text,
        intent: speech.detected_intent,
        chatResult: chat,
      });
    } catch (error) {
      const fallback = buildOfflineFallbackResponse(prompt);
      finishVoiceProcessing({
        transcript: prompt,
        intent: "eligibility_check",
        chatResult: {
          ...fallback,
          answer:
            error instanceof Error && error.message.toLowerCase().includes("backend")
              ? fallback.answer
              : error instanceof Error
                ? error.message
                : fallback.answer,
          references: [scheme.name, scheme.scope],
        },
      });
    }
  }

  function handleListenToResponse() {
    if (!chatResult || typeof window === "undefined") {
      return;
    }

    speakResponse(chatResult.voice_summary || chatResult.answer || transcript || "No response available.");
  }

  const speakResponse = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      return;
    }

    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = selectedLanguage === "hi" ? "hi-IN" : selectedLanguage === "kn" ? "kn-IN" : "en-IN";
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [selectedLanguage]);

  useEffect(() => {
    if (!chatResult) return;
    speakResponse(chatResult.voice_summary || chatResult.answer || transcript || "No response available.");
  }, [chatResult, transcript, speakResponse]);

  return (
    <main className="mx-auto flex min-h-screen max-w-[1440px] flex-col gap-8 px-4 py-6 md:px-8 md:py-8">
      {onLogout ? (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/5">
              {avatarSrc ? (
                <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
              ) : user?.photoURL ? (
                <img src={user.photoURL} alt="" className="h-full w-full object-cover" />
              ) : (
                <UserCircle2 className="h-6 w-6 text-slate-300" />
              )}
            </div>
            <div className="text-sm text-slate-300">
              <p className="mb-1 text-xs uppercase tracking-widest text-slate-400">Signed in as</p>
              <p className="font-medium text-white">{user?.displayName || user?.email || "Citizen"}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              aria-label={kioskMode ? "Kiosk mode enabled" : "Kiosk / Low-Data Mode"}
              onClick={() => setKioskMode((current) => !current)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${
                kioskMode
                  ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-50"
                  : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
              }`}
            >
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-current opacity-80" />
              {kioskMode ? "Kiosk mode enabled" : "Kiosk / Low-Data Mode"}
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end">
          <button
            type="button"
            aria-label={kioskMode ? "Kiosk mode enabled" : "Kiosk / Low-Data Mode"}
            onClick={() => setKioskMode((current) => !current)}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${
              kioskMode
                ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-50"
                : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
            }`}
          >
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-current opacity-80" />
            {kioskMode ? "Kiosk mode enabled" : "Kiosk / Low-Data Mode"}
          </button>
        </div>
      )}
      <section className="hero-panel overflow-hidden rounded-[36px] border border-white/10 px-6 py-8 md:px-10 md:py-12">
        <div className="grid gap-8 xl:grid-cols-[1.1fr,0.9fr] xl:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-3 rounded-full border border-orange-300/30 bg-orange-300/10 px-4 py-2 text-xs uppercase tracking-[0.25em] text-orange-50">
              <ShieldCheck className="h-4 w-4" />
              {getSiteText("home.trackLabel", siteLanguage)}
            </div>
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/70">{getSiteText("home.eyebrow", siteLanguage)}</p>
              <h1 className="font-display text-5xl leading-none text-white md:text-7xl">
                {getSiteText("home.heroTitle", siteLanguage)}
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
                {getSiteText("home.heroDescription", siteLanguage)}
              </p>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate-300">
                {getSiteText("home.siteLanguage", siteLanguage)}: {getSiteLanguageLabel(siteLanguage)}
              </div>
            </div>

            {kioskMode ? (
              <div className="rounded-[22px] border border-cyan-300/20 bg-cyan-300/5 p-4 text-sm text-cyan-50">
                <p className="font-semibold text-cyan-100">Low-data mode active</p>
                <p className="mt-2 leading-6 text-cyan-50/80">Text-first guidance is enabled for slower networks and public kiosk terminals.</p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-3">
                <FeatureChip icon={AudioLines} label={getSiteText("home.feature1.label", siteLanguage)} detail={getSiteText("home.feature1.detail", siteLanguage)} />
                <FeatureChip icon={Languages} label={getSiteText("home.feature2.label", siteLanguage)} detail={getSiteText("home.feature2.detail", siteLanguage)} />
                <FeatureChip icon={ShieldCheck} label={getSiteText("home.feature3.label", siteLanguage)} detail={getSiteText("home.feature3.detail", siteLanguage)} />
              </div>
            )}
          </div>

          <div className="rounded-[28px] border border-white/10 bg-slate-950/55 p-5 md:p-6">
            <VoiceInputBar onSubmit={handleVoiceSubmit} />
            <div className="mt-6 rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{getSiteText("home.responseChannel", siteLanguage)}</p>
                  <h2 className="mt-2 font-display text-3xl text-white">{getSiteText("home.guidanceOutcome", siteLanguage)}</h2>
                </div>
                {chatResult ? (
                  <button
                    type="button"
                    onClick={handleListenToResponse}
                    className="inline-flex items-center gap-2 rounded-full border border-orange-300/30 bg-orange-300/10 px-4 py-2 text-xs uppercase tracking-[0.22em] text-orange-50 transition hover:bg-orange-300/20"
                  >
                    <Volume2 className="h-4 w-4" />
                    {isSpeaking ? "Playing..." : "Play Response"}
                  </button>
                ) : null}
              </div>

              {chatResult ? (
                <div className="space-y-4">
                  <div className="rounded-[20px] border border-white/10 bg-slate-950/60 p-4">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-200/70">{getSiteText("home.transcriptLabel", siteLanguage)}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-100">{transcript}</p>
                  </div>
                  <div className="rounded-[20px] border border-white/10 bg-slate-950/60 p-4">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-200/70">{getSiteText("home.intentLabel", siteLanguage)}</p>
                    <div className="mt-3 inline-flex rounded-full bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.22em] text-slate-200">
                      {detectedIntent}
                    </div>
                    <p className="mt-4 text-sm leading-6 text-slate-100">{chatResult.answer}</p>
                    {chatResult.voice_summary ? (
                      <div className="mt-4 rounded-2xl border border-orange-300/20 bg-orange-300/10 p-4 text-sm leading-6 text-orange-50">
                        <span className="font-semibold">Voice summary: </span>{chatResult.voice_summary}
                      </div>
                    ) : null}
                    {chatResult.guidance_steps?.length ? (
                      <div className="mt-4 space-y-2 text-sm leading-6 text-slate-200">
                        {chatResult.guidance_steps.map((step) => <p key={step}>{step}</p>)}
                      </div>
                    ) : null}
                    {chatResult.security_check ? (
                      <p className="mt-4 flex gap-2 text-sm leading-6 text-emerald-200"><ShieldCheck className="mt-1 h-4 w-4 shrink-0" />{chatResult.security_check}</p>
                    ) : null}
                    {chatResult.offline_alert ? (
                      <p className="mt-4 flex gap-2 text-sm leading-6 text-cyan-100"><Bell className="mt-1 h-4 w-4 shrink-0" />{chatResult.offline_alert}</p>
                    ) : null}
                    {chatResult.grievance_tracking_id ? (
                      <p className="mt-4 text-sm font-semibold text-amber-200">Tracking ID: {chatResult.grievance_tracking_id}</p>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {chatResult.references.map((reference) => (
                        <span key={reference} className="rounded-full bg-cyan-300/10 px-3 py-2 text-xs text-cyan-100">
                          {reference}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-[20px] border border-dashed border-white/10 bg-white/[0.03] p-5 text-sm leading-6 text-slate-400">
                  {getSiteText("home.placeholder", siteLanguage)}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {!kioskMode ? (
        <section className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{getSiteText("home.prioritySchemes", siteLanguage)}</p>
              <h2 className="mt-2 font-display text-4xl text-white">{getSiteText("home.prioritySchemesTitle", siteLanguage)}</h2>
            </div>
            <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate-300 md:inline-flex">
              {getSiteText("home.exploreModules", siteLanguage)}
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>
          {loadingSchemes ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {new Array(4).fill(0).map((_, index) => (
                <div key={index} className="h-48 animate-pulse rounded-[24px] border border-white/10 bg-white/5" />
              ))}
            </div>
          ) : (
            <SchemeHighlights
              schemes={locationPrioritySchemes.map(({ name, description, benefit_summary }) => ({
                name,
                description,
                benefit_summary,
              }))}
            />
          )}
        </section>
      ) : (
        <div className="rounded-[24px] border border-dashed border-cyan-300/20 bg-cyan-300/5 p-5 text-sm leading-6 text-cyan-50">
          Kiosk mode active — displaying a text-only summary to reduce bandwidth and visual clutter.
        </div>
      )}

      <div id="eligibility-wizard">
        <EligibilityWizard schemes={schemes} selectedSchemeName={selectedSchemeName} />
      </div>
      <LocationBasedSchemesFeed geo={geo} onCheckEligibility={handleEligibilityCheck} />
      <DigiLockerSandbox />
      <AntiPhishingScanner />
    </main>
  );
}

function FeatureChip({
  icon: Icon,
  label,
  detail,
}: {
  icon: typeof AudioLines;
  label: string;
  detail: string;
}) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
      <Icon className="h-5 w-5 text-cyan-100" />
      <p className="mt-4 text-sm font-semibold text-white">{label}</p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{detail}</p>
    </div>
  );
}
