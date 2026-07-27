import { Landmark, Shield, Stethoscope, Tractor } from "lucide-react";

import type { SchemeSummary } from "@/types";

const iconMap = [Tractor, Stethoscope, Landmark, Shield];

interface SchemeHighlightsProps {
  schemes: SchemeSummary[];
}

export default function SchemeHighlights({ schemes }: SchemeHighlightsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {schemes.map((scheme, index) => {
        const Icon = iconMap[index % iconMap.length];
        return (
          <article key={scheme.name} className="rounded-[24px] border border-white/10 bg-white/5 p-5 transition hover:-translate-y-1 hover:border-cyan-300/30">
            <div className="mb-4 inline-flex rounded-2xl bg-cyan-300/10 p-3 text-cyan-100">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="font-display text-2xl text-white">{scheme.name}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-300">{scheme.description}</p>
            <p className="mt-4 text-xs uppercase tracking-[0.22em] text-orange-200/80">{scheme.benefit_summary}</p>
          </article>
        );
      })}
    </div>
  );
}
