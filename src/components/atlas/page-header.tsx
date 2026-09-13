import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-4 py-4 md:px-6">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[11px] uppercase tracking-[0.16em] text-copper">{eyebrow}</p>
        ) : null}
        <h2 className="font-display text-3xl leading-tight text-fg">{title}</h2>
        {description ? <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
