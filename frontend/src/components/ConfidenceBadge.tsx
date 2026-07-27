import { AlertTriangle, BadgeCheck, HelpCircle } from "lucide-react";

import { confidenceActionMap } from "@/store/useAssistantStore";
import type { ConfidenceLevel } from "@/types";

const badgeStyles: Record<ConfidenceLevel, string> = {
  high: "border-emerald-400/40 bg-emerald-400/10 text-emerald-100",
  medium: "border-amber-300/40 bg-amber-300/10 text-amber-50",
  low: "border-rose-400/40 bg-rose-400/10 text-rose-100",
};

const iconMap = {
  high: BadgeCheck,
  medium: HelpCircle,
  low: AlertTriangle,
} as const;

interface ConfidenceBadgeProps {
  confidence: ConfidenceLevel;
}

export default function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  const Icon = iconMap[confidence];
  const action = confidenceActionMap[confidence];

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${badgeStyles[confidence]}`}
      aria-label={`Confidence ${confidence}`}
    >
      <Icon className="h-4 w-4" />
      <span>{confidence}</span>
      <span className="text-[10px] opacity-80">{action}</span>
    </div>
  );
}
