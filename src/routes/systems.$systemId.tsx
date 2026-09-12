import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/atlas/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { STATUS_LABEL } from "@/lib/atlas/catalog";
import { analyzeFailure } from "@/lib/atlas/failure";
import { useAtlas } from "@/lib/atlas/store";

export const Route = createFileRoute("/systems/$systemId")({ component: SystemDetail });

function SystemDetail() {
  const { systemId } = Route.useParams();
  const doc = useAtlas((s) => s.doc);
  const updateSystem = useAtlas((s) => s.updateSystem);
  const deleteSystem = useAtlas((s) => s.deleteSystem);
  const selectEntity = useAtlas((s) => s.selectEntity);
  const setSystemFilter = useAtlas((s) => s.setSystemFilter);
  const sys = doc.systems.find((s) => s.id === systemId);

  if (!sys) {
    return (
      <div className="p-6">
        <p className="text-muted">That system is not in this atlas.</p>
        <Link to="/systems" className="text-copper">
          Back to systems
        </Link>
      </div>
    );
  }

  const members = doc.entities.filter((e) => e.systemIds.includes(sys.id));
  const rooms = new Set(members.map((m) => m.roomId).filter(Boolean));

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <PageHeader
        eyebrow="System"
        title={sys.name}
        description={sys.notes || "Members of this system and how a failure would land."}
        actions={
          <>
            <Button asChild variant="secondary" size="sm">
              <Link to="/" onClick={() => setSystemFilter([sys.id])}>
                Show on atlas
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => deleteSystem(sys.id)}>
              Delete
            </Button>
          </>
        }
      />
      <div className="grid gap-6 p-4 md:grid-cols-[minmax(0,1fr)_280px] md:p-6">
        <ul className="divide-y divide-border">
          {members.map((e) => {
            const blast = analyzeFailure(doc, { failedIds: [e.id] });
            return (
              <li key={e.id} className="flex items-start justify-between gap-3 py-3">
                <div>
                  <Link to="/" onClick={() => selectEntity(e.id)} className="text-sm text-fg">
                    {e.name}
                  </Link>
                  <p className="text-xs text-muted">
                    {e.category.replace("-", " ")} · if this fails: {blast.hard.length} hard / {blast.degraded.length} degraded
                  </p>
                </div>
                <Badge variant={e.status === "failed" ? "danger" : "default"}>{STATUS_LABEL[e.status]}</Badge>
              </li>
            );
          })}
        </ul>
        <div className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs text-muted">Name</span>
            <Input value={sys.name} onChange={(e) => updateSystem(sys.id, { name: e.target.value })} />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs text-muted">Notes</span>
            <Textarea value={sys.notes} onChange={(e) => updateSystem(sys.id, { notes: e.target.value })} />
          </label>
          <p className="text-sm text-muted">Spans {rooms.size} room{rooms.size === 1 ? "" : "s"}.</p>
        </div>
      </div>
    </div>
  );
}
