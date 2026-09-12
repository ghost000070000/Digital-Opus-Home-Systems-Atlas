import { relationLabel } from "./relations.ts";
import type { AtlasDocument } from "./types.ts";

export interface SearchHit {
  id: string;
  kind: "entity" | "room" | "system" | "relationship" | "connection";
  title: string;
  subtitle: string;
  entityIds: string[];
}

export function searchAtlas(doc: AtlasDocument, query: string, limit = 40): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const hits: SearchHit[] = [];
  const rooms = new Map(doc.rooms.map((r) => [r.id, r]));
  const entities = new Map(doc.entities.map((e) => [e.id, e]));

  const hay = (...parts: Array<string | string[] | undefined>) =>
    parts
      .flat()
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

  for (const e of doc.entities) {
    const room = e.roomId ? rooms.get(e.roomId)?.name : "";
    const blob = hay(
      e.name,
      e.category,
      e.status,
      e.notes,
      e.manufacturer,
      e.model,
      e.serial,
      e.label,
      e.tags,
      room,
      Object.values(e.custom),
      e.purchase.vendor,
    );
    if (blob.includes(q)) {
      hits.push({
        id: e.id,
        kind: "entity",
        title: e.name,
        subtitle: [e.category.replace("-", " "), room, e.model].filter(Boolean).join(" · "),
        entityIds: [e.id],
      });
    }
  }

  for (const r of doc.rooms) {
    if (hay(r.name, r.notes).includes(q)) {
      hits.push({
        id: r.id,
        kind: "room",
        title: r.name,
        subtitle: "Room",
        entityIds: doc.entities.filter((e) => e.roomId === r.id).map((e) => e.id),
      });
    }
  }

  for (const s of doc.systems) {
    if (hay(s.name, s.notes).includes(q)) {
      hits.push({
        id: s.id,
        kind: "system",
        title: s.name,
        subtitle: "System",
        entityIds: doc.entities.filter((e) => e.systemIds.includes(s.id)).map((e) => e.id),
      });
    }
  }

  for (const rel of doc.relationships) {
    const a = entities.get(rel.fromId)?.name ?? rel.fromId;
    const b = entities.get(rel.toId)?.name ?? rel.toId;
    const label = relationLabel(rel.type, rel.customLabel);
    if (hay(a, b, label, rel.type, rel.notes, rel.customLabel).includes(q)) {
      hits.push({
        id: rel.id,
        kind: "relationship",
        title: `${a} ${label} ${b}`,
        subtitle: rel.type,
        entityIds: [rel.fromId, rel.toId],
      });
    }
  }

  for (const c of doc.connections) {
    const a = entities.get(c.fromId)?.name ?? c.fromId;
    const b = entities.get(c.toId)?.name ?? c.toId;
    if (
      hay(a, b, c.cableType, c.label, c.fromPort, c.toPort, c.notes, c.length).includes(q)
    ) {
      hits.push({
        id: c.id,
        kind: "connection",
        title: c.label || `${c.cableType} ${a}–${b}`,
        subtitle: `${c.cableType}${c.fromPort ? ` · ${c.fromPort}` : ""}`,
        entityIds: [c.fromId, c.toId],
      });
    }
  }

  return hits.slice(0, limit);
}
