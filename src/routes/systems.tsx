import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/atlas/page-header";
import { Button } from "@/components/ui/button";
import { useAtlas } from "@/lib/atlas/store";

export const Route = createFileRoute("/systems")({ component: SystemsPage });

function SystemsPage() {
  const doc = useAtlas((s) => s.doc);
  const setAddOpen = useAtlas((s) => s.setAddOpen);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <PageHeader
        eyebrow="Logical groups"
        title="Systems"
        description="A system is a job the house does. One item may belong to several — internet, backup power, and storage can share a NAS."
        actions={
          <Button variant="secondary" onClick={() => setAddOpen(true, "system")}>
            Add system
          </Button>
        }
      />
      <div className="grid gap-3 p-4 md:grid-cols-2 md:p-6 xl:grid-cols-3">
        {doc.systems.map((sys) => {
          const members = doc.entities.filter((e) => e.systemIds.includes(sys.id));
          const failed = members.filter((e) => e.status === "failed" || e.status === "offline");
          return (
            <Link
              key={sys.id}
              to="/systems/$systemId"
              params={{ systemId: sys.id }}
              className="rounded-xl bg-bg-elevated p-4 shadow-[var(--shadow-border)] hover:shadow-[var(--shadow-border-hover)]"
            >
              <p className="text-[11px] uppercase tracking-[0.14em] text-faint">System</p>
              <h3 className="font-display text-2xl">{sys.name}</h3>
              <p className="mt-2 text-sm text-muted">{sys.notes || "No notes"}</p>
              <p className="mt-4 font-mono text-xs text-copper">
                {members.length} items{failed.length ? ` · ${failed.length} failed` : ""}
              </p>
            </Link>
          );
        })}
        {doc.systems.length === 0 ? (
          <p className="text-sm text-muted">No systems yet. Group items by the job they do.</p>
        ) : null}
      </div>
    </div>
  );
}
