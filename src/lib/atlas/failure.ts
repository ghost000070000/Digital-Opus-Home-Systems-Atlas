import { entityMap, systemMap } from "./document.ts";
import { traverse } from "./graph.ts";
import type { AlternativePath, AtlasDocument, FailureImpact } from "./types.ts";
import { FAILURE_DISCLAIMER } from "./types.ts";

export interface FailureOptions {
  failedIds: string[];
  removedRelationIds?: string[];
  unpluggedConnectionIds?: string[];
}

/**
 * Deterministic impact of one or more failed items, optional removed
 * relationships, and unplugged cables. Does not mutate the document.
 */
export function analyzeFailure(doc: AtlasDocument, opts: FailureOptions): FailureImpact {
  const failedIds = unique(opts.failedIds.filter((id) => doc.entities.some((e) => e.id === id)));
  const ignore = new Set(opts.removedRelationIds ?? []);

  if (opts.unpluggedConnectionIds?.length) {
    const unplugged = new Set(opts.unpluggedConnectionIds);
    for (const c of doc.connections) {
      if (!unplugged.has(c.id)) continue;
      for (const r of doc.relationships) {
        const samePair =
          (r.fromId === c.fromId && r.toId === c.toId) ||
          (r.fromId === c.toId && r.toId === c.fromId);
        if (samePair) ignore.add(r.id);
      }
    }
  }

  const walk = traverse(doc, failedIds, "downstream", { ignoreRelationIds: ignore });
  const seedSet = new Set(failedIds);
  const hard: string[] = [];
  const degraded: string[] = [];

  for (const id of walk.visited) {
    if (seedSet.has(id)) continue;
    const kind = walk.impact.get(id);
    if (kind === "hard") hard.push(id);
    else if (kind === "degraded") degraded.push(id);
  }

  const affected = new Set([...failedIds, ...hard, ...degraded]);
  const unaffected = doc.entities.filter((e) => !affected.has(e.id)).map((e) => e.id);

  const systemsHard: string[] = [];
  const systemsDegraded: string[] = [];
  for (const sys of doc.systems) {
    const members = doc.entities.filter((e) => e.systemIds.includes(sys.id));
    if (members.length === 0) continue;
    const memberIds = members.map((m) => m.id);
    const hardCount = memberIds.filter((id) => seedSet.has(id) || hard.includes(id)).length;
    const degCount = memberIds.filter((id) => degraded.includes(id)).length;
    if (hardCount > 0) systemsHard.push(sys.id);
    else if (degCount > 0) systemsDegraded.push(sys.id);
  }

  const alternatives = findAlternatives(doc, failedIds, affected);

  return {
    seeds: failedIds,
    hard,
    degraded,
    unaffected,
    systemsHard,
    systemsDegraded,
    alternatives,
    disclaimer: FAILURE_DISCLAIMER,
  };
}

function findAlternatives(
  doc: AtlasDocument,
  failedIds: string[],
  affected: Set<string>,
): AlternativePath[] {
  const entities = entityMap(doc);
  const systems = systemMap(doc);
  const out: AlternativePath[] = [];

  for (const rel of doc.relationships) {
    if (rel.type === "backs-up" && failedIds.includes(rel.toId) && !affected.has(rel.fromId)) {
      const alt = entities.get(rel.fromId);
      const failed = entities.get(rel.toId);
      if (alt && failed) {
        out.push({
          failedId: rel.toId,
          alternativeId: rel.fromId,
          reason: `${alt.name} is recorded as a backup of ${failed.name}.`,
        });
      }
    }
    if (rel.type === "protects" && failedIds.includes(rel.fromId)) {
      // another protector of the same target
      for (const other of doc.relationships) {
        if (
          other.type === "protects" &&
          other.toId === rel.toId &&
          other.fromId !== rel.fromId &&
          !affected.has(other.fromId)
        ) {
          const alt = entities.get(other.fromId);
          const failed = entities.get(rel.fromId);
          if (alt && failed) {
            out.push({
              failedId: rel.fromId,
              alternativeId: other.fromId,
              reason: `${alt.name} also protects the same item as ${failed.name}.`,
            });
          }
        }
      }
    }
  }

  for (const e of doc.entities) {
    if (!e.spareForId || !failedIds.includes(e.spareForId)) continue;
    if (affected.has(e.id)) continue;
    const failed = entities.get(e.spareForId);
    if (!failed) continue;
    out.push({
      failedId: e.spareForId,
      alternativeId: e.id,
      reason: `${e.name} is recorded as a spare for ${failed.name}.`,
    });
  }

  // Sibling access points / power sources in the same system, not affected
  for (const id of failedIds) {
    const failed = entities.get(id);
    if (!failed) continue;
    if (failed.category !== "network-endpoint" && failed.category !== "power-source") continue;
    for (const sysId of failed.systemIds) {
      const siblings = doc.entities.filter(
        (e) =>
          e.id !== id &&
          e.category === failed.category &&
          e.systemIds.includes(sysId) &&
          !affected.has(e.id),
      );
      for (const s of siblings) {
        const sysName = systems.get(sysId)?.name ?? "a shared system";
        out.push({
          failedId: id,
          alternativeId: s.id,
          reason: `${s.name} is another ${failed.category.replace("-", " ")} in ${sysName}.`,
        });
      }
    }
  }

  const seen = new Set<string>();
  return out.filter((a) => {
    const key = `${a.failedId}->${a.alternativeId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function unique(ids: string[]): string[] {
  return [...new Set(ids)];
}

export function compareScenarios(
  doc: AtlasDocument,
  a: FailureOptions,
  b: FailureOptions,
): { onlyA: string[]; onlyB: string[]; both: string[] } {
  const ia = analyzeFailure(doc, a);
  const ib = analyzeFailure(doc, b);
  const setA = new Set([...ia.seeds, ...ia.hard, ...ia.degraded]);
  const setB = new Set([...ib.seeds, ...ib.hard, ...ib.degraded]);
  const onlyA: string[] = [];
  const onlyB: string[] = [];
  const both: string[] = [];
  for (const id of setA) {
    if (setB.has(id)) both.push(id);
    else onlyA.push(id);
  }
  for (const id of setB) {
    if (!setA.has(id)) onlyB.push(id);
  }
  return { onlyA, onlyB, both };
}
