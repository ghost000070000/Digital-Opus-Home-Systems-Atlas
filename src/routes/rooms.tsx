import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/atlas/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAtlas } from "@/lib/atlas/store";

export const Route = createFileRoute("/rooms")({ component: RoomsPage });

function RoomsPage() {
  const doc = useAtlas((s) => s.doc);
  const setAddOpen = useAtlas((s) => s.setAddOpen);
  const addFloor = useAtlas((s) => s.addFloor);
  const updateFloor = useAtlas((s) => s.updateFloor);
  const deleteFloor = useAtlas((s) => s.deleteFloor);
  const [floorName, setFloorName] = useState("");

  const floors = [...doc.floors].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  const unfloored = doc.rooms.filter((r) => !r.floorId || !doc.floors.some((f) => f.id === r.floorId));

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <PageHeader
        eyebrow="Places"
        title="Rooms"
        description="A room is a place things live. Floors group rooms in a house or building."
        actions={
          <Button variant="secondary" onClick={() => setAddOpen(true, "room")}>
            Add room
          </Button>
        }
      />
      {floors.length > 0 || unfloored.length > 0 ? (
        <div className="space-y-8 p-4 md:p-6">
          {floors.map((floor) => {
            const rooms = doc.rooms.filter((r) => r.floorId === floor.id);
            return (
              <section key={floor.id} className="space-y-3">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-faint">Floor</p>
                    <Input
                      className="max-w-xs font-display text-xl"
                      value={floor.name}
                      onChange={(e) => updateFloor(floor.id, { name: e.target.value })}
                    />
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => deleteFloor(floor.id)}>
                    Remove floor
                  </Button>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {rooms.map((room) => (
                    <RoomCard key={room.id} roomId={room.id} />
                  ))}
                  {rooms.length === 0 ? <p className="text-sm text-muted">No rooms on this floor.</p> : null}
                </div>
              </section>
            );
          })}
          {unfloored.length ? (
            <section className="space-y-3">
              <p className="text-[11px] uppercase tracking-[0.14em] text-faint">Ungrouped</p>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {unfloored.map((room) => (
                  <RoomCard key={room.id} roomId={room.id} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : (
        <p className="p-6 text-sm text-muted">No rooms yet. Add one to start grouping.</p>
      )}
      <div className="flex flex-wrap gap-2 px-4 pb-8 md:px-6">
        <Input
          className="max-w-xs"
          value={floorName}
          placeholder="Ground, Upper, Basement…"
          onChange={(e) => setFloorName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && floorName.trim()) {
              addFloor(floorName.trim());
              setFloorName("");
            }
          }}
        />
        <Button
          variant="secondary"
          onClick={() => {
            if (!floorName.trim()) return;
            addFloor(floorName.trim());
            setFloorName("");
          }}
        >
          Add floor
        </Button>
      </div>
    </div>
  );
}

function RoomCard({ roomId }: { roomId: string }) {
  const doc = useAtlas((s) => s.doc);
  const room = doc.rooms.find((r) => r.id === roomId);
  if (!room) return null;
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
}