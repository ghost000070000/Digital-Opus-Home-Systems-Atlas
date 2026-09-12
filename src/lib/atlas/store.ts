import { create } from "zustand";
import { uid } from "../utils.ts";
import { DEFAULT_HIDDEN_RELATIONS } from "./catalog.ts";
import {
  createConnection,
  createEntity,
  createMaintenance,
  createRelationship,
  createRoom,
  createSystem,
  emptyDocument,
  nextFreePosition,
  touch,
} from "./document";
import { willowHouseDemo } from "./demo.ts";
import { pruneDangling } from "./graph.ts";
import { applyLayout, clusteredLayout, forceLayout } from "./layout.ts";
import { loadDocument, loadUiPrefs, saveDocument, saveUiPrefs } from "./persist.ts";
import { parseDocument } from "./schema.ts";
import {
  DEMO_REVISION,
  type AtlasDocument,
  type CableType,
  type Connection,
  type Entity,
  type EntityStatus,
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
  hydrate: () => void;
  setDoc: (doc: AtlasDocument) => void;
  updateDoc: (fn: (doc: AtlasDocument) => AtlasDocument) => void;
  loadDemo: () => void;
  newAtlas: (name?: string) => void;
  importJson: (raw: string) => { ok: boolean; errors: string[]; warnings: string[] };
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
  setFocusMode: (on: boolean) => void;
  setQuietLinks: (on: boolean) => void;
  setSearchOpen: (on: boolean) => void;
  setSearchQuery: (q: string) => void;
  setAddOpen: (on: boolean, kind?: "entity" | "room" | "system") => void;
  setWhatIf: (patch: Partial<WhatIfState>) => void;
  toggleWhatIfFailed: (id: string) => void;
  addRoom: (name: string) => string;
  updateRoom: (id: string, patch: Partial<Room>) => void;
  deleteRoom: (id: string) => void;
  addSystem: (name: string) => string;
  updateSystem: (id: string, patch: Partial<SystemRecord>) => void;
  deleteSystem: (id: string) => void;
  addEntity: (partial: Partial<Entity> & { name: string }) => string;
  updateEntity: (id: string, patch: Partial<Entity>) => void;
  moveEntity: (id: string, position: Vec2, persist?: boolean) => void;
  commitPositions: () => void;
  deleteEntity: (id: string) => void;
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
    quietLinks: ui.quietLinks,
  });
}

let cameraTimer: ReturnType<typeof setTimeout> | null = null;

export const useAtlas = create<AtlasState>((set, get) => ({
  hydrated: false,
  doc: emptyDocument(),
  ui: defaultUi(),
  lastNotice: null,

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
        quietLinks: prefs.quietLinks,
        fitNonce: 1,
      },
    });
  },

  setDoc: (doc) => {
    const next = touch(pruneDangling(doc));
    saveDocument(next);
    set({ doc: next });
  },

  updateDoc: (fn) => {
    const next = touch(pruneDangling(fn(get().doc)));
    saveDocument(next);
    set({ doc: next });
  },

  loadDemo: () => {
    const doc = willowHouseDemo();
    saveDocument(doc);
    set({
      doc,
      ui: {
        ...get().ui,
        selectedEntityId: null,
        selectedRelationId: null,
        whatIf: defaultWhatIf(),
        hiddenRelationTypes: [...DEFAULT_HIDDEN_RELATIONS],
        collapsedRoomIds: [],
        roomFilter: [],
        systemFilter: [],
        fitNonce: get().ui.fitNonce + 1,
      },
    });
  },

  newAtlas: (name) => {
    const doc = emptyDocument(name ?? "Untitled atlas");
    saveDocument(doc);
    set({
      doc,
      ui: {
        ...get().ui,
        selectedEntityId: null,
        selectedRelationId: null,
        whatIf: defaultWhatIf(),
        collapsedRoomIds: [],
        roomFilter: [],
        systemFilter: [],
        fitNonce: get().ui.fitNonce + 1,
      },
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
      lastNotice: parsed.warnings[0] ?? null,
      ui: { ...get().ui, selectedEntityId: null, fitNonce: get().ui.fitNonce + 1 },
    });
    return { ok: true, errors: parsed.errors, warnings: parsed.warnings };
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

  addRoom: (name) => {
    const room = createRoom({ name });
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
