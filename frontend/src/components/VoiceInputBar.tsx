import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Languages, Mic, SendHorizonal, Square, Sparkles } from "lucide-react";

import { useBhashiniSTT } from "@/hooks/useBhashiniSTT";
import { useAssistantStore } from "@/store/useAssistantStore";
import { detectLanguageFromText, getSiteText } from "@/lib/i18n";
import type { LanguageCode } from "@/types";

const languageOptions: Array<{ label: string; value: LanguageCode; native: string }> = [
  { label: "Hindi", native: "हिंदी", value: "hi" },
  { label: "Kannada", native: "ಕನ್ನಡ", value: "kn" },
  { label: "Tamil", native: "தமிழ்", value: "ta" },
  { label: "Telugu", native: "తెలుగు", value: "te" },
  { label: "Marathi", native: "मराठी", value: "mr" },
  { label: "Bengali", native: "বাংলা", value: "bn" },
  { label: "English", native: "English", value: "en" },
];

interface VoiceInputBarProps {
  onSubmit: (text: string) => Promise<void>;
}

const PROMPT_TEMPLATES: Record<LanguageCode, string[]> = {
  hi: [
    "मुझे PM-KISAN के लिए पात्रता की जाँच करके बताइए",
    "Ayushman Bharat मेरे परिवार के लिए लागू होता है या नहीं?",
    "आज के लिए मेरे राज्य की योजनाएँ दिखाइए",
  ],
  kn: [
    "ನನ್ನಿಗೆ PM-KISAN ಅರ್ಜೆಂತೆ ಇದೆಯೇ ಪರೀಕ್ಷಿಸಿ",
    "ನಮ್ಮ ಊರಿಗೆ ಅನ್ವಯಿಸುವ ರಾಜ್ಯ ಯೋಜನೆಗಳನ್ನು ತೋರಿಸಿ",
    "Ayushman Bharat ನನ್ನ ಕುಟುಂಬಕ್ಕೆ ಲಭ್ಯವೇ?",
  ],
  ta: [
    "எனக்கு PM-KISAN தகுதி இருக்கிறதா?",
    "என் மாநிலத்தின் சேவைகளைக் காண்பிக்கவும்",
    "என் குடும்பத்திற்கு ஆயுஷ்மான் பாரத் பொருந்துமா?",
  ],
  te: [
    "నాకు PM-KISAN అర్హత ఉందా?",
    "నా రాష్ట్ర పథకాలను చూపండి",
    "నా కుటుంబానికి ఆయుష్మాన్ భారత్ వర్తిస్తుందా?",
  ],
  mr: [
    "मला PM-KISAN पात्रता तपासून सांगा",
    "आमच्या राज्याच्या योजना दाखवा",
    "माझ्या कुटुंबासाठी आयुष्मान भारत लागू होते का?",
  ],
  bn: [
    "আমার PM-KISAN যোগ্যতা পরীক্ষা করুন",
    "আমার রাজ্যের প্রকল্পগুলো দেখান",
    "আমার পরিবারের জন্য আয়ুষ্মান ভারত প্রযোজ্য?",
  ],
  en: [
    "Check my eligibility for PM-KISAN if my income is 180000",
    "Show my state-level welfare schemes list",
    "Is Ayushman Bharat available for my family of 5?",
  ],
};

function providerBadge(provider: "bhashini" | "webkit" | "mock"): { label: string; style: string } {
  switch (provider) {
    case "bhashini":
      return { label: "Live · Bhashini AI4Bharat", style: "border-cyan-300/30 bg-cyan-300/10 text-cyan-100" };
    case "webkit":
      return { label: "Browser · SpeechRecognition", style: "border-fuchsia-300/30 bg-fuchsia-300/10 text-fuchsia-100" };
    default:
      return { label: "Demo · Mock transcription", style: "border-orange-300/30 bg-orange-300/10 text-orange-100" };
  }
}

export default function VoiceInputBar({ onSubmit }: VoiceInputBarProps) {
  const {
    selectedLanguage,
    setLanguage,
    transcript,
    setTranscript,
    siteLanguage,
    setSiteLanguage,
    isProcessingVoice,
  } = useAssistantStore();

  const stt = useBhashiniSTT(selectedLanguage);
  const [displayText, setDisplayText] = useState(transcript);
  const [elapsedMs, setElapsedMs] = useState(0);
  const startTsRef = useRef<number | null>(null);

  useEffect(() => {
    setDisplayText(transcript);
  }, [transcript]);

  useEffect(() => {
    stt.setLanguage(selectedLanguage);
  }, [selectedLanguage, stt]);

  useEffect(() => {
    if (!stt.isRecording) {
      startTsRef.current = null;
      setElapsedMs(0);
      return;
    }
    startTsRef.current = Date.now();
    const interval = setInterval(() => {
      if (startTsRef.current) {
        setElapsedMs(Date.now() - startTsRef.current);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [stt.isRecording]);

  const combinedLiveText = useMemo(() => {
    if (stt.interimTranscript) {
      return displayText ? `${displayText} ${stt.interimTranscript}` : stt.interimTranscript;
    }
    return displayText;
  }, [displayText, stt.interimTranscript]);

  useEffect(() => {
    if (stt.transcript && !displayText) {
      setDisplayText(stt.transcript);
      setTranscript(stt.transcript);
      setSiteLanguage(detectLanguageFromText(stt.transcript));
    }
  }, [stt.transcript, displayText, setTranscript, setSiteLanguage]);

  const handleMicClick = useCallback(async () => {
    if (stt.isRecording) {
      const finalText = await stt.stopRecording();
      if (finalText) {
        setDisplayText(finalText);
        setTranscript(finalText);
        setSiteLanguage(detectLanguageFromText(finalText));
      }
      return;
    }
    stt.resetTranscript();
    await stt.startRecording();
  }, [stt, setTranscript, setSiteLanguage]);

  const handleStopClick = useCallback(() => {
    stt.cancelRecording();
  }, [stt]);

  const badge = providerBadge(stt.provider);

  const visualBars = useMemo(
    () =>
      new Array(24).fill(0).map((_, index) => {
        const phase = (index / 24) * Math.PI * 2;
        const baseHeight = 0.25 + Math.sin(phase) * 0.15;
        return { baseHeight, delay: `${index * 0.05}s` };
      }),
    [],
  );

  const formattedDuration = useMemo(() => {
    const total = Math.floor(elapsedMs / 1000);
    const mm = String(Math.floor(total / 60)).padStart(2, "0");
    const ss = String(total % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }, [elapsedMs]);

  const prompts = PROMPT_TEMPLATES[selectedLanguage] ?? PROMPT_TEMPLATES.en;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[auto,1fr,auto] lg:items-start">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            {stt.isRecording ? (
              <div className="absolute -inset-3 animate-pulse rounded-[32px] bg-gradient-to-br from-cyan-400/40 via-fuchsia-400/30 to-orange-400/40 blur-xl" />
            ) : null}

            <div className="relative inline-flex flex-col items-center">
              <button
                type="button"
                onClick={handleMicClick}
                className={`group relative inline-flex h-24 w-24 items-center justify-center rounded-[28px] border transition duration-300 ${
                  stt.isRecording
                    ? "border-red-400/70 bg-red-500/20 shadow-[0_0_60px_rgba(244,63,94,0.4)]"
                    : "border-white/10 bg-white/5 hover:border-orange-300/40 hover:bg-white/10"
                }`}
                aria-label={stt.isRecording ? "Stop recording" : "Start voice recording"}
                disabled={stt.isTranscribing}
              >
                <div
                  className={`absolute inset-0 rounded-[28px] transition ${
                    stt.isRecording
                      ? "bg-[radial-gradient(circle_at_center,rgba(244,63,94,0.22),transparent_65%)]"
                      : "bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.26),transparent_65%)] opacity-80"
                  }`}
                />

                <div className="relative z-10 flex flex-col items-center">
                  {stt.isRecording ? (
                    <div className="flex items-center gap-1">
                      <span className="h-3 w-3 animate-pulse rounded-sm bg-red-400" />
                      <span className="h-3 w-3 animate-pulse rounded-sm bg-red-400" style={{ animationDelay: "0.15s" }} />
                    </div>
                  ) : (
                    <Mic className={`h-8 w-8 transition ${stt.isTranscribing ? "animate-spin text-cyan-100" : "text-white group-hover:scale-110"}`} />
                  )}
                  {stt.isTranscribing ? (
                    <Sparkles className="mt-2 h-3.5 w-3.5 text-cyan-200" />
                  ) : null}
                </div>
              </button>

              {stt.isRecording ? (
                <>
                  <div className="absolute -right-2 -top-2 inline-flex items-center gap-1 rounded-full bg-red-500/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white shadow-lg">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                    {formattedDuration}
                  </div>

                  <button
                    type="button"
                    onClick={handleStopClick}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-slate-300 transition hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-200"
                    aria-label="Cancel recording"
                  >
                    <Square className="h-3 w-3" />
                    Cancel
                  </button>
                </>
              ) : null}
            </div>
          </div>

          <span className={`rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] ${badge.style}`}>
            {badge.label}
          </span>
        </div>

        <div className="rounded-[26px] border border-white/10 bg-slate-950/60 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-slate-400">
              <Languages className="h-4 w-4 text-cyan-200" />
              Regional dialect intake
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedLanguage}
                onChange={(event) => setLanguage(event.target.value as LanguageCode)}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition hover:border-cyan-300/40"
                aria-label={getSiteText("voice.regionLabel", siteLanguage)}
              >
                {languageOptions.map((option) => (
                  <option key={option.value} value={option.value} className="bg-slate-950">
                    {option.label} · {option.native}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <textarea
            value={combinedLiveText}
            onChange={(event) => {
              const value = event.target.value;
              setDisplayText(value);
              setTranscript(value);
              setSiteLanguage(detectLanguageFromText(value));
            }}
            placeholder={getSiteText("voice.placeholder", siteLanguage)}
            className="h-36 w-full resize-none rounded-[20px] border border-white/10 bg-slate-900/80 p-4 text-base leading-7 text-slate-100 outline-none transition focus:border-cyan-300/50"
            spellCheck={false}
            style={{ fontSize: "16px" }}
          />

          {stt.error ? (
            <div className="mt-3 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-xs leading-5 text-red-200">
              {stt.error}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 lg:items-end">
          <button
            type="button"
            onClick={async () => {
              const value = combinedLiveText || transcript;
              if (!value.trim() || isProcessingVoice) return;
              const detected = detectLanguageFromText(value);
              setSiteLanguage(detected);
              await onSubmit(value);
            }}
            disabled={!combinedLiveText.trim() && !transcript.trim() && !stt.interimTranscript || isProcessingVoice || stt.isRecording}
            className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-orange-300/40 bg-orange-300/10 px-6 text-sm font-semibold text-orange-50 transition hover:-translate-y-0.5 hover:bg-orange-300/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <SendHorizonal className="h-4 w-4" />
            {stt.isTranscribing
              ? "Transcribing…"
              : isProcessingVoice
                ? getSiteText("voice.interpreting", siteLanguage)
                : getSiteText("voice.process", siteLanguage)}
          </button>

          <div className="flex min-h-[72px] w-full items-end justify-center gap-[3px] rounded-[20px] border border-white/10 bg-slate-950/50 px-3 py-3">
            {stt.isRecording || stt.isTranscribing || isProcessingVoice ? (
              visualBars.map(({ baseHeight, delay }, index) => {
                const audioBoost = 0.5 + stt.audioLevel * 1.6;
                const heightPct = Math.min(
                  100,
                  Math.max(12, baseHeight * 100 * audioBoost + Math.sin(index / 3 + Date.now() / 250) * 12),
                );
                return (
                  <span
                    key={index}
                    className="h-full w-1 rounded-full bg-gradient-to-t from-cyan-400 via-cyan-300 to-orange-300"
                    style={{
                      width: "6px",
                      height: `${heightPct}%`,
                      animationDelay: delay,
                    }}
                  />
                );
              })
            ) : (
              <p className="px-2 text-center text-xs leading-6 text-slate-400">
                {getSiteText("voice.visualizer", siteLanguage)}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {prompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => {
              setDisplayText(prompt);
              setTranscript(prompt);
              setSiteLanguage(detectLanguageFromText(prompt));
            }}
            disabled={stt.isRecording || isProcessingVoice}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs leading-6 text-slate-200 transition hover:border-cyan-300/40 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
