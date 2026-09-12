import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/atlas/page-header";
import { Badge } from "@/components/ui/badge";
import { computeInsights } from "@/lib/atlas/insights";
import { useAtlas } from "@/lib/atlas/store";

export const Route = createFileRoute("/insights")({ component: InsightsPage });

function InsightsPage() {
  const doc = useAtlas((s) => s.doc);
  const selectEntity = useAtlas((s) => s.selectEntity);
  const insights = computeInsights(doc);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <PageHeader
        eyebrow="Deterministic"
        title="Insights"
        description="Notices computed from the graph you entered. There is no generated advice and no fake intelligence."
      />
      <ul className="space-y-3 p-4 md:p-6">
        {insights.map((i) => (
          <li key={i.id} className="rounded-xl bg-bg-elevated p-4 shadow-[var(--shadow-border)]">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-xl leading-tight">{i.title}</h3>
              <Badge variant={i.severity === "critical" ? "danger" : i.severity === "watch" ? "warn" : "default"}>
                {i.severity}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-muted">{i.detail}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {i.entityIds.slice(0, 8).map((id) => (
                <Link
                  key={id}
                  to="/"
                  onClick={() => selectEntity(id)}
                  className="text-xs text-copper"
                >
                  {doc.entities.find((e) => e.id === id)?.name ?? id}
                </Link>
              ))}
            </div>
          </li>
        ))}
        {insights.length === 0 ? (
          <li className="text-sm text-muted">The atlas looks quiet — no notices right now.</li>
        ) : null}
      </ul>
    </div>
  );
}
