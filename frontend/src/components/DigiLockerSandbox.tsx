import { BadgeCheck, DatabaseZap, FileDigit, ShieldCheck } from "lucide-react";
import { useState } from "react";

import SectionShell from "@/components/SectionShell";
import { useAssistantStore } from "@/store/useAssistantStore";
import { getSiteText } from "@/lib/i18n";
import { fetchDigiLocker } from "@/utils/api";
import type { DigiLockerDocument } from "@/types";

const documentOptions = [
  { label: "Income Certificate", value: "income_certificate" },
  { label: "Caste Certificate", value: "caste_certificate" },
  { label: "Aadhaar Metadata", value: "aadhaar_metadata" },
] as const;

export default function DigiLockerSandbox() {
  const { siteLanguage } = useAssistantStore();
  const [selectedDocs, setSelectedDocs] = useState<Array<(typeof documentOptions)[number]["value"]>>([
    "income_certificate",
    "aadhaar_metadata",
  ]);
  const [documents, setDocuments] = useState<DigiLockerDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [consentGranted, setConsentGranted] = useState(false);

  async function retrieveDocuments() {
    setIsLoading(true);
    try {
      const response = await fetchDigiLocker({
        consent_token: "janrakshak-consent-ok",
        requested_documents: selectedDocs,
      });
      setDocuments(response.documents);
      setConsentGranted(response.consent_granted);
    } finally {
      setIsLoading(false);
    }
  }

  function toggleDocument(value: (typeof documentOptions)[number]["value"]) {
    setSelectedDocs((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  }

  return (
    <SectionShell
      eyebrow={getSiteText("digilocker.eyebrow", siteLanguage)}
      title={getSiteText("digilocker.title", siteLanguage)}
      description={getSiteText("digilocker.description", siteLanguage)}
    >
      <div className="grid gap-6 xl:grid-cols-[0.8fr,1.2fr]">
        <div className="rounded-[24px] border border-white/10 bg-slate-950/50 p-5">
          <div className="space-y-3">
            {documentOptions.map((option) => (
              <label
                key={option.value}
                className="flex items-center justify-between rounded-[20px] border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-200"
              >
                <span>{option.label}</span>
                <input
                  type="checkbox"
                  checked={selectedDocs.includes(option.value)}
                  onChange={() => toggleDocument(option.value)}
                  className="h-4 w-4 accent-cyan-300"
                />
              </label>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void retrieveDocuments()}
            disabled={selectedDocs.length === 0 || isLoading}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-5 py-3 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/20 disabled:opacity-50"
          >
            <DatabaseZap className="h-4 w-4" />
            {isLoading ? getSiteText("digilocker.fetching", siteLanguage) : getSiteText("digilocker.fetch", siteLanguage)}
          </button>

          <div className="mt-5 rounded-[20px] border border-emerald-400/20 bg-emerald-400/5 p-4 text-sm leading-6 text-emerald-50">
            <p className="flex items-center gap-2 font-semibold">
              <ShieldCheck className="h-4 w-4" />
              {getSiteText("digilocker.consent", siteLanguage)}
            </p>
            <p className="mt-2 text-emerald-50/80">{getSiteText("digilocker.consentText", siteLanguage)}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[24px] border border-white/10 bg-slate-950/60 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-2xl text-white">{getSiteText("digilocker.cardsTitle", siteLanguage)}</h3>
              {consentGranted ? (
                <span className="rounded-full bg-emerald-400/15 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">
                  {getSiteText("digilocker.consentGranted", siteLanguage)}
                </span>
              ) : null}
            </div>

            {documents.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {documents.map((document) => (
                  <div key={document.type} className="rounded-[20px] border border-white/10 bg-white/5 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">{prettyLabel(document.type)}</p>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{document.issuer}</p>
                      </div>
                      <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/15 px-3 py-2 text-xs text-emerald-100">
                        <BadgeCheck className="h-4 w-4" />
                        Verified
                      </span>
                    </div>
                    <pre className="rounded-2xl bg-slate-950/70 p-3 text-xs text-cyan-100">{document.xml_record}</pre>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[20px] border border-dashed border-white/10 bg-white/[0.03] p-5 text-sm text-slate-400">
                {getSiteText("digilocker.emptyState", siteLanguage)}
              </div>
            )}
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
            <p className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
              <FileDigit className="h-4 w-4 text-orange-200" />
              {getSiteText("digilocker.prefillTitle", siteLanguage)}
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {documents.flatMap((document) =>
                Object.entries(document.extracted_fields).map(([key, value]) => (
                  <div key={`${document.type}-${key}`} className="rounded-[18px] border border-white/10 bg-slate-950/60 p-4">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">{key.replace(/_/g, " ")}</p>
                    <p className="mt-2 text-sm text-slate-100">{value}</p>
                  </div>
                )),
              )}
            </div>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

function prettyLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
