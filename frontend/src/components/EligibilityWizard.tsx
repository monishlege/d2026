import { CheckCircle2, ChevronRight, ShieldAlert, XCircle } from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";

import SectionShell from "@/components/SectionShell";
import { useAssistantStore } from "@/store/useAssistantStore";
import { getSiteText } from "@/lib/i18n";
import type { EligibilityRequest, EligibilityResponse, SchemeSummary } from "@/types";

const initialForm: EligibilityRequest = {
  scheme_name: "PM-KISAN",
  annual_income: 180000,
  landholding_acres: 2,
  has_secc_card: true,
  occupation_code: "UNORG",
  owns_pucca_house: false,
  is_street_vendor: false,
};

const PROTOTYPE_RULES: Record<string, {
  maxIncome?: number;
  maxLandholding?: number;
  requiresFarmer?: boolean;
  requiresSecc?: boolean;
  requiresNoHouse?: boolean;
  occupations?: string[];
  requiresVendor?: boolean;
  documents: string[];
}> = {
  "PM-KISAN": {
    maxIncome: 200000,
    maxLandholding: 5,
    requiresFarmer: true,
    documents: ["Aadhaar Card", "Income Certificate", "Land Record", "Bank Account Passbook"],
  },
  "Ayushman Bharat": {
    maxIncome: 250000,
    requiresSecc: true,
    documents: ["Aadhaar Card", "Ration Card", "SECC Verification", "Income Certificate"],
  },
  "e-SHRAM": {
    occupations: ["UNORG", "LABOUR", "MIGRANT", "GIG"],
    documents: ["Aadhaar Card", "Mobile Number", "Bank Account Details", "Occupation Proof"],
  },
  "PM Awas Yojana": {
    requiresNoHouse: true,
    requiresSecc: true,
    documents: ["Aadhaar Card", "Income Certificate", "Residence Proof", "Housing Status Declaration"],
  },
  "PM Swanidhi": {
    occupations: ["VENDOR", "HAWKER", "STALL"],
    requiresVendor: true,
    documents: ["Aadhaar Card", "Vendor ID or Letter of Recommendation", "Bank Account Details", "Mobile Number"],
  },
};

interface EligibilityWizardProps {
  schemes: SchemeSummary[];
  selectedSchemeName?: string;
}

export default function EligibilityWizard({ schemes, selectedSchemeName }: EligibilityWizardProps) {
  const { siteLanguage } = useAssistantStore();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<EligibilityRequest>(initialForm);
  const [result, setResult] = useState<EligibilityResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const yesLabel = getSiteText("eligibility.toggleYes", siteLanguage);
  const noLabel = getSiteText("eligibility.toggleNo", siteLanguage);
  const stepTitles = [
    getSiteText("eligibility.step1", siteLanguage),
    getSiteText("eligibility.step2", siteLanguage),
    getSiteText("eligibility.step3", siteLanguage),
  ];

  useEffect(() => {
    if (!selectedSchemeName || selectedSchemeName === form.scheme_name) return;
    setForm((current) => ({ ...current, scheme_name: selectedSchemeName }));
  }, [selectedSchemeName, form.scheme_name]);

  const selectedScheme = useMemo(
    () => schemes.find((scheme) => scheme.name === form.scheme_name),
    [form.scheme_name, schemes],
  );

  const currentRules = PROTOTYPE_RULES[form.scheme_name];
  const logicPath = useMemo(() => {
    const entries: Array<{ label: string; passed: boolean }> = [];

    if (currentRules?.maxIncome !== undefined) {
      entries.push({
        label: `Income ≤ ₹${currentRules.maxIncome.toLocaleString("en-IN")}`,
        passed: form.annual_income <= currentRules.maxIncome,
      });
    }
    if (currentRules?.maxLandholding !== undefined) {
      entries.push({
        label: `Landholding ≤ ${currentRules.maxLandholding} acres`,
        passed: form.landholding_acres <= currentRules.maxLandholding,
      });
    }
    if (currentRules?.requiresFarmer) {
      entries.push({
        label: "Farming landholding present",
        passed: form.landholding_acres > 0,
      });
    }
    if (currentRules?.requiresSecc) {
      entries.push({
        label: "SECC proof available",
        passed: form.has_secc_card,
      });
    }
    if (currentRules?.requiresNoHouse) {
      entries.push({
        label: "No pucca house",
        passed: !form.owns_pucca_house,
      });
    }
    if (currentRules?.occupations) {
      entries.push({
        label: `Occupation ∈ ${currentRules.occupations.join(", ")}`,
        passed: currentRules.occupations.includes(form.occupation_code.toUpperCase()),
      });
    }
    if (currentRules?.requiresVendor) {
      entries.push({
        label: "Street vendor identity",
        passed: form.is_street_vendor,
      });
    }

    return entries;
  }, [currentRules, form]);

  function handleEscalateToCsc() {
    if (!result || typeof window === "undefined") {
      return;
    }

    const summary = [
      "Gram Panchayat CSC Escalation Ticket",
      "===============================",
      `Scheme: ${result.scheme_name}`,
      `Status: ${result.eligible ? "Eligible" : "Needs manual review"}`,
      "",
      "Decision trace:",
      ...result.matched_rules.map((rule) => `- ${rule}`),
      ...result.failed_rules.map((rule) => `- ${rule}`),
      "",
      "Required documents:",
      ...result.required_documents.map((document) => `- ${document}`),
      "",
      `Benefit summary: ${result.benefit_summary}`,
    ].join("\n");

    const printWindow = window.open("", "_blank", "width=720,height=900");
    if (printWindow) {
      printWindow.document.write(`<!doctype html><html><head><title>CSC Escalation Ticket</title></head><body style="font-family:Arial,sans-serif;padding:32px;line-height:1.6;white-space:pre-wrap;">${summary.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</body></html>`);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      return;
    }

    const blob = new Blob([summary], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `gram-panchayat-csc-${result.scheme_name.toLowerCase().replace(/\s+/g, "-")}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function evaluate() {
    setIsLoading(true);
    const scheme = schemes.find((item) => item.name === form.scheme_name);
    const rules = PROTOTYPE_RULES[form.scheme_name];
    const matchedRules: string[] = [];
    const failedRules: string[] = [];

    if (rules?.maxIncome !== undefined) {
      (form.annual_income < rules.maxIncome ? matchedRules : failedRules).push(
        form.annual_income < rules.maxIncome
          ? `Annual income is below Rs. ${rules.maxIncome.toLocaleString("en-IN")}.`
          : `Annual income must be below Rs. ${rules.maxIncome.toLocaleString("en-IN")}.`,
      );
    }
    if (rules?.maxLandholding !== undefined) {
      (form.landholding_acres <= rules.maxLandholding ? matchedRules : failedRules).push(
        form.landholding_acres <= rules.maxLandholding
          ? `Landholding is within ${rules.maxLandholding} acres.`
          : `Landholding must not exceed ${rules.maxLandholding} acres.`,
      );
    }
    if (rules?.requiresFarmer) {
      (form.landholding_acres > 0 ? matchedRules : failedRules).push(
        form.landholding_acres > 0 ? "Applicant indicates active landholding for farming." : "Applicant must have farming landholding.",
      );
    }
    if (rules?.requiresSecc) {
      (form.has_secc_card ? matchedRules : failedRules).push(
        form.has_secc_card ? "SECC-linked eligibility proof is available." : "SECC-linked eligibility proof is required.",
      );
    }
    if (rules?.requiresNoHouse) {
      (!form.owns_pucca_house ? matchedRules : failedRules).push(
        !form.owns_pucca_house ? "Applicant does not own a pucca house." : "Applicant must not own a pucca house.",
      );
    }
    if (rules?.occupations) {
      const matchesOccupation = rules.occupations.includes(form.occupation_code.toUpperCase());
      (matchesOccupation ? matchedRules : failedRules).push(
        matchesOccupation
          ? "Occupation code matches scheme criteria."
          : `Occupation code must be one of: ${rules.occupations.join(", ")}.`,
      );
    }
    if (rules?.requiresVendor) {
      (form.is_street_vendor ? matchedRules : failedRules).push(
        form.is_street_vendor ? "Applicant is identified as a street vendor." : "Applicant must be a street vendor.",
      );
    }

    setResult({
      scheme_name: form.scheme_name,
      eligible: failedRules.length === 0,
      matched_rules: matchedRules,
      failed_rules: failedRules,
      required_documents: rules?.documents ?? [],
      benefit_summary: scheme?.benefit_summary ?? "Prototype scheme details unavailable.",
    });
    window.setTimeout(() => {
      setIsLoading(false);
    }, 350);
  }

  function updateForm<Key extends keyof EligibilityRequest>(key: Key, value: EligibilityRequest[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <SectionShell
      eyebrow={getSiteText("eligibility.eyebrow", siteLanguage)}
      title={getSiteText("eligibility.title", siteLanguage)}
      description={getSiteText("eligibility.description", siteLanguage)}
    >
      <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
        <div className="space-y-5 rounded-[24px] border border-white/10 bg-slate-950/50 p-5">
          <div className="flex flex-wrap gap-3">
            {stepTitles.map((title, index) => (
              <button
                key={title}
                type="button"
                onClick={() => setStep(index)}
                className={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.24em] transition ${
                  index === step
                    ? "bg-cyan-300/15 text-cyan-100"
                    : "bg-white/5 text-slate-400 hover:bg-white/10"
                }`}
              >
                {title}
              </button>
            ))}
          </div>

          {step === 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm text-slate-300">
                <span>{getSiteText("eligibility.scheme", siteLanguage)}</span>
                <select
                  value={form.scheme_name}
                  onChange={(event) => updateForm("scheme_name", event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
                >
                  {schemes.map((scheme) => (
                    <option key={scheme.name} value={scheme.name} className="bg-slate-950">
                      {scheme.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm text-slate-300">
                <span>{getSiteText("eligibility.income", siteLanguage)}</span>
                <input
                  type="number"
                  value={form.annual_income}
                  onChange={(event) => updateForm("annual_income", Number(event.target.value))}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
                />
              </label>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm text-slate-300">
                <span>{getSiteText("eligibility.landholding", siteLanguage)}</span>
                <input
                  type="number"
                  value={form.landholding_acres}
                  onChange={(event) => updateForm("landholding_acres", Number(event.target.value))}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
                />
              </label>
              <label className="space-y-2 text-sm text-slate-300">
                <span>{getSiteText("eligibility.occupation", siteLanguage)}</span>
                <input
                  type="text"
                  value={form.occupation_code}
                  onChange={(event) => updateForm("occupation_code", event.target.value.toUpperCase())}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
                />
              </label>
              <ToggleRow
                label={getSiteText("eligibility.secc", siteLanguage)}
                checked={form.has_secc_card}
                onChange={(value) => updateForm("has_secc_card", value)}
                yesLabel={yesLabel}
                noLabel={noLabel}
              />
              <ToggleRow
                label={getSiteText("eligibility.streetVendor", siteLanguage)}
                checked={form.is_street_vendor}
                onChange={(value) => updateForm("is_street_vendor", value)}
                yesLabel={yesLabel}
                noLabel={noLabel}
              />
            </div>
          ) : null}

          {step === 2 ? (
            <div className="grid gap-4 md:grid-cols-2">
              <ToggleRow
                label={getSiteText("eligibility.house", siteLanguage)}
                checked={form.owns_pucca_house}
                onChange={(value) => updateForm("owns_pucca_house", value)}
                yesLabel={yesLabel}
                noLabel={noLabel}
              />
              <div className="rounded-[20px] border border-orange-300/20 bg-orange-300/5 p-4 text-sm text-orange-50">
                <p className="font-semibold">{getSiteText("eligibility.note", siteLanguage)}</p>
                <p className="mt-2 leading-6 text-orange-50/80">
                  {selectedScheme?.benefit_summary ?? getSiteText("eligibility.noteDefault", siteLanguage)}
                </p>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setStep((current) => Math.max(0, current - 1))}
              className="rounded-full border border-white/10 px-5 py-3 text-sm text-slate-200 transition hover:bg-white/5"
            >
              {getSiteText("eligibility.back", siteLanguage)}
            </button>
            <button
              type="button"
              onClick={() => {
                if (step < stepTitles.length - 1) {
                  setStep((current) => current + 1);
                  return;
                }
                void evaluate();
              }}
              className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-5 py-3 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/20"
            >
              {step < stepTitles.length - 1 ? getSiteText("eligibility.next", siteLanguage) : isLoading ? getSiteText("eligibility.evaluating", siteLanguage) : getSiteText("eligibility.evaluate", siteLanguage)}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-slate-950/60 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-2xl text-white">{getSiteText("eligibility.trace", siteLanguage)}</h3>
            {result ? (
              <span
                className={`rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${
                  result.eligible ? "bg-emerald-400/15 text-emerald-100" : "bg-rose-400/15 text-rose-100"
                }`}
              >
                {result.eligible ? getSiteText("eligibility.eligible", siteLanguage) : getSiteText("eligibility.attention", siteLanguage)}
              </span>
            ) : null}
          </div>

          {result ? (
            <div className="space-y-5">
              <p className="text-sm leading-6 text-slate-300">{result.benefit_summary}</p>
              <div className="rounded-[20px] border border-cyan-300/20 bg-cyan-300/5 p-4">
                <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-100">Logical flow</p>
                <div className="flex flex-wrap items-center gap-2">
                  {logicPath.length > 0 ? (
                    logicPath.map((step, index) => (
                      <Fragment key={`${step.label}-${index}`}>
                        <span className={`rounded-full border px-3 py-2 text-xs ${step.passed ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100" : "border-rose-400/20 bg-rose-400/10 text-rose-100"}`}>
                          [{step.label}: {step.passed ? "✅" : "❌"}]
                        </span>
                        {index < logicPath.length - 1 ? <ChevronRight className="h-4 w-4 text-slate-300" /> : null}
                      </Fragment>
                    ))
                  ) : (
                    <span className="text-sm text-slate-400">No logic path available.</span>
                  )}
                </div>
              </div>
              <RuleList title={getSiteText("eligibility.matched", siteLanguage)} icon={CheckCircle2} items={result.matched_rules} tone="success" />
              <RuleList title={getSiteText("eligibility.failed", siteLanguage)} icon={XCircle} items={result.failed_rules} tone="danger" />
              <div className="rounded-[20px] border border-white/10 bg-white/5 p-4">
                <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                  <ShieldAlert className="h-4 w-4 text-orange-200" />
                  {getSiteText("eligibility.requiredDocs", siteLanguage)}
                </p>
                <div className="flex flex-wrap gap-2">
                  {result.required_documents.map((document) => (
                    <span key={document} className="rounded-full bg-white/5 px-3 py-2 text-xs text-slate-200">
                      {document}
                    </span>
                  ))}
                </div>
              </div>
              {!result.eligible ? (
                <button
                  type="button"
                  onClick={handleEscalateToCsc}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-5 py-3 text-sm font-semibold text-amber-50 transition hover:bg-amber-300/15"
                >
                  <ShieldAlert className="h-4 w-4" />
                  Escalate to Local Gram Panchayat CSC Agent
                </button>
              ) : null}
            </div>
          ) : (
            <div className="rounded-[20px] border border-dashed border-white/10 bg-white/[0.03] p-5 text-sm leading-6 text-slate-400">
              {getSiteText("eligibility.emptyState", siteLanguage)}
            </div>
          )}
        </div>
      </div>
    </SectionShell>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
  yesLabel,
  noLabel,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  yesLabel: string;
  noLabel: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-[20px] border border-white/10 bg-white/5 px-4 py-3">
      <span className="max-w-[18rem] text-sm text-slate-200">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] ${
          checked ? "bg-emerald-400/20 text-emerald-100" : "bg-slate-800 text-slate-300"
        }`}
      >
        {checked ? yesLabel : noLabel}
      </button>
    </div>
  );
}

function RuleList({
  title,
  items,
  tone,
  icon: Icon,
}: {
  title: string;
  items: string[];
  tone: "success" | "danger";
  icon: typeof CheckCircle2;
}) {
  const toneStyles =
    tone === "success" ? "border-emerald-400/20 bg-emerald-400/5" : "border-rose-400/20 bg-rose-400/5";

  return (
    <div className={`rounded-[20px] border p-4 ${toneStyles}`}>
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
        <Icon className="h-4 w-4" />
        {title}
      </p>
      {items.length > 0 ? (
        <ul className="space-y-2 text-sm leading-6 text-slate-200">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-400">No items to show.</p>
      )}
    </div>
  );
}
