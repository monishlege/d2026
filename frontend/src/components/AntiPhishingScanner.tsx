import { AlertTriangle, CheckCheck, GlobeLock, Radar } from "lucide-react";
import { useState } from "react";

import SectionShell from "@/components/SectionShell";
import { useAssistantStore } from "@/store/useAssistantStore";
import { getSiteText } from "@/lib/i18n";
import type { SecurityScanResponse } from "@/types";

const sampleLinks = [
  "https://pmkisan.gov.in",
  "http://pmkisan-guaranteed-benefit.gov.org/login",
  "https://beneficiary.nha.gov.in",
];

export default function AntiPhishingScanner() {
  const { siteLanguage } = useAssistantStore();
  const [url, setUrl] = useState(sampleLinks[1]);
  const [result, setResult] = useState<SecurityScanResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function analyzeUrl() {
    setIsLoading(true);
    const normalizedUrl = url.includes("://") ? url : `https://${url}`;
    let parsedUrl: URL | null = null;
    try {
      parsedUrl = new URL(normalizedUrl);
    } catch {
      setResult({
        url,
        safe: false,
        score: 0,
        indicators: ["This is not a valid website URL."],
        official_portal_match: false,
      });
      setIsLoading(false);
      return;
    }

    const hostname = parsedUrl.hostname.toLowerCase();
    const loweredUrl = normalizedUrl.toLowerCase();
    const indicators: string[] = [];
    let score = 100;

    if (parsedUrl.protocol !== "https:") {
      indicators.push("Missing SSL/HTTPS protection.");
      score -= 35;
    }
    if ((hostname.endsWith(".gov.org") || hostname.endsWith(".in.net") || hostname.includes(".gov.")) && !hostname.endsWith(".gov.in")) {
      indicators.push("Suspicious government-like domain extension detected.");
      score -= 25;
    }
    if (["guaranteed", "claim-now", "urgent", "free-money", "verify-account"].some((keyword) => loweredUrl.includes(keyword))) {
      indicators.push("Fraud-associated promotional keyword detected in the URL.");
      score -= 20;
    }
    if (hostname.split(".").length > 4 || (hostname.match(/-/g) ?? []).length >= 3) {
      indicators.push("Domain structure appears unusually noisy or spoof-like.");
      score -= 10;
    }

    const officialPortals = ["pmkisan.gov.in", "beneficiary.nha.gov.in", "digilocker.gov.in", "eshram.gov.in", "pmjay.gov.in"];
    const officialMatch = officialPortals.some((portal) => hostname === portal || hostname.endsWith(`.${portal}`));
    if (officialMatch) {
      indicators.push("Matches a known official government portal pattern.");
      score = Math.min(100, score + 10);
    }
    if (indicators.length === 0) indicators.push("No immediate phishing heuristics were triggered.");

    const response: SecurityScanResponse = {
      url,
      safe: score >= 70 && officialMatch,
      score: Math.max(0, Math.min(score, 100)),
      indicators,
      official_portal_match: officialMatch,
    };
    window.setTimeout(() => {
      setResult(response);
      setIsLoading(false);
    }, 350);
  }

  return (
    <SectionShell
      eyebrow={getSiteText("security.eyebrow", siteLanguage)}
      title={getSiteText("security.title", siteLanguage)}
      description={getSiteText("security.description", siteLanguage)}
    >
      <div className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
        <div className="rounded-[24px] border border-white/10 bg-slate-950/50 p-5">
          <label className="space-y-2 text-sm text-slate-300">
            <span>{getSiteText("security.urlLabel", siteLanguage)}</span>
            <input
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              className="w-full rounded-[20px] border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
              placeholder={getSiteText("security.placeholder", siteLanguage)}
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
            onClick={analyzeUrl}
            disabled={!url || isLoading}
            className="mt-5 inline-flex items-center gap-2 rounded-full border border-orange-300/30 bg-orange-300/10 px-5 py-3 text-sm font-semibold text-orange-50 transition hover:bg-orange-300/20 disabled:opacity-60"
          >
            <Radar className="h-4 w-4" />
            {isLoading ? getSiteText("security.scanning", siteLanguage) : getSiteText("security.analyze", siteLanguage)}
          </button>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-slate-950/60 p-5">
          {result ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{getSiteText("security.safetyScore", siteLanguage)}</p>
                    <p className="font-display text-5xl text-white">{result.score}</p>
                  </div>
                  <span
                    className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${
                      result.safe ? "bg-emerald-400/15 text-emerald-100" : "bg-rose-400/15 text-rose-100"
                    }`}
                  >
                    {result.safe ? getSiteText("security.official", siteLanguage) : getSiteText("security.unsafe", siteLanguage)}
                  </span>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-white/5">
                <div className="h-full rounded-full bg-gradient-to-r from-rose-400 via-orange-300 to-emerald-300" style={{ width: `${result.score}%` }} />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <SignalCard
                  icon={result.safe ? CheckCheck : AlertTriangle}
                  title={getSiteText("security.threats", siteLanguage)}
                  detail={result.indicators.join(" ")}
                />
                <SignalCard
                  icon={GlobeLock}
                  title={getSiteText("security.portalVerification", siteLanguage)}
                  detail={
                    result.official_portal_match
                      ? getSiteText("security.portalMatch", siteLanguage)
                      : getSiteText("security.portalNoMatch", siteLanguage)
                  }
                />
              </div>
            </div>
          ) : (
            <div className="rounded-[20px] border border-dashed border-white/10 bg-white/[0.03] p-5 text-sm leading-6 text-slate-400">
              {getSiteText("security.emptyState", siteLanguage)}
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
