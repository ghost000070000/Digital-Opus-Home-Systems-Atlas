import { cloneDocument } from "./document.ts";
import type { AtlasDocument } from "./types.ts";

export const UNDO_CAP = 40;
export const COALESCE_MS = 450;

export interface HistoryState {
  past: AtlasDocument[];
  future: AtlasDocument[];
  lastAt: number;
}

export function emptyHistory(): HistoryState {
  return { past: [], future: [], lastAt: 0 };
}

export function pushHistory(h: HistoryState, before: AtlasDocument, now: number): HistoryState {
  if (now - h.lastAt < COALESCE_MS && h.past.length > 0) {
    return { ...h, lastAt: now, future: [] };
  }
  const past = [...h.past, cloneDocument(before)];
  if (past.length > UNDO_CAP) past.shift();
  return { past, future: [], lastAt: now };
}

export function undoStep(
  h: HistoryState,
  current: AtlasDocument,
): { history: HistoryState; doc: AtlasDocument } | null {
  if (h.past.length === 0) return null;
  const past = h.past.slice(0, -1);
  const prev = h.past[h.past.length - 1]!;
  return {
    history: { past, future: [...h.future, cloneDocument(current)], lastAt: 0 },
    doc: prev,
  };
}

export function redoStep(
  h: HistoryState,
  current: AtlasDocument,
): { history: HistoryState; doc: AtlasDocument } | null {
  if (h.future.length === 0) return null;
  const next = h.future[h.future.length - 1]!;
  const future = h.future.slice(0, -1);
  return {
    history: { past: [...h.past, cloneDocument(current)], future, lastAt: 0 },
    doc: next,
  };
}