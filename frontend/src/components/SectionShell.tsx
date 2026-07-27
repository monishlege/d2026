import type { ReactNode } from "react";

interface SectionShellProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}

export default function SectionShell({
  eyebrow,
  title,
  description,
  children,
}: SectionShellProps) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-[0_24px_80px_rgba(3,8,20,0.35)] backdrop-blur-md md:p-8">
      <div className="mb-6 space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">{eyebrow}</p>
        <div className="space-y-2">
          <h2 className="font-display text-3xl text-white">{title}</h2>
          <p className="max-w-2xl text-sm leading-6 text-slate-300">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
