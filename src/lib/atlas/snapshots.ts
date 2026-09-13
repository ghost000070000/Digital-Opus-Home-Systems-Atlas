import { uid } from "../utils.ts";
import { cloneDocument } from "./document.ts";
import { parseDocument } from "./schema.ts";
import type { AtlasDocument } from "./types.ts";

export const SNAPSHOTS_KEY = "digital-opus.home-systems-atlas.snapshots.v1";
export const SNAPSHOT_CAP = 16;

export interface AtlasSnapshot {
  id: string;
  name: string;
  createdAt: string;
  note: string;
  entityCount: number;
  roomCount: number;
  relationshipCount: number;
  doc: AtlasDocument;
}

export function stripHeavy(doc: AtlasDocument): AtlasDocument {
  const next = cloneDocument(doc);
  next.entities = next.entities.map((e) => ({ ...e, imageDataUrl: "" }));
  next.meta = { ...next.meta, isDemo: false };
  return next;
}

export function makeSnapshot(doc: AtlasDocument, name: string, note = ""): AtlasSnapshot {
  const slim = stripHeavy(doc);
  return {
    id: uid("snap"),
    name: name.trim() || "Untitled snapshot",
    createdAt: new Date().toISOString(),
    note,
    entityCount: slim.entities.length,
    roomCount: slim.rooms.length,
    relationshipCount: slim.relationships.length,
    doc: slim,
  };
}

export function loadSnapshots(): AtlasSnapshot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SNAPSHOTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: AtlasSnapshot[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const rec = item as Record<string, unknown>;
      const parsedDoc = parseDocument(rec.doc);
      if (!parsedDoc.doc.entities.length && parsedDoc.errors.length) continue;
      out.push({
        id: typeof rec.id === "string" ? rec.id : uid("snap"),
        name: typeof rec.name === "string" ? rec.name : "Snapshot",
        createdAt: typeof rec.createdAt === "string" ? rec.createdAt : new Date().toISOString(),
        note: typeof rec.note === "string" ? rec.note : "",
        entityCount: parsedDoc.doc.entities.length,
        roomCount: parsedDoc.doc.rooms.length,
        relationshipCount: parsedDoc.doc.relationships.length,
        doc: parsedDoc.doc,
      });
    }
    return out;
  } catch {
    return [];
  }
}

export function saveSnapshots(list: AtlasSnapshot[]): void {
  if (typeof window === "undefined") return;
  const trimmed = list.slice(-SNAPSHOT_CAP);
  window.localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(trimmed));
}