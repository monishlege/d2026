import { Languages, Mic, SendHorizonal } from "lucide-react";
import { useMemo, useState } from "react";

import { useAssistantStore } from "@/store/useAssistantStore";
import { detectLanguageFromText, getSiteText } from "@/lib/i18n";
import type { LanguageCode } from "@/types";

const languageOptions: Array<{ label: string; value: LanguageCode }> = [
  { label: "Hindi", value: "hi" },
  { label: "Kannada", value: "kn" },
  { label: "Tamil", value: "ta" },
  { label: "Telugu", value: "te" },
  { label: "Marathi", value: "mr" },
  { label: "Bengali", value: "bn" },
  { label: "English", value: "en" },
];

interface VoiceInteractionBarProps {
  onSubmit: (text: string) => Promise<void>;
}

export default function VoiceInteractionBar({ onSubmit }: VoiceInteractionBarProps) {
  const {
    selectedLanguage,
    setLanguage,
    transcript,
    setTranscript,
    siteLanguage,
    setSiteLanguage,
    quickPrompts,
    isProcessingVoice,
  } = useAssistantStore();
  const [mockListening, setMockListening] = useState(false);

  const visualBars = useMemo(
    () =>
      new Array(12).fill(0).map((_, index) => (
        <span
          key={index}
          className="wave-bar h-6 w-1 rounded-full bg-gradient-to-t from-cyan-300 via-cyan-200 to-orange-300"
          style={{ animationDelay: `${index * 0.08}s` }}
        />
      )),
    [],
  );

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[auto,1fr,auto] lg:items-center">
        <button
          type="button"
          onClick={() => setMockListening((value) => !value)}
          className={`group relative inline-flex h-20 w-20 items-center justify-center rounded-[26px] border transition duration-300 ${
            mockListening
              ? "border-cyan-300/70 bg-cyan-300/10 shadow-[0_0_40px_rgba(56,189,248,0.35)]"
              : "border-white/10 bg-white/5 hover:border-orange-300/40 hover:bg-white/10"
          }`}
          aria-label="Toggle mock microphone"
        >
          <div className="absolute inset-0 rounded-[26px] bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.26),transparent_65%)] opacity-80" />
          <Mic className="relative h-8 w-8 text-white transition group-hover:scale-110" />
        </button>

        <div className="rounded-[26px] border border-white/10 bg-slate-950/60 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-slate-400">
              <Languages className="h-4 w-4 text-cyan-200" />
              Regional dialect intake
            </div>
            <select
              value={selectedLanguage}
              onChange={(event) => setLanguage(event.target.value as LanguageCode)}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition hover:border-cyan-300/40"
              aria-label={getSiteText("voice.regionLabel", siteLanguage)}
            >
              {languageOptions.map((option) => (
                <option key={option.value} value={option.value} className="bg-slate-950">
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <textarea
            value={transcript}
            onChange={(event) => {
              setTranscript(event.target.value);
              setSiteLanguage(detectLanguageFromText(event.target.value));
            }}
            placeholder={getSiteText("voice.placeholder", siteLanguage)}
            className="h-28 w-full resize-none rounded-[20px] border border-white/10 bg-slate-900/80 p-4 text-sm text-slate-100 outline-none transition focus:border-cyan-300/50"
          />
        </div>

        <button
          type="button"
          onClick={async () => {
            const detected = detectLanguageFromText(transcript);
            setSiteLanguage(detected);
            await onSubmit(transcript);
          }}
          disabled={!transcript.trim() || isProcessingVoice}
          className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-orange-300/40 bg-orange-300/10 px-6 text-sm font-semibold text-orange-50 transition hover:-translate-y-0.5 hover:bg-orange-300/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <SendHorizonal className="h-4 w-4" />
          {isProcessingVoice ? getSiteText("voice.interpreting", siteLanguage) : getSiteText("voice.process", siteLanguage)}
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        {quickPrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => setTranscript(prompt)}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-200 transition hover:border-cyan-300/40 hover:bg-white/10"
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="flex min-h-16 items-end gap-1 rounded-[20px] border border-white/10 bg-slate-950/50 px-4 py-3">
        {mockListening || isProcessingVoice ? (
          visualBars
        ) : (
          <p className="text-sm text-slate-400">{getSiteText("voice.visualizer", siteLanguage)}</p>
        )}
      </div>
    </div>
  );
}
