import { CheckCircle2, ChevronRight, ShieldAlert, XCircle } from "lucide-react";
import { useMemo, useState } from "react";

import SectionShell from "@/components/SectionShell";
import { checkEligibility } from "@/utils/api";
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

const stepTitles = ["Profile", "Scheme Fit", "Housing and Occupation"];

interface EligibilityWizardProps {
  schemes: SchemeSummary[];
}

export default function EligibilityWizard({ schemes }: EligibilityWizardProps) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<EligibilityRequest>(initialForm);
  const [result, setResult] = useState<EligibilityResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const selectedScheme = useMemo(
    () => schemes.find((scheme) => scheme.name === form.scheme_name),
    [form.scheme_name, schemes],
  );

  async function evaluate() {
    setIsLoading(true);
    try {
      const response = await checkEligibility(form);
      setResult(response);
    } finally {
      setIsLoading(false);
    }
  }

  function updateForm<Key extends keyof EligibilityRequest>(key: Key, value: EligibilityRequest[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <SectionShell
      eyebrow="Eligibility Engine"
      title="Scheme match with transparent rule checks"
      description="We keep the decision path visible so citizens can see exactly why a scheme passed, failed, or needs more evidence."
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
                <span>Scheme</span>
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
                <span>Annual income (Rs.)</span>
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
                <span>Landholding (acres)</span>
                <input
                  type="number"
                  value={form.landholding_acres}
                  onChange={(event) => updateForm("landholding_acres", Number(event.target.value))}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
                />
              </label>
              <label className="space-y-2 text-sm text-slate-300">
                <span>Occupation code</span>
                <input
                  type="text"
                  value={form.occupation_code}
                  onChange={(event) => updateForm("occupation_code", event.target.value.toUpperCase())}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
                />
              </label>
              <ToggleRow
                label="SECC-linked eligibility proof available"
                checked={form.has_secc_card}
                onChange={(value) => updateForm("has_secc_card", value)}
              />
              <ToggleRow
                label="Applicant is a street vendor"
                checked={form.is_street_vendor}
                onChange={(value) => updateForm("is_street_vendor", value)}
              />
            </div>
          ) : null}

          {step === 2 ? (
            <div className="grid gap-4 md:grid-cols-2">
              <ToggleRow
                label="Applicant owns a pucca house"
                checked={form.owns_pucca_house}
                onChange={(value) => updateForm("owns_pucca_house", value)}
              />
              <div className="rounded-[20px] border border-orange-300/20 bg-orange-300/5 p-4 text-sm text-orange-50">
                <p className="font-semibold">Active scheme note</p>
                <p className="mt-2 leading-6 text-orange-50/80">
                  {selectedScheme?.benefit_summary ?? "Select a scheme to view the benefit summary."}
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
              Back
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
              {step < stepTitles.length - 1 ? "Next step" : isLoading ? "Evaluating..." : "Run eligibility"}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-slate-950/60 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-2xl text-white">Decision Trace</h3>
            {result ? (
              <span
                className={`rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${
                  result.eligible ? "bg-emerald-400/15 text-emerald-100" : "bg-rose-400/15 text-rose-100"
                }`}
              >
                {result.eligible ? "Eligible" : "Needs attention"}
              </span>
            ) : null}
          </div>

          {result ? (
            <div className="space-y-5">
              <p className="text-sm leading-6 text-slate-300">{result.benefit_summary}</p>
              <RuleList title="Matched checks" icon={CheckCircle2} items={result.matched_rules} tone="success" />
              <RuleList title="Failed checks" icon={XCircle} items={result.failed_rules} tone="danger" />
              <div className="rounded-[20px] border border-white/10 bg-white/5 p-4">
                <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                  <ShieldAlert className="h-4 w-4 text-orange-200" />
                  Required documents
                </p>
                <div className="flex flex-wrap gap-2">
                  {result.required_documents.map((document) => (
                    <span key={document} className="rounded-full bg-white/5 px-3 py-2 text-xs text-slate-200">
                      {document}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-[20px] border border-dashed border-white/10 bg-white/[0.03] p-5 text-sm leading-6 text-slate-400">
              Complete the steps and run the check to see deterministic pass/fail reasoning.
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
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
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
        {checked ? "Yes" : "No"}
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
