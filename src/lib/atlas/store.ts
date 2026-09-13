import { create } from "zustand";
import { uid } from "../utils.ts";
import { DEFAULT_HIDDEN_RELATIONS } from "./catalog.ts";
import {
  createConnection,
  createContact,
  createEntity,
  createFloor,
  createMaintenance,
  createRelationship,
  createRoom,
  createSystem,
  duplicateEntityRecord,
  emptyDocument,
  nextFreePosition,
  touch,
} from "./document";
import { willowHouseDemo } from "./demo.ts";
import { pruneDangling } from "./graph.ts";
import { emptyHistory, pushHistory, redoStep, undoStep, type HistoryState } from "./history.ts";
import { applyLayout, clusteredLayout, forceLayout } from "./layout.ts";
import { loadDocument, loadUiPrefs, saveDocument, saveUiPrefs } from "./persist.ts";
import { parseDocument } from "./schema.ts";
import { loadSnapshots, makeSnapshot, saveSnapshots, type AtlasSnapshot } from "./snapshots.ts";
import { ATLAS_TEMPLATES } from "./templates.ts";
import {
  DEMO_REVISION,
  type AtlasDocument,
  type CableType,
  type Connection,
  type Contact,
  type Entity,
  type EntityStatus,
  type Floor,
  type MaintenanceEvent,
  type Relationship,
  type RelationType,
  type Room,
  type SystemRecord,
  type Vec2,
} from "./types.ts";

export interface WhatIfState {
  enabled: boolean;
  failedIds: string[];
  removedRelationIds: string[];
  unpluggedConnectionIds: string[];
  compareFailedIds: string[];
}

export interface AtlasUi {
  selectedEntityId: string | null;
  selectedRelationId: string | null;
  selectedConnectionId: string | null;
  camera: { x: number; y: number; zoom: number };
  collapsedRoomIds: string[];
  hiddenRelationTypes: RelationType[];
  roomFilter: string[];
  systemFilter: string[];
  floorFilter: string[];
  focusMode: boolean;
  quietLinks: boolean;
  searchOpen: boolean;
  searchQuery: string;
  whatIf: WhatIfState;
  addOpen: boolean;
  addKind: "entity" | "room" | "system";
  fitNonce: number;
}

const defaultWhatIf = (): WhatIfState => ({
  enabled: false,
  failedIds: [],
  removedRelationIds: [],
  unpluggedConnectionIds: [],
  compareFailedIds: [],
});

const defaultUi = (): AtlasUi => ({
  selectedEntityId: null,
  selectedRelationId: null,
  selectedConnectionId: null,
  camera: { x: 0, y: 0, zoom: 1 },
  collapsedRoomIds: [],
  hiddenRelationTypes: [...DEFAULT_HIDDEN_RELATIONS],
  roomFilter: [],
  systemFilter: [],
  floorFilter: [],
  focusMode: false,
  quietLinks: true,
  searchOpen: false,
  searchQuery: "",
  whatIf: defaultWhatIf(),
  addOpen: false,
  addKind: "entity",
  fitNonce: 0,
});

interface AtlasState {
  hydrated: boolean;
  doc: AtlasDocument;
  ui: AtlasUi;
  lastNotice: string | null;
  history: HistoryState;
  snapshots: AtlasSnapshot[];
  canUndo: boolean;
  canRedo: boolean;
  hydrate: () => void;
  setDoc: (doc: AtlasDocument) => void;
  updateDoc: (fn: (doc: AtlasDocument) => AtlasDocument) => void;
  undo: () => void;
  redo: () => void;
  loadDemo: () => void;
  newAtlas: (name?: string) => void;
  loadTemplate: (id: string) => void;
  importJson: (raw: string) => { ok: boolean; errors: string[]; warnings: string[] };
  captureSnapshot: (name: string, note?: string) => string;
  restoreSnapshot: (id: string) => void;
  deleteSnapshot: (id: string) => void;
  setCamera: (camera: AtlasUi["camera"]) => void;
  selectEntity: (id: string | null) => void;
  selectRelation: (id: string | null) => void;
  selectConnection: (id: string | null) => void;
  toggleCollapsedRoom: (id: string) => void;
  setCollapsedRooms: (ids: string[]) => void;
  toggleHiddenRelation: (type: RelationType) => void;
  setHiddenRelations: (types: RelationType[]) => void;
  setRoomFilter: (ids: string[]) => void;
  setSystemFilter: (ids: string[]) => void;
  setFloorFilter: (ids: string[]) => void;
  setFocusMode: (on: boolean) => void;
  setQuietLinks: (on: boolean) => void;
  setSearchOpen: (on: boolean) => void;
  setSearchQuery: (q: string) => void;
  setAddOpen: (on: boolean, kind?: "entity" | "room" | "system") => void;
  setWhatIf: (patch: Partial<WhatIfState>) => void;
  toggleWhatIfFailed: (id: string) => void;
  addRoom: (name: string, floorId?: string | null) => string;
  updateRoom: (id: string, patch: Partial<Room>) => void;
  deleteRoom: (id: string) => void;
  addFloor: (name: string) => string;
  updateFloor: (id: string, patch: Partial<Floor>) => void;
  deleteFloor: (id: string) => void;
  addContact: (name: string) => string;
  updateContact: (id: string, patch: Partial<Contact>) => void;
  deleteContact: (id: string) => void;
  addSystem: (name: string) => string;
  updateSystem: (id: string, patch: Partial<SystemRecord>) => void;
  deleteSystem: (id: string) => void;
  addEntity: (partial: Partial<Entity> & { name: string }) => string;
  updateEntity: (id: string, patch: Partial<Entity>) => void;
  moveEntity: (id: string, position: Vec2, persist?: boolean) => void;
  commitPositions: () => void;
  deleteEntity: (id: string) => void;
  duplicateEntity: (id: string) => string | null;
  setStatus: (id: string, status: EntityStatus) => void;
  addRelationship: (partial: {
    fromId: string;
    toId: string;
    type: RelationType;
    notes?: string;
    customLabel?: string;
  }) => string;
  updateRelationship: (id: string, patch: Partial<Relationship>) => void;
  deleteRelationship: (id: string) => void;
  addConnection: (partial: {
    fromId: string;
    toId: string;
    cableType: CableType;
    label?: string;
    fromPort?: string;
    toPort?: string;
    length?: string;
    notes?: string;
    active?: boolean;
    spare?: boolean;
  }) => string;
  updateConnection: (id: string, patch: Partial<Connection>) => void;
  deleteConnection: (id: string) => void;
  addMaintenance: (partial: Omit<MaintenanceEvent, "id"> & { id?: string }) => string;
  deleteMaintenance: (id: string) => void;
  relayout: () => void;
  renameAtlas: (name: string) => void;
}

function persistUi(ui: AtlasUi) {
  saveUiPrefs({
    camera: ui.camera,
    collapsedRoomIds: ui.collapsedRoomIds,
    hiddenRelationTypes: ui.hiddenRelationTypes,
    roomFilter: ui.roomFilter,
    systemFilter: ui.systemFilter,
    floorFilter: ui.floorFilter,
    quietLinks: ui.quietLinks,
  });
}

let cameraTimer: ReturnType<typeof setTimeout> | null = null;

function historyFlags(h: HistoryState) {
  return { canUndo: h.past.length > 0, canRedo: h.future.length > 0 };
}

function resetView(ui: AtlasUi, extra: Partial<AtlasUi> = {}): AtlasUi {
  return {
    ...ui,
    selectedEntityId: null,
    selectedRelationId: null,
    selectedConnectionId: null,
    whatIf: defaultWhatIf(),
    collapsedRoomIds: [],
    roomFilter: [],
    systemFilter: [],
    floorFilter: [],
    fitNonce: ui.fitNonce + 1,
    ...extra,
  };
}

export const useAtlas = create<AtlasState>((set, get) => ({
  hydrated: false,
  doc: emptyDocument(),
  ui: defaultUi(),
  lastNotice: null,
  history: emptyHistory(),
  snapshots: [],
  canUndo: false,
  canRedo: false,

  hydrate: () => {
    if (typeof window === "undefined") return;
    if (get().hydrated) return;
    const loaded = loadDocument();
    const prefs = loadUiPrefs();
    const empty = loaded.doc.entities.length === 0 && loaded.doc.rooms.length === 0;
    const staleDemo = loaded.doc.meta.isDemo && loaded.doc.meta.demoRevision !== DEMO_REVISION;
    const fresh = !loaded.existed || empty || staleDemo;
    const doc = fresh ? willowHouseDemo() : loaded.doc;
    if (fresh) saveDocument(doc);
    const narrow = window.innerWidth < 768;
    const collapsed = fresh && narrow ? doc.rooms.map((r) => r.id) : prefs.collapsedRoomIds;
    const hidden = fresh ? [...DEFAULT_HIDDEN_RELATIONS] : (prefs.hiddenRelationTypes as RelationType[]);
    set({
      hydrated: true,
      doc,
      lastNotice: loaded.warnings[0] ?? null,
      ui: {
        ...get().ui,
        camera: fresh ? { x: 0, y: 0, zoom: 1 } : prefs.camera,
        collapsedRoomIds: collapsed,
        hiddenRelationTypes: hidden.length ? hidden : [...DEFAULT_HIDDEN_RELATIONS],
        roomFilter: fresh ? [] : prefs.roomFilter,
        systemFilter: fresh ? [] : prefs.systemFilter,
        floorFilter: fresh ? [] : (prefs.floorFilter ?? []),
        quietLinks: prefs.quietLinks,
        fitNonce: 1,
      },
      history: emptyHistory(),
      snapshots: loadSnapshots(),
      canUndo: false,
      canRedo: false,
    });
  },

  setDoc: (doc) => {
    const before = get().doc;
    const next = touch(pruneDangling(doc));
    const history = pushHistory(get().history, before, Date.now());
    saveDocument(next);
    set({ doc: next, history, lastNotice: null, ...historyFlags(history) });
  },

  updateDoc: (fn) => {
    const before = get().doc;
    const next = touch(pruneDangling(fn(before)));
    const history = pushHistory(get().history, before, Date.now());
    saveDocument(next);
    set({ doc: next, history, ...historyFlags(history) });
  },

  undo: () => {
    const step = undoStep(get().history, get().doc);
    if (!step) return;
    saveDocument(step.doc);
    set({
      doc: step.doc,
      history: step.history,
      lastNotice: "Undid last change",
      ...historyFlags(step.history),
    });
  },

  redo: () => {
    const step = redoStep(get().history, get().doc);
    if (!step) return;
    saveDocument(step.doc);
    set({
      doc: step.doc,
      history: step.history,
      lastNotice: "Redid last change",
      ...historyFlags(step.history),
    });
  },

  loadDemo: () => {
    const doc = willowHouseDemo();
    saveDocument(doc);
    const snap = makeSnapshot(doc, "Willow House as shipped", "Bundled demo.");
    const snapshots = [snap];
    saveSnapshots(snapshots);
    set({
      doc,
      snapshots,
      history: emptyHistory(),
      lastNotice: "Loaded Willow House demo",
      canUndo: false,
      canRedo: false,
      ui: resetView(get().ui, { hiddenRelationTypes: [...DEFAULT_HIDDEN_RELATIONS] }),
    });
  },

  newAtlas: (name) => {
    const doc = emptyDocument(name ?? "Untitled atlas");
    saveDocument(doc);
    set({
      doc,
      history: emptyHistory(),
      lastNotice: "Started a blank atlas",
      canUndo: false,
      canRedo: false,
      ui: resetView(get().ui),
    });
  },

  loadTemplate: (id) => {
    const tpl = ATLAS_TEMPLATES.find((t) => t.id === id);
    if (!tpl) return;
    const built = tpl.build();
    const doc = touch({ ...built, meta: { ...built.meta, isDemo: false } });
    saveDocument(doc);
    set({
      doc,
      history: emptyHistory(),
      lastNotice: `Started from ${tpl.name}`,
      canUndo: false,
      canRedo: false,
      ui: resetView(get().ui, { hiddenRelationTypes: [...DEFAULT_HIDDEN_RELATIONS] }),
    });
  },

  importJson: (raw) => {
    const parsed = parseDocument(raw);
    if (!parsed.ok && parsed.doc.entities.length === 0) {
      return { ok: false, errors: parsed.errors, warnings: parsed.warnings };
    }
    const doc = touch({ ...parsed.doc, meta: { ...parsed.doc.meta, isDemo: false } });
    saveDocument(doc);
    set({
      doc,
      lastNotice: parsed.warnings[0] ?? "Restored from JSON",
      history: emptyHistory(),
      canUndo: false,
      canRedo: false,
      ui: { ...get().ui, selectedEntityId: null, fitNonce: get().ui.fitNonce + 1 },
    });
    return { ok: true, errors: parsed.errors, warnings: parsed.warnings };
  },

  captureSnapshot: (name, note) => {
    const snap = makeSnapshot(get().doc, name, note);
    const snapshots = [...get().snapshots, snap].slice(-16);
    saveSnapshots(snapshots);
    set({ snapshots, lastNotice: `Saved snapshot “${snap.name}”` });
    return snap.id;
  },

  restoreSnapshot: (id) => {
    const snap = get().snapshots.find((s) => s.id === id);
    if (!snap) return;
    const before = get().doc;
    const next = touch(pruneDangling(snap.doc));
    const history = pushHistory(get().history, before, Date.now());
    saveDocument(next);
    set({
      doc: next,
      history,
      lastNotice: `Restored snapshot “${snap.name}”`,
      ui: { ...get().ui, selectedEntityId: null, fitNonce: get().ui.fitNonce + 1 },
      ...historyFlags(history),
    });
  },

  deleteSnapshot: (id) => {
    const snapshots = get().snapshots.filter((s) => s.id !== id);
    saveSnapshots(snapshots);
    set({ snapshots });
  },

  setCamera: (camera) => {
    const ui = { ...get().ui, camera };
    set({ ui });
    if (cameraTimer) clearTimeout(cameraTimer);
    cameraTimer = setTimeout(() => persistUi(useAtlas.getState().ui), 280);
  },

  selectEntity: (id) =>
    set({
      ui: {
        ...get().ui,
        selectedEntityId: id,
        selectedRelationId: null,
        selectedConnectionId: null,
      },
    }),

  selectRelation: (id) =>
    set({ ui: { ...get().ui, selectedRelationId: id, selectedConnectionId: null } }),

  selectConnection: (id) =>
    set({ ui: { ...get().ui, selectedConnectionId: id, selectedRelationId: null } }),

  toggleCollapsedRoom: (id) => {
    const cur = get().ui.collapsedRoomIds;
    const collapsedRoomIds = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    const ui = { ...get().ui, collapsedRoomIds };
    persistUi(ui);
    set({ ui });
  },

  setCollapsedRooms: (ids) => {
    const ui = { ...get().ui, collapsedRoomIds: ids };
    persistUi(ui);
    set({ ui });
  },

  toggleHiddenRelation: (type) => {
    const cur = get().ui.hiddenRelationTypes;
    const hiddenRelationTypes = cur.includes(type) ? cur.filter((x) => x !== type) : [...cur, type];
    const ui = { ...get().ui, hiddenRelationTypes };
    persistUi(ui);
    set({ ui });
  },

  setHiddenRelations: (types) => {
    const ui = { ...get().ui, hiddenRelationTypes: types };
    persistUi(ui);
    set({ ui });
  },

  setRoomFilter: (ids) => {
    const ui = { ...get().ui, roomFilter: ids };
    persistUi(ui);
    set({ ui });
  },

  setSystemFilter: (ids) => {
    const ui = { ...get().ui, systemFilter: ids };
    persistUi(ui);
    set({ ui });
  },
  setFloorFilter: (ids) => {
    const ui = { ...get().ui, floorFilter: ids };
    persistUi(ui);
    set({ ui });
  },

  setFocusMode: (on) => set({ ui: { ...get().ui, focusMode: on } }),
  setQuietLinks: (on) => {
    const ui = { ...get().ui, quietLinks: on };
    persistUi(ui);
    set({ ui });
  },
  setSearchOpen: (on) => set({ ui: { ...get().ui, searchOpen: on } }),
  setSearchQuery: (q) => set({ ui: { ...get().ui, searchQuery: q } }),
  setAddOpen: (on, kind) =>
    set({
      ui: {
        ...get().ui,
        addOpen: on,
        ...(kind ? { addKind: kind } : {}),
      },
    }),
  setWhatIf: (patch) => set({ ui: { ...get().ui, whatIf: { ...get().ui.whatIf, ...patch } } }),
  toggleWhatIfFailed: (id) => {
    const cur = get().ui.whatIf.failedIds;
    const failedIds = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    set({ ui: { ...get().ui, whatIf: { ...get().ui.whatIf, failedIds, enabled: true } } });
  },

  addRoom: (name, floorId) => {
    const room = createRoom({ name, floorId: floorId ?? null });
    get().updateDoc((d) => ({ ...d, rooms: [...d.rooms, room] }));
    return room.id;
  },
  updateRoom: (id, patch) =>
    get().updateDoc((d) => ({
      ...d,
      rooms: d.rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    })),
  deleteRoom: (id) =>
    get().updateDoc((d) => ({
      ...d,
      rooms: d.rooms.filter((r) => r.id !== id),
      entities: d.entities.map((e) => (e.roomId === id ? { ...e, roomId: null } : e)),
    })),

  addFloor: (name) => {
    const floor = createFloor({ name, order: get().doc.floors.length });
    get().updateDoc((d) => ({ ...d, floors: [...d.floors, floor] }));
    return floor.id;
  },
  updateFloor: (id, patch) =>
    get().updateDoc((d) => ({
      ...d,
      floors: d.floors.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    })),
  deleteFloor: (id) =>
    get().updateDoc((d) => ({
      ...d,
      floors: d.floors.filter((f) => f.id !== id),
      rooms: d.rooms.map((r) => (r.floorId === id ? { ...r, floorId: null } : r)),
    })),

  addContact: (name) => {
    const c = createContact({ name });
    get().updateDoc((d) => ({ ...d, contacts: [...d.contacts, c] }));
    return c.id;
  },
  updateContact: (id, patch) =>
    get().updateDoc((d) => ({
      ...d,
      contacts: d.contacts.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })),
  deleteContact: (id) =>
    get().updateDoc((d) => ({
      ...d,
      contacts: d.contacts.filter((c) => c.id !== id),
    })),

  addSystem: (name) => {
    const sys = createSystem({ name });
    get().updateDoc((d) => ({ ...d, systems: [...d.systems, sys] }));
    return sys.id;
  },
  updateSystem: (id, patch) =>
    get().updateDoc((d) => ({
      ...d,
      systems: d.systems.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    })),
  deleteSystem: (id) =>
    get().updateDoc((d) => ({
      ...d,
      systems: d.systems.filter((s) => s.id !== id),
      entities: d.entities.map((e) => ({
        ...e,
        systemIds: e.systemIds.filter((x) => x !== id),
      })),
    })),

  addEntity: (partial) => {
    const doc = get().doc;
    const position = partial.position ?? nextFreePosition(doc, partial.roomId ?? null);
    const entity = createEntity({ ...partial, position });
    get().updateDoc((d) => ({ ...d, entities: [...d.entities, entity] }));
    get().selectEntity(entity.id);
    return entity.id;
  },
  updateEntity: (id, patch) =>
    get().updateDoc((d) => ({
      ...d,
      entities: d.entities.map((e) => (e.id === id ? { ...e, ...patch, id: e.id } : e)),
    })),
  moveEntity: (id, position, persist = true) => {
    const doc = {
      ...get().doc,
      entities: get().doc.entities.map((e) => (e.id === id ? { ...e, position } : e)),
    };
    if (persist) saveDocument(touch(doc));
    set({ doc });
  },
  commitPositions: () => {
    saveDocument(touch(get().doc));
  },
  deleteEntity: (id) => {
    get().updateDoc((d) => ({
      ...d,
      entities: d.entities.filter((e) => e.id !== id),
    }));
    if (get().ui.selectedEntityId === id) get().selectEntity(null);
  },
  duplicateEntity: (id) => {
    const copy = duplicateEntityRecord(get().doc, id);
    if (!copy) return null;
    get().updateDoc((d) => ({ ...d, entities: [...d.entities, copy] }));
    get().selectEntity(copy.id);
    return copy.id;
  },
  setStatus: (id, status) => get().updateEntity(id, { status }),

  addRelationship: (partial) => {
    const rel = createRelationship(partial);
    get().updateDoc((d) => ({ ...d, relationships: [...d.relationships, rel] }));
    return rel.id;
  },
  updateRelationship: (id, patch) =>
    get().updateDoc((d) => ({
      ...d,
      relationships: d.relationships.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    })),
  deleteRelationship: (id) =>
    get().updateDoc((d) => ({
      ...d,
      relationships: d.relationships.filter((r) => r.id !== id),
    })),

  addConnection: (partial) => {
    const c = createConnection(partial);
    get().updateDoc((d) => ({ ...d, connections: [...d.connections, c] }));
    return c.id;
  },
  updateConnection: (id, patch) =>
    get().updateDoc((d) => ({
      ...d,
      connections: d.connections.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })),
  deleteConnection: (id) =>
    get().updateDoc((d) => ({
      ...d,
      connections: d.connections.filter((c) => c.id !== id),
    })),

  addMaintenance: (partial) => {
    const m = createMaintenance({ ...partial, id: partial.id ?? uid("mnt") });
    get().updateDoc((d) => ({ ...d, maintenance: [...d.maintenance, m] }));
    return m.id;
  },
  deleteMaintenance: (id) =>
    get().updateDoc((d) => ({
      ...d,
      maintenance: d.maintenance.filter((m) => m.id !== id),
    })),

  relayout: () => {
    const clustered = clusteredLayout(get().doc, { seed: 7 });
    const positioned = applyLayout(get().doc, clustered);
    const positions = forceLayout(positioned, { iterations: 80, seed: 7 });
    get().setDoc(applyLayout(positioned, positions));
    set({ ui: { ...get().ui, fitNonce: get().ui.fitNonce + 1 } });
  },

  renameAtlas: (name) =>
    get().updateDoc((d) => ({ ...d, meta: { ...d.meta, name, isDemo: false } })),
}));
