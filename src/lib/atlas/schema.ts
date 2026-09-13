import { uid } from "../utils.ts";
import { emptyDocument, emptyPurchase } from "./document.ts";
import { duplicateIds, pruneDangling } from "./graph.ts";
import {
  CABLE_TYPES,
  ENTITY_CATEGORIES,
  ENTITY_STATUSES,
  MAINTENANCE_KINDS,
  RELATION_TYPES,
  SCHEMA_VERSION,
  type AtlasDocument,
  type CableType,
  type Connection,
  type Contact,
  type Entity,
  type EntityCategory,
  type EntityStatus,
  type Floor,
  type MaintenanceEvent,
  type MaintenanceKind,
  type PurchaseInfo,
  type Relationship,
  type RelationType,
  type Room,
  type SystemRecord,
} from "./types.ts";

export interface ParseResult {
  ok: boolean;
  doc: AtlasDocument;
  errors: string[];
  warnings: string[];
}

const catSet = new Set<string>(ENTITY_CATEGORIES);
const statusSet = new Set<string>(ENTITY_STATUSES);
const relSet = new Set<string>(RELATION_TYPES);
const cableSet = new Set<string>(CABLE_TYPES);
const maintSet = new Set<string>(MAINTENANCE_KINDS);

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function asBool(v: unknown, fallback = false): boolean {
  return typeof v === "boolean" ? v : fallback;
}

function asNum(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

function asCustom(v: unknown): Record<string, string> {
  if (!isRecord(v)) return {};
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(v)) {
    if (typeof val === "string") out[k] = val;
  }
  return out;
}

export function parseDocument(raw: unknown): ParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw) as unknown;
    } catch {
      return { ok: false, doc: emptyDocument(), errors: ["File is not valid JSON."], warnings };
    }
  }
  if (!isRecord(raw)) {
    return { ok: false, doc: emptyDocument(), errors: ["Root value must be an object."], warnings };
  }

  const version = asNum(raw.version, 0);
  if (version !== SCHEMA_VERSION) {
    if (version === 0) warnings.push("Missing schema version; treated as v2.");
    else if (version < SCHEMA_VERSION) {
      warnings.push(`Migrated from schema v${version} to v${SCHEMA_VERSION}.`);
    } else {
      warnings.push(
        `Newer schema v${version} opened as v${SCHEMA_VERSION}; unknown fields were ignored.`,
      );
    }
  }

  const metaRaw = isRecord(raw.meta) ? raw.meta : {};
  const doc: AtlasDocument = {
    version: SCHEMA_VERSION,
    meta: {
      name: asString(metaRaw.name, "Untitled atlas") || "Untitled atlas",
      createdAt: asString(metaRaw.createdAt) || new Date().toISOString(),
      updatedAt: asString(metaRaw.updatedAt) || new Date().toISOString(),
      isDemo: asBool(metaRaw.isDemo, false),
      demoRevision: asNum(metaRaw.demoRevision, 0),
    },
    floors: [],
    rooms: [],
    systems: [],
    entities: [],
    relationships: [],
    connections: [],
    maintenance: [],
    contacts: [],
  };

  if (Array.isArray(raw.floors)) {
    for (const item of raw.floors) {
      const floor = parseFloor(item, errors);
      if (floor) doc.floors.push(floor);
    }
  }
  if (Array.isArray(raw.rooms)) {
    for (const item of raw.rooms) {
      const room = parseRoom(item, errors);
      if (room) doc.rooms.push(room);
    }
  }
  if (Array.isArray(raw.systems)) {
    for (const item of raw.systems) {
      const sys = parseSystem(item, errors);
      if (sys) doc.systems.push(sys);
    }
  }
  if (Array.isArray(raw.entities)) {
    for (const item of raw.entities) {
      const ent = parseEntity(item, errors, warnings);
      if (ent) doc.entities.push(ent);
    }
  }
  if (Array.isArray(raw.relationships)) {
    for (const item of raw.relationships) {
      const rel = parseRelationship(item, errors, warnings);
      if (rel) doc.relationships.push(rel);
    }
  }
  if (Array.isArray(raw.connections)) {
    for (const item of raw.connections) {
      const c = parseConnection(item, errors, warnings);
      if (c) doc.connections.push(c);
    }
  }
  if (Array.isArray(raw.maintenance)) {
    for (const item of raw.maintenance) {
      const m = parseMaintenance(item, errors, warnings);
      if (m) doc.maintenance.push(m);
    }
  }
  if (Array.isArray(raw.contacts)) {
    for (const item of raw.contacts) {
      const c = parseContact(item, errors);
      if (c) doc.contacts.push(c);
    }
  }

  const dups = duplicateIds(doc);
  if (dups.length) {
    warnings.push(`Duplicate IDs were regenerated: ${dups.join(", ")}`);
    rekeyDuplicates(doc);
  }

  const pruned = pruneDangling(doc);
  const lostRel = doc.relationships.length - pruned.relationships.length;
  const lostCab = doc.connections.length - pruned.connections.length;
  if (lostRel || lostCab) {
    warnings.push(
      `Dropped ${lostRel} dangling relationship(s) and ${lostCab} dangling cable(s).`,
    );
  }

  return { ok: errors.length === 0, doc: pruned, errors, warnings };
}

function parseFloor(item: unknown, errors: string[]): Floor | null {
  if (!isRecord(item)) {
    errors.push("Floor entry is not an object.");
    return null;
  }
  const name = asString(item.name);
  if (!name) {
    errors.push("Floor is missing a name.");
    return null;
  }
  return {
    id: asString(item.id) || uid("floor"),
    name,
    notes: asString(item.notes),
    order: asNum(item.order, 0),
  };
}

function parseContact(item: unknown, errors: string[]): Contact | null {
  if (!isRecord(item)) {
    errors.push("Contact entry is not an object.");
    return null;
  }
  const name = asString(item.name);
  if (!name) {
    errors.push("Contact is missing a name.");
    return null;
  }
  return {
    id: asString(item.id) || uid("who"),
    name,
    role: asString(item.role),
    phone: asString(item.phone),
    notes: asString(item.notes),
  };
}

function parseRoom(item: unknown, errors: string[]): Room | null {
  if (!isRecord(item)) {
    errors.push("Room entry is not an object.");
    return null;
  }
  const name = asString(item.name);
  if (!name) {
    errors.push("Room is missing a name.");
    return null;
  }
  return {
    id: asString(item.id) || uid("room"),
    name,
    notes: asString(item.notes),
    floorId: item.floorId === null || item.floorId === undefined ? null : asString(item.floorId) || null,
  };
}

function parseSystem(item: unknown, errors: string[]): SystemRecord | null {
  if (!isRecord(item)) {
    errors.push("System entry is not an object.");
    return null;
  }
  const name = asString(item.name);
  if (!name) {
    errors.push("System is missing a name.");
    return null;
  }
  return { id: asString(item.id) || uid("sys"), name, notes: asString(item.notes) };
}

function parseEntity(item: unknown, errors: string[], warnings: string[]): Entity | null {
  if (!isRecord(item)) {
    errors.push("Entity entry is not an object.");
    return null;
  }
  const name = asString(item.name);
  if (!name) {
    errors.push("Entity is missing a name.");
    return null;
  }
  let category = asString(item.category, "device");
  if (!catSet.has(category)) {
    warnings.push(`Unknown category "${category}" on ${name}; stored as custom.`);
    category = "custom";
  }
  let status = asString(item.status, "ok");
  if (!statusSet.has(status)) {
    warnings.push(`Unknown status "${status}" on ${name}; stored as unknown.`);
    status = "unknown";
  }
  const posRaw = isRecord(item.position) ? item.position : {};
  const purchaseRaw = isRecord(item.purchase) ? item.purchase : {};
  const purchase: PurchaseInfo = {
    ...emptyPurchase(),
    date: asString(purchaseRaw.date),
    price: asString(purchaseRaw.price),
    vendor: asString(purchaseRaw.vendor),
    warrantyUntil: asString(purchaseRaw.warrantyUntil),
  };
  return {
    id: asString(item.id) || uid("ent"),
    name,
    category: category as EntityCategory,
    roomId: item.roomId === null || item.roomId === undefined ? null : asString(item.roomId) || null,
    systemIds: asStringArray(item.systemIds),
    status: status as EntityStatus,
    notes: asString(item.notes),
    manufacturer: asString(item.manufacturer),
    model: asString(item.model),
    serial: asString(item.serial),
    tags: asStringArray(item.tags),
    imageDataUrl: asString(item.imageDataUrl),
    purchase,
    custom: asCustom(item.custom),
    label: asString(item.label),
    position: { x: asNum(posRaw.x), y: asNum(posRaw.y) },
    critical: asBool(item.critical, false),
    nextService: asString(item.nextService),
    playbook: asString(item.playbook),
    spareForId:
      item.spareForId === null || item.spareForId === undefined
        ? null
        : asString(item.spareForId) || null,
  };
}

function parseRelationship(
  item: unknown,
  errors: string[],
  warnings: string[],
): Relationship | null {
  if (!isRecord(item)) {
    errors.push("Relationship entry is not an object.");
    return null;
  }
  const fromId = asString(item.fromId);
  const toId = asString(item.toId);
  if (!fromId || !toId) {
    errors.push("Relationship is missing endpoints.");
    return null;
  }
  let type = asString(item.type, "custom");
  if (!relSet.has(type)) {
    warnings.push(`Unknown relation type "${type}"; stored as custom.`);
    type = "custom";
  }
  return {
    id: asString(item.id) || uid("rel"),
    fromId,
    toId,
    type: type as RelationType,
    notes: asString(item.notes),
    customLabel: asString(item.customLabel),
    carriesFailure: asBool(item.carriesFailure, false),
  };
}

function parseConnection(
  item: unknown,
  errors: string[],
  warnings: string[],
): Connection | null {
  if (!isRecord(item)) {
    errors.push("Connection entry is not an object.");
    return null;
  }
  const fromId = asString(item.fromId);
  const toId = asString(item.toId);
  if (!fromId || !toId) {
    errors.push("Connection is missing endpoints.");
    return null;
  }
  let cableType = asString(item.cableType, "custom");
  if (!cableSet.has(cableType)) {
    warnings.push(`Unknown cable type "${cableType}"; stored as custom.`);
    cableType = "custom";
  }
  return {
    id: asString(item.id) || uid("cab"),
    cableType: cableType as CableType,
    fromId,
    toId,
    fromPort: asString(item.fromPort),
    toPort: asString(item.toPort),
    label: asString(item.label),
    length: asString(item.length),
    notes: asString(item.notes),
    active: asBool(item.active, true),
    spare: asBool(item.spare, false),
  };
}

function parseMaintenance(
  item: unknown,
  errors: string[],
  warnings: string[],
): MaintenanceEvent | null {
  if (!isRecord(item)) {
    errors.push("Maintenance entry is not an object.");
    return null;
  }
  const entityId = asString(item.entityId);
  if (!entityId) {
    errors.push("Maintenance event is missing entityId.");
    return null;
  }
  let kind = asString(item.kind, "custom");
  if (!maintSet.has(kind)) {
    warnings.push(`Unknown maintenance kind "${kind}"; stored as custom.`);
    kind = "custom";
  }
  return {
    id: asString(item.id) || uid("mnt"),
    entityId,
    kind: kind as MaintenanceKind,
    date: asString(item.date),
    notes: asString(item.notes),
  };
}

function rekeyDuplicates(doc: AtlasDocument): void {
  const seen = new Set<string>();
  const rename = (id: string): string => {
    if (!seen.has(id)) {
      seen.add(id);
      return id;
    }
    const next = uid("fix");
    seen.add(next);
    return next;
  };
  doc.floors = doc.floors.map((r) => ({ ...r, id: rename(r.id) }));
  doc.rooms = doc.rooms.map((r) => ({ ...r, id: rename(r.id) }));
  doc.systems = doc.systems.map((s) => ({ ...s, id: rename(s.id) }));
  doc.entities = doc.entities.map((e) => ({ ...e, id: rename(e.id) }));
  doc.relationships = doc.relationships.map((r) => ({ ...r, id: rename(r.id) }));
  doc.connections = doc.connections.map((c) => ({ ...c, id: rename(c.id) }));
  doc.maintenance = doc.maintenance.map((m) => ({ ...m, id: rename(m.id) }));
  doc.contacts = doc.contacts.map((c) => ({ ...c, id: rename(c.id) }));
}

export function migrateDocument(raw: unknown): ParseResult {
  return parseDocument(raw);
}
