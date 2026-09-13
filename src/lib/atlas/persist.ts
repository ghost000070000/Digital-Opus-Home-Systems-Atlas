import { emptyDocument, touch } from "./document.ts";
import { pruneDangling } from "./graph.ts";
import { parseDocument } from "./schema.ts";
import { DEFAULT_HIDDEN_RELATIONS } from "./catalog.ts";
import type { AtlasDocument, RelationType } from "./types.ts";

export const STORAGE_KEY = "digital-opus.home-systems-atlas.v1";
export const UI_STORAGE_KEY = "digital-opus.home-systems-atlas.ui.v1";

export function loadDocument(): { doc: AtlasDocument; warnings: string[]; existed: boolean } {
  if (typeof window === "undefined") {
    return { doc: emptyDocument(), warnings: [], existed: false };
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return { doc: emptyDocument(), warnings: [], existed: false };
  const parsed = parseDocument(raw);
  if (!parsed.ok && parsed.errors.length && parsed.doc.entities.length === 0) {
    return { doc: emptyDocument(), warnings: parsed.errors, existed: true };
  }
  return {
    doc: pruneDangling(parsed.doc),
    warnings: [...parsed.errors, ...parsed.warnings],
    existed: true,
  };
}

export function saveDocument(doc: AtlasDocument): void {
  if (typeof window === "undefined") return;
  const next = touch(pruneDangling(doc));
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function clearDocument(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export interface UiPrefs {
  camera: { x: number; y: number; zoom: number };
  collapsedRoomIds: string[];
  hiddenRelationTypes: string[];
  roomFilter: string[];
  systemFilter: string[];
  floorFilter: string[];
  quietLinks: boolean;
}

export const defaultUiPrefs = (): UiPrefs => ({
  camera: { x: 0, y: 0, zoom: 1 },
  collapsedRoomIds: [],
  hiddenRelationTypes: [...DEFAULT_HIDDEN_RELATIONS],
  roomFilter: [],
  systemFilter: [],
  floorFilter: [],
  quietLinks: true,
});

export function loadUiPrefs(): UiPrefs {
  if (typeof window === "undefined") return defaultUiPrefs();
  try {
    const raw = window.localStorage.getItem(UI_STORAGE_KEY);
    if (!raw) return defaultUiPrefs();
    const parsed = JSON.parse(raw) as Partial<UiPrefs>;
    return {
      ...defaultUiPrefs(),
      ...parsed,
      hiddenRelationTypes: Array.isArray(parsed.hiddenRelationTypes)
        ? (parsed.hiddenRelationTypes as RelationType[])
        : defaultUiPrefs().hiddenRelationTypes,
      quietLinks: parsed.quietLinks ?? true,
    };
  } catch {
    return defaultUiPrefs();
  }
}

export function saveUiPrefs(prefs: UiPrefs): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(UI_STORAGE_KEY, JSON.stringify(prefs));
}
