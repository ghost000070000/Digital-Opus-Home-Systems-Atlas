import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/atlas/page-header";
import { Button } from "@/components/ui/button";
import { useAtlas } from "@/lib/atlas/store";

export const Route = createFileRoute("/rooms")({ component: RoomsPage });

function RoomsPage() {
  const doc = useAtlas((s) => s.doc);
  const setAddOpen = useAtlas((s) => s.setAddOpen);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <PageHeader
        eyebrow="Places"
        title="Rooms"
        description="A room is a place things live. Open one to see what is inside, what leaves, and what is still unresolved."
        actions={
          <Button variant="secondary" onClick={() => setAddOpen(true, "room")}>
            Add room
          </Button>
        }
      />
      <div className="grid gap-3 p-4 md:grid-cols-2 md:p-6 xl:grid-cols-3">
        {doc.rooms.map((room) => {
          const members = doc.entities.filter((e) => e.roomId === room.id);
          const failed = members.filter((e) => e.status === "failed" || e.status === "offline");
          const leaving = doc.relationships.filter((r) => {
            const a = doc.entities.find((e) => e.id === r.fromId);
            const b = doc.entities.find((e) => e.id === r.toId);
            if (!a || !b) return false;
            return (a.roomId === room.id) !== (b.roomId === room.id) && (a.roomId === room.id || b.roomId === room.id);
          });
          return (
            <Link
              key={room.id}
              to="/rooms/$roomId"
              params={{ roomId: room.id }}
              className="rounded-xl bg-bg-elevated p-4 shadow-[var(--shadow-border)] transition-[box-shadow] hover:shadow-[var(--shadow-border-hover)]"
            >
              <p className="text-[11px] uppercase tracking-[0.14em] text-faint">Room</p>
              <h3 className="font-display text-2xl">{room.name}</h3>
              <p className="mt-2 text-sm text-muted">{room.notes || "No notes"}</p>
              <p className="mt-4 font-mono text-xs text-copper">
                {members.length} items · {leaving.length} leaving · {failed.length} failed
              </p>
            </Link>
          );
        })}
        {doc.rooms.length === 0 ? (
          <p className="text-sm text-muted">No rooms yet. Add one to start grouping.</p>
        ) : null}
      </div>
    </div>
  );
}
