import type { ImpactKind, RelationType } from "./types.ts";

export interface RelationMeta {
  type: RelationType;
  label: string;
  reverse: string;
  group: "power" | "signal" | "data" | "physical" | "control" | "protection" | "custom";
  /** If the source fails, impact on the target. */
  sourceFailsTarget: ImpactKind;
  /** If the target fails, impact on the source. */
  targetFailsSource: ImpactKind;
  hint: string;
}

export const RELATION_META: Record<RelationType, RelationMeta> = {
  "powered-by": {
    type: "powered-by",
    label: "powered by",
    reverse: "powers",
    group: "power",
    sourceFailsTarget: "none",
    targetFailsSource: "hard",
    hint: "This item draws power from the other.",
  },
  "connected-to": {
    type: "connected-to",
    label: "connected to",
    reverse: "connected to",
    group: "signal",
    sourceFailsTarget: "degraded",
    targetFailsSource: "degraded",
    hint: "A general link. Prefer a more specific type when you know it.",
  },
  feeds: {
    type: "feeds",
    label: "feeds",
    reverse: "fed by",
    group: "signal",
    sourceFailsTarget: "hard",
    targetFailsSource: "none",
    hint: "Source supplies a required feed to the target.",
  },
  "controlled-by": {
    type: "controlled-by",
    label: "controlled by",
    reverse: "controls",
    group: "control",
    sourceFailsTarget: "none",
    targetFailsSource: "degraded",
    hint: "Source is commanded by the target (thermostat, hub, switch).",
  },
  contains: {
    type: "contains",
    label: "contains",
    reverse: "contained in",
    group: "physical",
    sourceFailsTarget: "degraded",
    targetFailsSource: "none",
    hint: "Physical enclosure or rack membership. Contents may keep working.",
  },
  "installed-in": {
    type: "installed-in",
    label: "installed in",
    reverse: "hosts",
    group: "physical",
    sourceFailsTarget: "none",
    targetFailsSource: "degraded",
    hint: "Component lives inside another item.",
  },
  "mounted-on": {
    type: "mounted-on",
    label: "mounted on",
    reverse: "holds",
    group: "physical",
    sourceFailsTarget: "none",
    targetFailsSource: "degraded",
    hint: "Physically attached to a surface or mount.",
  },
  "backs-up": {
    type: "backs-up",
    label: "backs up",
    reverse: "backed up by",
    group: "data",
    sourceFailsTarget: "degraded",
    targetFailsSource: "none",
    hint: "Source is a backup of the target. Target keeps working if backup fails.",
  },
  "depends-on": {
    type: "depends-on",
    label: "depends on",
    reverse: "required by",
    group: "custom",
    sourceFailsTarget: "none",
    targetFailsSource: "hard",
    hint: "Explicit required dependency.",
  },
  "provides-signal-to": {
    type: "provides-signal-to",
    label: "provides signal to",
    reverse: "receives signal from",
    group: "signal",
    sourceFailsTarget: "hard",
    targetFailsSource: "none",
    hint: "HDMI, DisplayPort, audio, or similar signal path.",
  },
  "provides-data-to": {
    type: "provides-data-to",
    label: "provides data to",
    reverse: "receives data from",
    group: "data",
    sourceFailsTarget: "hard",
    targetFailsSource: "none",
    hint: "Sensor, camera, or service data path.",
  },
  charges: {
    type: "charges",
    label: "charges",
    reverse: "charged by",
    group: "power",
    sourceFailsTarget: "degraded",
    targetFailsSource: "none",
    hint: "Source charges the target.",
  },
  cools: {
    type: "cools",
    label: "cools",
    reverse: "cooled by",
    group: "protection",
    sourceFailsTarget: "degraded",
    targetFailsSource: "none",
    hint: "Cooling dependency. Failure is usually degraded, not instant stop.",
  },
  "stores-data-for": {
    type: "stores-data-for",
    label: "stores data for",
    reverse: "stores data on",
    group: "data",
    sourceFailsTarget: "degraded",
    targetFailsSource: "none",
    hint: "Storage or NVR role.",
  },
  "routes-through": {
    type: "routes-through",
    label: "routes through",
    reverse: "routes",
    group: "signal",
    sourceFailsTarget: "none",
    targetFailsSource: "hard",
    hint: "Path depends on a switch, patch, or hop.",
  },
  protects: {
    type: "protects",
    label: "protects",
    reverse: "protected by",
    group: "protection",
    sourceFailsTarget: "degraded",
    targetFailsSource: "none",
    hint: "UPS, surge, or similar. Loss of protection is degraded, not a hard fail.",
  },
  custom: {
    type: "custom",
    label: "related to",
    reverse: "related to",
    group: "custom",
    sourceFailsTarget: "none",
    targetFailsSource: "none",
    hint: "No automatic failure flow unless you turn on “carries failure” on the link.",
  },
};

export const RELATION_GROUPS: Array<RelationMeta["group"]> = [
  "power",
  "signal",
  "data",
  "physical",
  "control",
  "protection",
  "custom",
];

export function relationLabel(type: RelationType, customLabel?: string): string {
  if (type === "custom" && customLabel?.trim()) return customLabel.trim();
  return RELATION_META[type].label;
}
