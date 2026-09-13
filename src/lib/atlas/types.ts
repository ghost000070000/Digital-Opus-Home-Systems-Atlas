export const SCHEMA_VERSION = 2 as const;

/** Bump when the bundled Willow House demo layout or contents change. */
export const DEMO_REVISION = 5 as const;

export const ENTITY_CATEGORIES = [
  "device",
  "appliance",
  "component",
  "service",
  "cable",
  "power-source",
  "battery",
  "network-endpoint",
  "accessory",
  "storage",
  "sensor",
  "controller",
  "furniture",
  "custom",
] as const;

export type EntityCategory = (typeof ENTITY_CATEGORIES)[number];

export const ENTITY_STATUSES = [
  "ok",
  "degraded",
  "failed",
  "offline",
  "spare",
  "unknown",
] as const;

export type EntityStatus = (typeof ENTITY_STATUSES)[number];

export const RELATION_TYPES = [
  "powered-by",
  "connected-to",
  "feeds",
  "controlled-by",
  "contains",
  "installed-in",
  "mounted-on",
  "backs-up",
  "depends-on",
  "provides-signal-to",
  "provides-data-to",
  "charges",
  "cools",
  "stores-data-for",
  "routes-through",
  "protects",
  "custom",
] as const;

export type RelationType = (typeof RELATION_TYPES)[number];

export const CABLE_TYPES = [
  "ethernet",
  "hdmi",
  "displayport",
  "usb-c",
  "usb-a",
  "audio",
  "power",
  "coax",
  "fiber",
  "poe",
  "thunderbolt",
  "custom",
] as const;

export type CableType = (typeof CABLE_TYPES)[number];

export const MAINTENANCE_KINDS = [
  "cleaned",
  "replaced",
  "battery-changed",
  "firmware-updated",
  "cable-replaced",
  "relocated",
  "inspected",
  "custom",
] as const;

export type MaintenanceKind = (typeof MAINTENANCE_KINDS)[number];

export type ImpactKind = "hard" | "degraded" | "none";

export interface Vec2 {
  x: number;
  y: number;
}

export interface PurchaseInfo {
  date: string;
  price: string;
  vendor: string;
  warrantyUntil: string;
}

export interface Floor {
  id: string;
  name: string;
  notes: string;
  order: number;
}

export interface Contact {
  id: string;
  name: string;
  role: string;
  phone: string;
  notes: string;
}

export interface Entity {
  id: string;
  name: string;
  category: EntityCategory;
  roomId: string | null;
  systemIds: string[];
  status: EntityStatus;
  notes: string;
  manufacturer: string;
  model: string;
  serial: string;
  tags: string[];
  imageDataUrl: string;
  purchase: PurchaseInfo;
  custom: Record<string, string>;
  label: string;
  position: Vec2;
  critical: boolean;
  nextService: string;
  playbook: string;
  spareForId: string | null;
}

export interface Room {
  id: string;
  name: string;
  notes: string;
  floorId: string | null;
}

export interface SystemRecord {
  id: string;
  name: string;
  notes: string;
}

export interface Relationship {
  id: string;
  fromId: string;
  toId: string;
  type: RelationType;
  notes: string;
  customLabel: string;
  /** When true, a custom relation behaves like depends-on for failure. */
  carriesFailure: boolean;
}

export interface Connection {
  id: string;
  cableType: CableType;
  fromId: string;
  toId: string;
  fromPort: string;
  toPort: string;
  label: string;
  length: string;
  notes: string;
  active: boolean;
  spare: boolean;
}

export interface MaintenanceEvent {
  id: string;
  entityId: string;
  kind: MaintenanceKind;
  date: string;
  notes: string;
}

export interface AtlasMeta {
  name: string;
  createdAt: string;
  updatedAt: string;
  isDemo: boolean;
  demoRevision: number;
}

export interface AtlasDocument {
  version: number;
  meta: AtlasMeta;
  floors: Floor[];
  rooms: Room[];
  systems: SystemRecord[];
  entities: Entity[];
  relationships: Relationship[];
  connections: Connection[];
  maintenance: MaintenanceEvent[];
  contacts: Contact[];
}

export interface FailureImpact {
  seeds: string[];
  hard: string[];
  degraded: string[];
  unaffected: string[];
  systemsHard: string[];
  systemsDegraded: string[];
  alternatives: AlternativePath[];
  disclaimer: string;
}

export interface AlternativePath {
  failedId: string;
  alternativeId: string;
  reason: string;
}

export interface Insight {
  id: string;
  severity: "info" | "watch" | "critical";
  title: string;
  detail: string;
  entityIds: string[];
  kind:
    | "orphan"
    | "unknown-location"
    | "spof"
    | "hub"
    | "undocumented"
    | "failed-blast"
    | "isolated"
    | "cycle"
    | "dangling"
    | "spare-inactive"
    | "warranty"
    | "service-due"
    | "no-playbook"
    | "unmatched-spare";
}

export const FAILURE_DISCLAIMER =
  "This is a dependency model based only on what you recorded. It is not electrical, structural, or safety engineering advice.";
