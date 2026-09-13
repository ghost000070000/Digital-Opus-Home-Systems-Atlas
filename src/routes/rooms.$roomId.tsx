import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/atlas/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { STATUS_LABEL } from "@/lib/atlas/catalog";
import { relationLabel } from "@/lib/atlas/relations";
import { useAtlas } from "@/lib/atlas/store";

export const Route = createFileRoute("/rooms/$roomId")({ component: RoomDetail });

function RoomDetail() {
  const { roomId } = Route.useParams();
  const doc = useAtlas((s) => s.doc);
  const updateRoom = useAtlas((s) => s.updateRoom);
  const deleteRoom = useAtlas((s) => s.deleteRoom);
  const selectEntity = useAtlas((s) => s.selectEntity);
  const setRoomFilter = useAtlas((s) => s.setRoomFilter);
  const navigate = useNavigate();
  const room = doc.rooms.find((r) => r.id === roomId);

  if (!room) {
    return (
      <div className="p-6">
        <p className="text-muted">That room is not in this atlas.</p>
        <Link to="/rooms" className="text-copper">
          Back to rooms
        </Link>
      </div>
    );
  }

  const members = doc.entities.filter((e) => e.roomId === room.id);
  const internal = doc.relationships.filter((r) => {
    const a = doc.entities.find((e) => e.id === r.fromId);
    const b = doc.entities.find((e) => e.id === r.toId);
    return a?.roomId === room.id && b?.roomId === room.id;
  });
  const leaving = doc.relationships.filter((r) => {
    const a = doc.entities.find((e) => e.id === r.fromId);
    const b = doc.entities.find((e) => e.id === r.toId);
    if (!a || !b) return false;
    const aIn = a.roomId === room.id;
    const bIn = b.roomId === room.id;
    return aIn !== bIn;
  });
  const power = members.filter((e) =>
    doc.relationships.some((r) => r.fromId === e.id && r.type === "powered-by"),
  );
  const unresolved = members.filter((e) => !e.category || e.status === "unknown" || e.systemIds.length === 0);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <PageHeader
        eyebrow="Room"
        title={room.name}
        description={room.notes || "What lives here, how it connects, and what leaves the room."}
        actions={
          <>
            <Button asChild variant="secondary" size="sm">
              <Link to="/" onClick={() => setRoomFilter([room.id])}>
                Show on atlas
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                deleteRoom(room.id);
                void navigate({ to: "/rooms" });
              }}
            >
              Delete
            </Button>
          </>
        }
      />
      <div className="grid gap-6 p-4 md:grid-cols-[minmax(0,1fr)_280px] md:p-6">
        <div className="space-y-6">
          <section>
            <h3 className="text-xs uppercase tracking-[0.14em] text-faint">Contained</h3>
            <ul className="mt-2 divide-y divide-border">
              {members.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-2 py-2">
                  <Link to="/" onClick={() => selectEntity(e.id)} className="text-sm text-fg">
                    {e.name}
                  </Link>
                  <Badge variant={e.status === "failed" ? "danger" : "default"}>{STATUS_LABEL[e.status]}</Badge>
                </li>
              ))}
              {members.length === 0 ? <li className="py-2 text-sm text-muted">Empty room</li> : null}
            </ul>
          </section>
          <section>
            <h3 className="text-xs uppercase tracking-[0.14em] text-faint">Internal links</h3>
            <ul className="mt-2 space-y-1 text-sm text-muted">
              {internal.map((r) => (
                <li key={r.id}>
                  {doc.entities.find((e) => e.id === r.fromId)?.name} {relationLabel(r.type, r.customLabel)}{" "}
                  {doc.entities.find((e) => e.id === r.toId)?.name}
                </li>
              ))}
              {internal.length === 0 ? <li>None recorded</li> : null}
            </ul>
          </section>
          <section>
            <h3 className="text-xs uppercase tracking-[0.14em] text-faint">Leaving the room</h3>
            <ul className="mt-2 space-y-1 text-sm text-muted">
              {leaving.map((r) => (
                <li key={r.id}>
                  {doc.entities.find((e) => e.id === r.fromId)?.name} {relationLabel(r.type, r.customLabel)}{" "}
                  {doc.entities.find((e) => e.id === r.toId)?.name}
                </li>
              ))}
              {leaving.length === 0 ? <li>No outbound links</li> : null}
            </ul>
          </section>
        </div>
        <div className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs text-muted">Name</span>
            <Input value={room.name} onChange={(e) => updateRoom(room.id, { name: e.target.value })} />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs text-muted">Floor</span>
            <Select
              value={room.floorId ?? "none"}
              onValueChange={(v) => updateRoom(room.id, { floorId: v === "none" ? null : v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No floor</SelectItem>
                {doc.floors.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs text-muted">Notes</span>
            <Textarea value={room.notes} onChange={(e) => updateRoom(room.id, { notes: e.target.value })} />
          </label>
          <p className="text-sm text-muted">{power.length} items have a recorded power source.</p>
          <p className="text-sm text-muted">{unresolved.length} items have no system yet.</p>
        </div>
      </div>
    </div>
  );
}
