import { useMemo, useState, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORY_LABEL, CABLE_LABEL, MAINTENANCE_LABEL, STATUS_LABEL } from "@/lib/atlas/catalog";
import { analyzeFailure } from "@/lib/atlas/failure";
import { downstream, shortestPath, upstream } from "@/lib/atlas/graph";
import { RELATION_META, relationLabel } from "@/lib/atlas/relations";
import { useAtlas } from "@/lib/atlas/store";
import {
  CABLE_TYPES,
  ENTITY_CATEGORIES,
  ENTITY_STATUSES,
  MAINTENANCE_KINDS,
  RELATION_TYPES,
  type CableType,
  type EntityCategory,
  type EntityStatus,
  type MaintenanceKind,
  type RelationType,
} from "@/lib/atlas/types";
import { formatDate } from "@/lib/utils";

function statusVariant(status: EntityStatus) {
  if (status === "failed" || status === "offline") return "danger" as const;
  if (status === "degraded") return "warn" as const;
  if (status === "ok") return "ok" as const;
  return "default" as const;
}

export function Inspector() {
  const doc = useAtlas((s) => s.doc);
  const id = useAtlas((s) => s.ui.selectedEntityId);
  const whatIf = useAtlas((s) => s.ui.whatIf);
  const entity = doc.entities.find((e) => e.id === id) ?? null;

  if (!entity) {
    return (
      <aside className="hidden h-full w-[340px] shrink-0 flex-col border-l border-border bg-bg-elevated lg:flex">
        <div className="flex h-full flex-col justify-center px-6">
          <p className="font-display text-2xl text-fg">Nothing selected</p>
          <p className="mt-2 text-sm text-muted">
            Click a node on the atlas, or search. The inspector is the accessible alternative to the graph.
          </p>
        </div>
      </aside>
    );
  }

  return <InspectorBody key={entity.id} />;
}

function InspectorBody() {
  const doc = useAtlas((s) => s.doc);
  const id = useAtlas((s) => s.ui.selectedEntityId)!;
  const entity = doc.entities.find((e) => e.id === id)!;
  const whatIf = useAtlas((s) => s.ui.whatIf);
  const updateEntity = useAtlas((s) => s.updateEntity);
  const setStatus = useAtlas((s) => s.setStatus);
  const deleteEntity = useAtlas((s) => s.deleteEntity);
  const duplicateEntity = useAtlas((s) => s.duplicateEntity);
  const addRelationship = useAtlas((s) => s.addRelationship);
  const updateRelationship = useAtlas((s) => s.updateRelationship);
  const deleteRelationship = useAtlas((s) => s.deleteRelationship);
  const addConnection = useAtlas((s) => s.addConnection);
  const deleteConnection = useAtlas((s) => s.deleteConnection);
  const addMaintenance = useAtlas((s) => s.addMaintenance);
  const deleteMaintenance = useAtlas((s) => s.deleteMaintenance);
  const toggleWhatIfFailed = useAtlas((s) => s.toggleWhatIfFailed);
  const selectEntity = useAtlas((s) => s.selectEntity);
  const setFocusMode = useAtlas((s) => s.setFocusMode);

  const [tab, setTab] = useState<"overview" | "links" | "notes">("overview");
  const [relTo, setRelTo] = useState("");
  const [relType, setRelType] = useState<RelationType>("depends-on");
  const [cabTo, setCabTo] = useState("");
  const [cabType, setCabType] = useState<CableType>("ethernet");
  const [cabLabel, setCabLabel] = useState("");
  const [mntKind, setMntKind] = useState<MaintenanceKind>("inspected");
  const [mntNotes, setMntNotes] = useState("");
  const [pathTo, setPathTo] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);

  const rooms = doc.rooms;
  const systems = doc.systems;
  const others = doc.entities.filter((e) => e.id !== entity.id);

  const rels = doc.relationships.filter((r) => r.fromId === entity.id || r.toId === entity.id);
  const cables = doc.connections.filter((c) => c.fromId === entity.id || c.toId === entity.id);
  const history = doc.maintenance.filter((m) => m.entityId === entity.id);

  const up = useMemo(() => upstream(doc, entity.id), [doc, entity.id]);
  const down = useMemo(() => downstream(doc, entity.id), [doc, entity.id]);
  const blast = useMemo(() => analyzeFailure(doc, { failedIds: [entity.id] }), [doc, entity.id]);
  const nameOf = (eid: string) => doc.entities.find((e) => e.id === eid)?.name ?? eid;

  const path = pathTo ? shortestPath(doc, entity.id, pathTo) : null;

  return (
    <aside className="flex h-full min-h-0 w-full flex-col bg-bg-elevated lg:w-[340px] lg:shrink-0 lg:border-l lg:border-border">
      <div className="border-b border-border px-4 py-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.14em] text-faint">
              {CATEGORY_LABEL[entity.category]}
            </p>
            <h2 className="font-display text-2xl leading-tight text-fg">{entity.name}</h2>
          </div>
          <Badge variant={statusVariant(entity.status)}>{STATUS_LABEL[entity.status]}</Badge>
        </div>
        {entity.label ? (
          <p className="mt-1 font-mono text-xs text-copper">{entity.label}</p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => setFocusMode(true)}>
            Trace
          </Button>
          <Button size="sm" variant="ghost" onClick={() => duplicateEntity(entity.id)}>
            Duplicate
          </Button>
          <Button
            size="sm"
            variant={whatIf.failedIds.includes(entity.id) ? "danger" : "outline"}
            onClick={() => toggleWhatIfFailed(entity.id)}
          >
            What if
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirmRemove(true)}>
            Remove
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <AlertDialogContent>
          <AlertDialogTitle>Remove {entity.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            Links and cables to this item are dropped. This only changes the copy stored in this browser.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteEntity(entity.id)}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex gap-1 border-b border-border px-2">
        {(["overview", "links", "notes"] as const).map((t) => (
          <button
            key={t}
            className={`h-10 flex-1 text-sm capitalize ${tab === t ? "text-fg" : "text-muted"}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {tab === "overview" ? (
          <div className="space-y-3">
            <Field label="Name">
              <Input value={entity.name} onChange={(e) => updateEntity(entity.id, { name: e.target.value })} />
            </Field>
            <Field label="Label">
              <Input
                value={entity.label}
                placeholder="NAS-01"
                onChange={(e) => updateEntity(entity.id, { label: e.target.value })}
              />
            </Field>
            <Field label="Category">
              <Select
                value={entity.category}
                onValueChange={(v) => updateEntity(entity.id, { category: v as EntityCategory })}
              >
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
            </Field>
            <Field label="Status">
              <Select value={entity.status} onValueChange={(v) => setStatus(entity.id, v as EntityStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={entity.critical}
                onCheckedChange={(v) => updateEntity(entity.id, { critical: v === true })}
              />
              Critical
            </label>
            <Field label="Spare for">
              <Select
                value={entity.spareForId ?? "none"}
                onValueChange={(v) => updateEntity(entity.id, { spareForId: v === "none" ? null : v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not a spare</SelectItem>
                  {others.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Room">
              <Select
                value={entity.roomId ?? "none"}
                onValueChange={(v) => updateEntity(entity.id, { roomId: v === "none" ? null : v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No room</SelectItem>
                  {rooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Systems">
              <div className="flex flex-wrap gap-1.5">
                {systems.map((s) => {
                  const on = entity.systemIds.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      className={`rounded-full px-2.5 py-1 text-xs ${on ? "bg-copper/15 text-copper" : "bg-surface text-muted"}`}
                      onClick={() =>
                        updateEntity(entity.id, {
                          systemIds: on
                            ? entity.systemIds.filter((x) => x !== s.id)
                            : [...entity.systemIds, s.id],
                        })
                      }
                    >
                      {s.name}
                    </button>
                  );
                })}
                {systems.length === 0 ? <span className="text-xs text-faint">No systems yet</span> : null}
              </div>
            </Field>
            <Field label="Manufacturer">
              <Input
                value={entity.manufacturer}
                onChange={(e) => updateEntity(entity.id, { manufacturer: e.target.value })}
              />
            </Field>
            <Field label="Model">
              <Input value={entity.model} onChange={(e) => updateEntity(entity.id, { model: e.target.value })} />
            </Field>
            <Field label="Serial">
              <Input value={entity.serial} onChange={(e) => updateEntity(entity.id, { serial: e.target.value })} />
            </Field>
            <Field label="Tags (comma)">
              <Input
                value={entity.tags.join(", ")}
                onChange={(e) =>
                  updateEntity(entity.id, {
                    tags: e.target.value
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean),
                  })
                }
              />
            </Field>
            <Separator />
            <p className="text-xs uppercase tracking-[0.14em] text-faint">If this fails</p>
            <p className="text-sm text-muted">
              {blast.hard.length} hard · {blast.degraded.length} degraded · {blast.systemsHard.length} systems
            </p>
            <ul className="space-y-1 text-sm">
              {blast.hard.slice(0, 8).map((hid) => (
                <li key={hid}>
                  <button className="text-left text-danger" onClick={() => selectEntity(hid)}>
                    {nameOf(hid)}
                  </button>
                </li>
              ))}
            </ul>
            <p className="text-[11px] leading-relaxed text-faint">{blast.disclaimer}</p>
          </div>
        ) : null}

        {tab === "links" ? (
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.14em] text-faint">Relationships</p>
            <ul className="space-y-2">
              {rels.map((r) => {
                const other = r.fromId === entity.id ? r.toId : r.fromId;
                const dir = r.fromId === entity.id ? relationLabel(r.type, r.customLabel) : RELATION_META[r.type].reverse;
                return (
                  <li key={r.id} className="flex items-start justify-between gap-2 rounded-md bg-surface px-2 py-2">
                    <button className="min-w-0 text-left text-sm" onClick={() => selectEntity(other)}>
                      <span className="text-muted">{dir} </span>
                      <span className="text-fg">{nameOf(other)}</span>
                      {r.type === "custom" && r.carriesFailure ? (
                        <span className="block text-[11px] text-warn">carries failure</span>
                      ) : null}
                    </button>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {r.type === "custom" ? (
                        <button
                          className="text-xs text-copper"
                          onClick={() => updateRelationship(r.id, { carriesFailure: !r.carriesFailure })}
                        >
                          {r.carriesFailure ? "Ignore fail" : "Carry fail"}
                        </button>
                      ) : null}
                      <button className="text-xs text-faint hover:text-danger" onClick={() => deleteRelationship(r.id)}>
                        Remove
                      </button>
                    </div>
                  </li>
                );
              })}
              {rels.length === 0 ? <li className="text-sm text-faint">None yet</li> : null}
            </ul>
            <div className="space-y-2 rounded-md bg-surface p-2">
              <Label>Add relationship from this item</Label>
              <Select value={relType} onValueChange={(v) => setRelType(v as RelationType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RELATION_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {RELATION_META[t].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={relTo || "pick"} onValueChange={setRelTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Target" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pick">Choose item</SelectItem>
                  {others.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                className="w-full"
                disabled={!relTo || relTo === "pick"}
                onClick={() => {
                  addRelationship({ fromId: entity.id, toId: relTo, type: relType });
                  setRelTo("");
                }}
              >
                Add link
              </Button>
            </div>

            <p className="text-xs uppercase tracking-[0.14em] text-faint">Cables</p>
            <ul className="space-y-2">
              {cables.map((c) => (
                <li key={c.id} className="flex items-start justify-between gap-2 rounded-md bg-surface px-2 py-2 text-sm">
                  <span>
                    <span className="font-mono text-xs text-copper">{c.label || CABLE_LABEL[c.cableType]}</span>
                    <span className="block text-muted">
                      {nameOf(c.fromId)} → {nameOf(c.toId)}
                      {c.spare ? " · spare" : c.active ? "" : " · inactive"}
                    </span>
                  </span>
                  <button className="text-xs text-faint hover:text-danger" onClick={() => deleteConnection(c.id)}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <div className="space-y-2 rounded-md bg-surface p-2">
              <Label>Record a cable</Label>
              <Select value={cabType} onValueChange={(v) => setCabType(v as CableType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CABLE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {CABLE_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={cabTo || "pick"} onValueChange={setCabTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Other end" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pick">Choose item</SelectItem>
                  {others.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input placeholder="Label (ETH-SW1-P07)" value={cabLabel} onChange={(e) => setCabLabel(e.target.value)} />
              <Button
                size="sm"
                className="w-full"
                disabled={!cabTo || cabTo === "pick"}
                onClick={() => {
                  addConnection({ fromId: entity.id, toId: cabTo, cableType: cabType, label: cabLabel });
                  setCabTo("");
                  setCabLabel("");
                }}
              >
                Add cable
              </Button>
            </div>

            <p className="text-xs uppercase tracking-[0.14em] text-faint">Depends on</p>
            <ul className="text-sm text-muted">
              {up.visited.filter((x) => x !== entity.id).slice(0, 12).map((x) => (
                <li key={x}>
                  <button onClick={() => selectEntity(x)}>{nameOf(x)}</button>
                </li>
              ))}
            </ul>
            <p className="text-xs uppercase tracking-[0.14em] text-faint">Would affect</p>
            <ul className="text-sm text-muted">
              {down.visited.filter((x) => x !== entity.id).slice(0, 12).map((x) => (
                <li key={x}>
                  <button onClick={() => selectEntity(x)}>{nameOf(x)}</button>
                </li>
              ))}
            </ul>
            <Field label="Shortest path to">
              <Select value={pathTo || "pick"} onValueChange={setPathTo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pick">Choose item</SelectItem>
                  {others.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {path ? (
              <p className="text-sm text-muted">{path.map(nameOf).join(" → ")}</p>
            ) : pathTo && pathTo !== "pick" ? (
              <p className="text-sm text-faint">No recorded path.</p>
            ) : null}
          </div>
        ) : null}

        {tab === "notes" ? (
          <div className="space-y-3">
            <Field label="Notes">
              <Textarea
                value={entity.notes}
                rows={4}
                onChange={(e) => updateEntity(entity.id, { notes: e.target.value })}
              />
            </Field>
            <Field label="Playbook">
              <Textarea
                value={entity.playbook}
                rows={3}
                placeholder="What a person should do if this fails."
                onChange={(e) => updateEntity(entity.id, { playbook: e.target.value })}
              />
            </Field>
            <Field label="Next service">
              <Input
                type="date"
                value={entity.nextService}
                onChange={(e) => updateEntity(entity.id, { nextService: e.target.value })}
              />
            </Field>
            <Field label="Vendor">
              <Input
                value={entity.purchase.vendor}
                onChange={(e) =>
                  updateEntity(entity.id, { purchase: { ...entity.purchase, vendor: e.target.value } })
                }
              />
            </Field>
            <Field label="Purchased">
              <Input
                type="date"
                value={entity.purchase.date}
                onChange={(e) =>
                  updateEntity(entity.id, { purchase: { ...entity.purchase, date: e.target.value } })
                }
              />
            </Field>
            <Field label="Price">
              <Input
                value={entity.purchase.price}
                onChange={(e) =>
                  updateEntity(entity.id, { purchase: { ...entity.purchase, price: e.target.value } })
                }
              />
            </Field>
            <Field label="Warranty until">
              <Input
                type="date"
                value={entity.purchase.warrantyUntil}
                onChange={(e) =>
                  updateEntity(entity.id, { purchase: { ...entity.purchase, warrantyUntil: e.target.value } })
                }
              />
            </Field>
            <Field label="Photo">
              {entity.imageDataUrl ? (
                <img
                  src={entity.imageDataUrl}
                  alt=""
                  className="mb-2 h-24 w-24 rounded-md object-cover"
                />
              ) : null}
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    const src = String(reader.result ?? "");
                    const img = new Image();
                    img.onload = () => {
                      const canvas = document.createElement("canvas");
                      const scale = Math.min(1, 240 / Math.max(img.width, img.height));
                      canvas.width = Math.max(1, Math.round(img.width * scale));
                      canvas.height = Math.max(1, Math.round(img.height * scale));
                      const ctx = canvas.getContext("2d");
                      if (!ctx) return;
                      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                      updateEntity(entity.id, { imageDataUrl: canvas.toDataURL("image/jpeg", 0.82) });
                    };
                    img.src = src;
                  };
                  reader.readAsDataURL(file);
                  e.target.value = "";
                }}
              />
              {entity.imageDataUrl ? (
                <button
                  type="button"
                  className="mt-1 text-xs text-faint"
                  onClick={() => updateEntity(entity.id, { imageDataUrl: "" })}
                >
                  Remove photo
                </button>
              ) : null}
            </Field>
            <p className="text-xs uppercase tracking-[0.14em] text-faint">Maintenance</p>
            <ul className="space-y-2">
              {history.map((m) => (
                <li key={m.id} className="flex justify-between gap-2 rounded-md bg-surface px-2 py-2 text-sm">
                  <span>
                    <span className="text-fg">{MAINTENANCE_LABEL[m.kind]}</span>
                    <span className="block text-xs text-muted">
                      {formatDate(m.date)} {m.notes}
                    </span>
                  </span>
                  <button className="text-xs text-faint" onClick={() => deleteMaintenance(m.id)}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <Select value={mntKind} onValueChange={(v) => setMntKind(v as MaintenanceKind)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MAINTENANCE_KINDS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {MAINTENANCE_LABEL[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="Note" value={mntNotes} onChange={(e) => setMntNotes(e.target.value)} />
            <Button
              size="sm"
              variant="secondary"
              className="w-full"
              onClick={() => {
                addMaintenance({ entityId: entity.id, kind: mntKind, date: new Date().toISOString().slice(0, 10), notes: mntNotes });
                setMntNotes("");
              }}
            >
              Record
            </Button>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <Label>{label}</Label>
      {children}
    </label>
  );
}
