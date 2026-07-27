import { AlertTriangle, CheckCheck, GlobeLock, Radar } from "lucide-react";
import { useState } from "react";

import SectionShell from "@/components/SectionShell";
import { scanUrl } from "@/utils/api";
import type { SecurityScanResponse } from "@/types";

const sampleLinks = [
  "https://pmkisan.gov.in",
  "http://pmkisan-guaranteed-benefit.gov.org/login",
  "https://beneficiary.nha.gov.in",
];

export default function AntiPhishingScanner() {
  const [url, setUrl] = useState(sampleLinks[1]);
  const [result, setResult] = useState<SecurityScanResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function analyzeUrl() {
    setIsLoading(true);
    try {
      const response = await scanUrl(url);
      setResult(response);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SectionShell
      eyebrow="Security Dashboard"
      title="Anti-phishing scan for benefit and loan portals"
      description="Before a citizen shares data or clicks a scheme link, the scanner inspects trust signals, official domain patterns, and common spoofing tactics."
    >
      <div className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
        <div className="rounded-[24px] border border-white/10 bg-slate-950/50 p-5">
          <label className="space-y-2 text-sm text-slate-300">
            <span>Suspicious URL</span>
            <input
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              className="w-full rounded-[20px] border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
              placeholder="Paste a scheme or benefit portal URL"
            />
          </label>

          <div className="mt-4 flex flex-wrap gap-2">
            {sampleLinks.map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => setUrl(sample)}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-200 transition hover:border-cyan-300/40 hover:bg-white/10"
              >
                {sample}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void analyzeUrl()}
            disabled={!url || isLoading}
            className="mt-5 inline-flex items-center gap-2 rounded-full border border-orange-300/30 bg-orange-300/10 px-5 py-3 text-sm font-semibold text-orange-50 transition hover:bg-orange-300/20 disabled:opacity-60"
          >
            <Radar className="h-4 w-4" />
            {isLoading ? "Scanning..." : "Analyze URL"}
          </button>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-slate-950/60 p-5">
          {result ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Safety score</p>
                  <p className="font-display text-5xl text-white">{result.score}</p>
                </div>
                <span
                  className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${
                    result.safe ? "bg-emerald-400/15 text-emerald-100" : "bg-rose-400/15 text-rose-100"
                  }`}
                >
                  {result.safe ? "Likely official" : "Potentially unsafe"}
                </span>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-white/5">
                <div className="h-full rounded-full bg-gradient-to-r from-rose-400 via-orange-300 to-emerald-300" style={{ width: `${result.score}%` }} />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <SignalCard
                  icon={result.safe ? CheckCheck : AlertTriangle}
                  title="Threat indicators"
                  detail={result.indicators.join(" ")}
                />
                <SignalCard
                  icon={GlobeLock}
                  title="Official portal verification"
                  detail={
                    result.official_portal_match
                      ? "This hostname matches a known official portal pattern."
                      : "No match found in the trusted government portal list."
                  }
                />
              </div>
            </div>
          ) : (
            <div className="rounded-[20px] border border-dashed border-white/10 bg-white/[0.03] p-5 text-sm leading-6 text-slate-400">
              Run a scan to inspect SSL presence, suspicious keywords, spoofed domain patterns, and known official portal matches.
            </div>
          )}
        </div>
      </div>
    </SectionShell>
  );
}

function SignalCard({
  icon: Icon,
  title,
  detail,
}: {
  icon: typeof AlertTriangle;
  title: string;
  detail: string;
}) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-white/5 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-white">
        <Icon className="h-4 w-4 text-cyan-200" />
        {title}
      </p>
      <p className="mt-3 text-sm leading-6 text-slate-300">{detail}</p>
    </div>
  );
}
