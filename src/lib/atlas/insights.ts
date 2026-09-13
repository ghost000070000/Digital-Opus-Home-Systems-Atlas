import { entityMap } from "./document.ts";
import { analyzeFailure } from "./failure.ts";
import {
  connectedComponents,
  danglingConnections,
  danglingRelationships,
  degreeMap,
  findCycles,
  orphans,
} from "./graph.ts";
import { daysUntil } from "./care.ts";
import type { AtlasDocument, Insight } from "./types.ts";

export function computeInsights(doc: AtlasDocument): Insight[] {
  const entities = entityMap(doc);
  const nameOf = (id: string) => entities.get(id)?.name ?? id;
  const insights: Insight[] = [];

  const orphanIds = orphans(doc);
  for (const id of orphanIds) {
    insights.push({
      id: `orphan:${id}`,
      severity: "watch",
      kind: "orphan",
      title: `${nameOf(id)} has no links`,
      detail: "Nothing connects this item to the rest of the atlas. Add a relationship or a cable, or remove it.",
      entityIds: [id],
    });
  }

  for (const e of doc.entities) {
    if (!e.roomId) {
      insights.push({
        id: `loc:${e.id}`,
        severity: "info",
        kind: "unknown-location",
        title: `${e.name} has no room`,
        detail: "Give it a location so room views and hulls stay complete.",
        entityIds: [e.id],
      });
    }
  }

  const deg = degreeMap(doc);
  const degrees = [...deg.values()];
  const avg = degrees.length ? degrees.reduce((a, b) => a + b, 0) / degrees.length : 0;
  const hubThreshold = Math.max(5, Math.ceil(avg * 2.5));
  for (const [id, d] of deg) {
    if (d >= hubThreshold) {
      insights.push({
        id: `hub:${id}`,
        severity: "info",
        kind: "hub",
        title: `${nameOf(id)} is a hub (${d} links)`,
        detail: "Heavily connected items are useful landmarks and common points of failure.",
        entityIds: [id],
      });
    }
  }

  for (const e of doc.entities) {
    if (e.status === "failed" || e.status === "offline") continue;
    const blast = analyzeFailure(doc, { failedIds: [e.id] });
    const hardCount = blast.hard.length;
    const sysCount = blast.systemsHard.length;
    if (hardCount >= 4 || sysCount >= 2) {
      insights.push({
        id: `spof:${e.id}`,
        severity: hardCount >= 8 || sysCount >= 3 ? "critical" : "watch",
        kind: "spof",
        title: `${e.name} is a single point of failure`,
        detail: `If this item fails, ${hardCount} other item${hardCount === 1 ? "" : "s"} are modeled as hard-affected${sysCount ? ` across ${sysCount} system${sysCount === 1 ? "" : "s"}` : ""}. This is based only on recorded dependencies.`,
        entityIds: [e.id, ...blast.hard.slice(0, 8)],
      });
    }
  }

  const failed = doc.entities.filter((e) => e.status === "failed" || e.status === "offline");
  for (const e of failed) {
    const blast = analyzeFailure(doc, { failedIds: [e.id] });
    if (blast.hard.length + blast.degraded.length + blast.systemsHard.length > 0) {
      insights.push({
        id: `failed:${e.id}`,
        severity: "critical",
        kind: "failed-blast",
        title: `${e.name} is marked ${e.status}`,
        detail: `${blast.hard.length} hard-affected, ${blast.degraded.length} degraded, ${blast.systemsHard.length} system${blast.systemsHard.length === 1 ? "" : "s"} modeled as disrupted.`,
        entityIds: [e.id, ...blast.hard, ...blast.degraded],
      });
    }
  }

  const comps = connectedComponents(doc);
  if (comps.length > 1 && comps[0] && comps[0].length >= 3) {
    for (const comp of comps.slice(1)) {
      if (comp.length === 0) continue;
      const title =
        comp.length === 1
          ? `${nameOf(comp[0]!)} sits in its own subgraph`
          : `Isolated group of ${comp.length} items`;
      insights.push({
        id: `iso:${comp.slice().sort().join(",")}`,
        severity: "info",
        kind: "isolated",
        title,
        detail: "This cluster does not connect to the rest of the atlas.",
        entityIds: comp,
      });
    }
  }

  for (const cycle of findCycles(doc)) {
    insights.push({
      id: `cycle:${cycle.slice().sort().join(",")}`,
      severity: "info",
      kind: "cycle",
      title: `Cycle among ${cycle.map(nameOf).join(", ")}`,
      detail: "Dependency cycles are allowed. Traversal still terminates; inspect if the loop is accidental.",
      entityIds: cycle,
    });
  }

  const dangR = danglingRelationships(doc);
  const dangC = danglingConnections(doc);
  if (dangR.length || dangC.length) {
    insights.push({
      id: "dangling",
      severity: "watch",
      kind: "dangling",
      title: "Links point at missing items",
      detail: `${dangR.length} relationship${dangR.length === 1 ? "" : "s"} and ${dangC.length} cable${dangC.length === 1 ? "" : "s"} reference an item that is no longer in the atlas. Saving will prune them.`,
      entityIds: [],
    });
  }

  const relatedPairs = new Set<string>();
  const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  for (const r of doc.relationships) relatedPairs.add(pairKey(r.fromId, r.toId));
  for (const c of doc.connections) {
    if (c.spare || !c.active) continue;
    if (!relatedPairs.has(pairKey(c.fromId, c.toId))) {
      insights.push({
        id: `undoc:${c.id}`,
        severity: "info",
        kind: "undocumented",
        title: `Cable ${c.label || c.id} has no matching relationship`,
        detail: "The cable is recorded, but the atlas has no relationship between those two items.",
        entityIds: [c.fromId, c.toId],
      });
    }
  }

  const spareInactive = doc.connections.filter((c) => c.spare || !c.active);
  if (spareInactive.length) {
    insights.push({
      id: "spare-cables",
      severity: "info",
      kind: "spare-inactive",
      title: `${spareInactive.length} spare or inactive cable${spareInactive.length === 1 ? "" : "s"}`,
      detail: "These stay in the inventory and do not drive failure analysis.",
      entityIds: [...new Set(spareInactive.flatMap((c) => [c.fromId, c.toId]))],
    });
  }

  const today = new Date();
  for (const e of doc.entities) {
    const serviceDays = daysUntil(e.nextService, today);
    if (serviceDays !== null && serviceDays < 0) {
      insights.push({
        id: `svc:${e.id}`,
        severity: "watch",
        kind: "service-due",
        title: `${e.name} service is overdue`,
        detail: `Next service was recorded as ${e.nextService}.`,
        entityIds: [e.id],
      });
    }
    const warDays = daysUntil(e.purchase.warrantyUntil, today);
    if (warDays !== null && warDays <= 30) {
      insights.push({
        id: `war:${e.id}`,
        severity: warDays < 0 ? "watch" : "info",
        kind: "warranty",
        title:
          warDays < 0
            ? `${e.name} warranty has ended`
            : `${e.name} warranty ends in ${warDays} day${warDays === 1 ? "" : "s"}`,
        detail: `Recorded warranty date ${e.purchase.warrantyUntil}.`,
        entityIds: [e.id],
      });
    }
    if (e.critical && !e.playbook.trim()) {
      insights.push({
        id: `pb:${e.id}`,
        severity: "info",
        kind: "no-playbook",
        title: `${e.name} is critical with no playbook`,
        detail: "Write what a person should do if this item fails.",
        entityIds: [e.id],
      });
    }
    if (e.spareForId && !doc.entities.some((x) => x.id === e.spareForId)) {
      insights.push({
        id: `spare:${e.id}`,
        severity: "info",
        kind: "unmatched-spare",
        title: `${e.name} is a spare for a missing item`,
        detail: "The item this spare replaces is no longer in the atlas.",
        entityIds: [e.id],
      });
    }
  }

  const order = { critical: 0, watch: 1, info: 2 };
  insights.sort((a, b) => order[a.severity] - order[b.severity] || a.title.localeCompare(b.title));
  return insights;
}
