import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/atlas/page-header";
import { Badge } from "@/components/ui/badge";
import { careDesk, careLabel, formatMoney } from "@/lib/atlas/care";
import { useAtlas } from "@/lib/atlas/store";

export const Route = createFileRoute("/care")({ component: CarePage });

function CarePage() {
  const doc = useAtlas((s) => s.doc);
  const selectEntity = useAtlas((s) => s.selectEntity);
  const desk = careDesk(doc);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <PageHeader
        eyebrow="Time"
        title="Care"
        description="Service dates and warranties you recorded. Totals only count prices you typed — they are not an appraisal."
      />
      <div className="grid gap-6 p-4 md:p-6 lg:grid-cols-2">
        <section className="space-y-3 rounded-xl bg-bg-elevated p-4 shadow-[var(--shadow-border)]">
          <p className="font-display text-2xl">Overdue</p>
          {desk.overdue.length === 0 ? (
            <p className="text-sm text-muted">Nothing recorded as overdue.</p>
          ) : (
            <ul className="space-y-2">
              {desk.overdue.map((row) => (
                <li key={row.entity.id}>
                  <Link
                    to="/"
                    onClick={() => selectEntity(row.entity.id)}
                    className="flex items-baseline justify-between gap-3"
                  >
                    <span>{row.entity.name}</span>
                    <Badge variant="danger">{careLabel(row.days)}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="space-y-3 rounded-xl bg-bg-elevated p-4 shadow-[var(--shadow-border)]">
          <p className="font-display text-2xl">Coming up</p>
          {desk.upcoming.length === 0 && desk.warranties.filter((w) => w.days >= 0).length === 0 ? (
            <p className="text-sm text-muted">No service or warranty in the next 90 days.</p>
          ) : (
            <ul className="space-y-2">
              {desk.upcoming.map((row) => (
                <li key={`s-${row.entity.id}`}>
                  <Link to="/" onClick={() => selectEntity(row.entity.id)} className="flex items-baseline justify-between gap-3">
                    <span>{row.entity.name} service</span>
                    <span className="font-mono text-xs text-copper">{careLabel(row.days)}</span>
                  </Link>
                </li>
              ))}
              {desk.warranties.map((row) => (
                <li key={`w-${row.entity.id}`}>
                  <Link to="/" onClick={() => selectEntity(row.entity.id)} className="flex items-baseline justify-between gap-3">
                    <span>{row.entity.name} warranty</span>
                    <Badge variant={row.days < 0 ? "warn" : "default"}>{careLabel(row.days)}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="space-y-3 rounded-xl bg-bg-elevated p-4 shadow-[var(--shadow-border)] lg:col-span-2">
          <p className="font-display text-2xl">Recorded spend</p>
          <p className="text-sm text-muted">
            {formatMoney(desk.totalKnown)} across {desk.pricedCount} priced item{desk.pricedCount === 1 ? "" : "s"}
            {desk.unpricedCount ? ` · ${desk.unpricedCount} without a price` : ""}.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-faint">By room</p>
              <ul className="mt-2 space-y-1 text-sm">
                {desk.byRoom.map((b) => (
                  <li key={b.id} className="flex justify-between gap-3">
                    <span>{b.name}</span>
                    <span className="font-mono text-copper">{formatMoney(b.total)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-faint">By system</p>
              <ul className="mt-2 space-y-1 text-sm">
                {desk.bySystem.map((b) => (
                  <li key={b.id} className="flex justify-between gap-3">
                    <span>{b.name}</span>
                    <span className="font-mono text-copper">{formatMoney(b.total)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}