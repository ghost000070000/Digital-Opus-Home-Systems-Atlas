import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORY_LABEL } from "@/lib/atlas/catalog";
import { useAtlas } from "@/lib/atlas/store";
import { ENTITY_CATEGORIES, type EntityCategory } from "@/lib/atlas/types";

export function AddItemDialog() {
  const open = useAtlas((s) => s.ui.addOpen);
  const addKind = useAtlas((s) => s.ui.addKind);
  const setAddOpen = useAtlas((s) => s.setAddOpen);
  const doc = useAtlas((s) => s.doc);
  const addEntity = useAtlas((s) => s.addEntity);
  const addRoom = useAtlas((s) => s.addRoom);
  const addSystem = useAtlas((s) => s.addSystem);
  const [kind, setKind] = useState<"entity" | "room" | "system">("entity");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<EntityCategory>("device");
  const [roomId, setRoomId] = useState("none");
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (open) setKind(addKind);
  }, [open, addKind]);

  function reset() {
    setName("");
    setLabel("");
    setCategory("device");
    setRoomId("none");
  }

  function submit() {
    const n = name.trim();
    if (!n) return;
    if (kind === "room") addRoom(n);
    else if (kind === "system") addSystem(n);
    else {
      addEntity({
        name: n,
        category,
        roomId: roomId === "none" ? null : roomId,
        label,
      });
    }
    reset();
    setAddOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setKind(addKind);
        else reset();
        setAddOpen(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to the atlas</DialogTitle>
          <DialogDescription>Only a name is required. Everything else can wait.</DialogDescription>
        </DialogHeader>
        <div className="flex gap-1 rounded-md bg-surface p-1">
          {(["entity", "room", "system"] as const).map((k) => (
            <button
              key={k}
              className={`h-9 flex-1 rounded-sm text-sm capitalize ${kind === k ? "bg-bg-elevated text-fg" : "text-muted"}`}
              onClick={() => setKind(k)}
            >
              {k === "entity" ? "Item" : k}
            </button>
          ))}
        </div>
        <div className="mt-4 space-y-3">
          <label className="block space-y-1.5">
            <Label>Name</Label>
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
          </label>
          {kind === "entity" ? (
            <>
              <label className="block space-y-1.5">
                <Label>Category</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as EntityCategory)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTITY_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {CATEGORY_LABEL[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="block space-y-1.5">
                <Label>Room</Label>
                <Select value={roomId} onValueChange={setRoomId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No room yet</SelectItem>
                    {doc.rooms.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="block space-y-1.5">
                <Label>Label (optional)</Label>
                <Input value={label} placeholder="NAS-01" onChange={(e) => setLabel(e.target.value)} />
              </label>
            </>
          ) : null}
          <Button className="w-full" disabled={!name.trim()} onClick={submit}>
            Add
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
