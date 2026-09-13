import type { CableType, EntityCategory, EntityStatus, MaintenanceKind, RelationType } from "./types.ts";

export const CATEGORY_LABEL: Record<EntityCategory, string> = {
  device: "Device",
  appliance: "Appliance",
  component: "Component",
  service: "Service",
  cable: "Cable",
  "power-source": "Power source",
  battery: "Battery / UPS",
  "network-endpoint": "Network endpoint",
  accessory: "Accessory",
  storage: "Storage",
  sensor: "Sensor",
  controller: "Controller",
  furniture: "Furniture / equipment",
  custom: "Custom",
};

export const STATUS_LABEL: Record<EntityStatus, string> = {
  ok: "Working",
  degraded: "Degraded",
  failed: "Failed",
  offline: "Offline",
  spare: "Spare",
  unknown: "Unknown",
};

export const CABLE_LABEL: Record<CableType, string> = {
  ethernet: "Ethernet",
  hdmi: "HDMI",
  displayport: "DisplayPort",
  "usb-c": "USB-C",
  "usb-a": "USB-A",
  audio: "Audio",
  power: "Power",
  coax: "Coax",
  fiber: "Fiber",
  poe: "PoE",
  thunderbolt: "Thunderbolt",
  custom: "Custom",
};

export const MAINTENANCE_LABEL: Record<MaintenanceKind, string> = {
  cleaned: "Cleaned",
  replaced: "Replaced",
  "battery-changed": "Battery changed",
  "firmware-updated": "Firmware updated",
  "cable-replaced": "Cable replaced",
  relocated: "Relocated",
  inspected: "Inspected",
  custom: "Note",
};

export const RELATION_TYPE_ORDER: RelationType[] = [
  "powered-by",
  "protects",
  "charges",
  "depends-on",
  "connected-to",
  "feeds",
  "provides-signal-to",
  "provides-data-to",
  "routes-through",
  "stores-data-for",
  "backs-up",
  "controlled-by",
  "contains",
  "installed-in",
  "mounted-on",
  "cools",
  "custom",
];

/** Physical enclosure links already shown by room grouping — hide them on the atlas. */
export const DEFAULT_HIDDEN_RELATIONS: RelationType[] = [
  "contains",
  "installed-in",
  "mounted-on",
  "protects",
  "cools",
];

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}
