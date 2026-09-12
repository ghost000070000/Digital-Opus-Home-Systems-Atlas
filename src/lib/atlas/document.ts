import { nowIso, uid } from "../utils.ts";
import type {
  AtlasDocument,
  Connection,
  Entity,
  EntityCategory,
  EntityStatus,
  MaintenanceEvent,
  PurchaseInfo,
  Relationship,
  RelationType,
  Room,
  SystemRecord,
  Vec2,
} from "./types.ts";
import { SCHEMA_VERSION } from "./types.ts";

export function emptyPurchase(): PurchaseInfo {
  return { date: "", price: "", vendor: "", warrantyUntil: "" };
}

export function emptyDocument(name = "Untitled atlas"): AtlasDocument {
  const ts = nowIso();
  return {
    version: SCHEMA_VERSION,
    meta: { name, createdAt: ts, updatedAt: ts, isDemo: false, demoRevision: 0 },
    rooms: [],
    systems: [],
    entities: [],
    relationships: [],
    connections: [],
    maintenance: [],
  };
}

export function touch(doc: AtlasDocument): AtlasDocument {
  return { ...doc, meta: { ...doc.meta, updatedAt: nowIso() } };
}

export function createRoom(partial: Partial<Room> & { name: string }): Room {
  return { id: partial.id ?? uid("room"), name: partial.name, notes: partial.notes ?? "" };
}

export function createSystem(partial: Partial<SystemRecord> & { name: string }): SystemRecord {
  return { id: partial.id ?? uid("sys"), name: partial.name, notes: partial.notes ?? "" };
}

export function createEntity(
  partial: Partial<Entity> & { name: string; category?: EntityCategory },
): Entity {
  return {
    id: partial.id ?? uid("ent"),
    name: partial.name,
    category: partial.category ?? "device",
    roomId: partial.roomId ?? null,
    systemIds: partial.systemIds ? [...partial.systemIds] : [],
    status: (partial.status as EntityStatus) ?? "ok",
    notes: partial.notes ?? "",
    manufacturer: partial.manufacturer ?? "",
    model: partial.model ?? "",
    serial: partial.serial ?? "",
    tags: partial.tags ? [...partial.tags] : [],
    imageDataUrl: partial.imageDataUrl ?? "",
    purchase: { ...emptyPurchase(), ...(partial.purchase ?? {}) },
    custom: { ...(partial.custom ?? {}) },
    label: partial.label ?? "",
    position: partial.position ? { ...partial.position } : { x: 0, y: 0 },
  };
}

export function createRelationship(
  partial: Partial<Relationship> & { fromId: string; toId: string; type: RelationType },
): Relationship {
  return {
    id: partial.id ?? uid("rel"),
    fromId: partial.fromId,
    toId: partial.toId,
    type: partial.type,
    notes: partial.notes ?? "",
    customLabel: partial.customLabel ?? "",
  };
}

export function createConnection(
  partial: Partial<Connection> & { fromId: string; toId: string },
): Connection {
  return {
    id: partial.id ?? uid("cab"),
    cableType: partial.cableType ?? "ethernet",
    fromId: partial.fromId,
    toId: partial.toId,
    fromPort: partial.fromPort ?? "",
    toPort: partial.toPort ?? "",
    label: partial.label ?? "",
    length: partial.length ?? "",
    notes: partial.notes ?? "",
    active: partial.active ?? true,
    spare: partial.spare ?? false,
  };
}

export function createMaintenance(
  partial: Partial<MaintenanceEvent> & { entityId: string; kind: MaintenanceEvent["kind"] },
): MaintenanceEvent {
  return {
    id: partial.id ?? uid("mnt"),
    entityId: partial.entityId,
    kind: partial.kind,
    date: partial.date ?? nowIso().slice(0, 10),
    notes: partial.notes ?? "",
  };
}

export function entityMap(doc: AtlasDocument): Map<string, Entity> {
  return new Map(doc.entities.map((e) => [e.id, e]));
}

export function roomMap(doc: AtlasDocument): Map<string, Room> {
  return new Map(doc.rooms.map((r) => [r.id, r]));
}

export function systemMap(doc: AtlasDocument): Map<string, SystemRecord> {
  return new Map(doc.systems.map((s) => [s.id, s]));
}

export function roomCentroid(doc: AtlasDocument, roomId: string): Vec2 {
  const members = doc.entities.filter((e) => e.roomId === roomId);
  if (members.length === 0) return { x: 480, y: 320 };
  let x = 0;
  let y = 0;
  for (const m of members) {
    x += m.position.x;
    y += m.position.y;
  }
  return { x: x / members.length, y: y / members.length };
}

/** Place a new item near existing members without stacking on top of them. */
export function nextFreePosition(doc: AtlasDocument, roomId: string | null): Vec2 {
  const members = roomId ? doc.entities.filter((e) => e.roomId === roomId) : doc.entities;
  if (members.length === 0) {
    if (!roomId) return { x: 480, y: 320 };
    const idx = Math.max(0, doc.rooms.findIndex((r) => r.id === roomId));
    const cols = Math.max(2, Math.ceil(Math.sqrt(doc.rooms.length + 1)));
    return { x: (idx % cols) * 1400 + 700, y: Math.floor(idx / cols) * 1000 + 500 };
  }
  let cx = 0;
  let cy = 0;
  for (const m of members) {
    cx += m.position.x;
    cy += m.position.y;
  }
  cx /= members.length;
  cy /= members.length;
  const minD = 168;
  for (let k = 0; k < 36; k++) {
    const a = k * 2.399;
    const r = 96 + k * 28;
    const p = { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
    if (members.every((m) => Math.hypot(m.position.x - p.x, m.position.y - p.y) >= minD)) return p;
  }
  return { x: cx + 220, y: cy };
}

export function cloneDocument(doc: AtlasDocument): AtlasDocument {
  return structuredClone(doc);
}
