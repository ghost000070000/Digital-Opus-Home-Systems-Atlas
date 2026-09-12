import { RELATION_META } from "./relations.ts";
import type { AtlasDocument, ImpactKind, RelationType } from "./types.ts";

export interface DepEdge {
  from: string; // dependent (affected if `to` fails)
  to: string; // dependency
  relationId: string;
  type: RelationType;
  impact: ImpactKind;
}

export function buildDependencyEdges(
  doc: AtlasDocument,
  opts?: { ignoreRelationIds?: Set<string> },
): DepEdge[] {
  const ignore = opts?.ignoreRelationIds;
  const entityIds = new Set(doc.entities.map((e) => e.id));
  const edges: DepEdge[] = [];

  for (const rel of doc.relationships) {
    if (ignore?.has(rel.id)) continue;
    if (!entityIds.has(rel.fromId) || !entityIds.has(rel.toId)) continue;
    if (rel.fromId === rel.toId) continue;
    const meta = RELATION_META[rel.type];
    if (meta.targetFailsSource !== "none") {
      edges.push({
        from: rel.fromId,
        to: rel.toId,
        relationId: rel.id,
        type: rel.type,
        impact: meta.targetFailsSource,
      });
    }
    if (meta.sourceFailsTarget !== "none") {
      edges.push({
        from: rel.toId,
        to: rel.fromId,
        relationId: rel.id,
        type: rel.type,
        impact: meta.sourceFailsTarget,
      });
    }
  }
  return edges;
}

export function adjacencyFromEdges(edges: DepEdge[]): Map<string, DepEdge[]> {
  const map = new Map<string, DepEdge[]>();
  for (const e of edges) {
    const list = map.get(e.to);
    if (list) list.push(e);
    else map.set(e.to, [e]);
  }
  return map;
}

export function dependentsOf(edges: DepEdge[]): Map<string, DepEdge[]> {
  return adjacencyFromEdges(edges);
}

export function dependenciesOf(edges: DepEdge[]): Map<string, DepEdge[]> {
  const map = new Map<string, DepEdge[]>();
  for (const e of edges) {
    const list = map.get(e.from);
    if (list) list.push(e);
    else map.set(e.from, [e]);
  }
  return map;
}

export interface TraversalResult {
  visited: string[];
  depth: Map<string, number>;
  impact: Map<string, ImpactKind>;
  parent: Map<string, string>;
}

/**
 * Walk outward from seeds along dependency edges.
 * `direction: downstream` = things affected when seeds fail (follow dependent links).
 * `direction: upstream` = things the seeds depend on.
 */
export function traverse(
  doc: AtlasDocument,
  seeds: string[],
  direction: "downstream" | "upstream",
  opts?: { ignoreRelationIds?: Set<string>; maxDepth?: number },
): TraversalResult {
  const edges = buildDependencyEdges(doc, opts);
  const adj = direction === "downstream" ? dependentsOf(edges) : dependenciesOf(edges);
  const visited: string[] = [];
  const depth = new Map<string, number>();
  const impact = new Map<string, ImpactKind>();
  const parent = new Map<string, string>();
  const seedSet = new Set(seeds);
  const queue: string[] = [];

  for (const id of seeds) {
    if (!doc.entities.some((e) => e.id === id)) continue;
    depth.set(id, 0);
    impact.set(id, "hard");
    queue.push(id);
    visited.push(id);
  }

  const maxDepth = opts?.maxDepth ?? 10_000;
  let q = 0;
  while (q < queue.length) {
    const cur = queue[q++]!;
    const d = depth.get(cur) ?? 0;
    if (d >= maxDepth) continue;
    const outs = adj.get(cur) ?? [];
    for (const edge of outs) {
      const nxt = direction === "downstream" ? edge.from : edge.to;
      if (seedSet.has(nxt) && nxt !== cur) {
        // still record impact if somehow
      }
      const nextImpact = combineImpact(impact.get(cur) ?? "hard", edge.impact);
      if (nextImpact === "none") continue;
      const prev = impact.get(nxt);
      if (!depth.has(nxt)) {
        depth.set(nxt, d + 1);
        impact.set(nxt, nextImpact);
        parent.set(nxt, cur);
        queue.push(nxt);
        visited.push(nxt);
      } else if (worse(nextImpact, prev ?? "none")) {
        impact.set(nxt, nextImpact);
        parent.set(nxt, cur);
      }
    }
  }

  return { visited, depth, impact, parent };
}

export function combineImpact(fromNode: ImpactKind, edge: ImpactKind): ImpactKind {
  if (fromNode === "none" || edge === "none") return "none";
  if (fromNode === "degraded" || edge === "degraded") return "degraded";
  return "hard";
}

export function worse(a: ImpactKind, b: ImpactKind): boolean {
  const rank = { none: 0, degraded: 1, hard: 2 };
  return rank[a] > rank[b];
}

export function upstream(doc: AtlasDocument, id: string): TraversalResult {
  return traverse(doc, [id], "upstream");
}

export function downstream(doc: AtlasDocument, id: string): TraversalResult {
  return traverse(doc, [id], "downstream");
}

/** Shortest unweighted path on the undirected relationship graph. */
export function shortestPath(
  doc: AtlasDocument,
  fromId: string,
  toId: string,
): string[] | null {
  if (fromId === toId) return [fromId];
  const adj = undirectedAdjacency(doc);
  const parent = new Map<string, string>();
  const queue = [fromId];
  const seen = new Set([fromId]);
  let q = 0;
  while (q < queue.length) {
    const cur = queue[q++]!;
    for (const nxt of adj.get(cur) ?? []) {
      if (seen.has(nxt)) continue;
      seen.add(nxt);
      parent.set(nxt, cur);
      if (nxt === toId) {
        const path = [toId];
        let p = toId;
        while (p !== fromId) {
          p = parent.get(p)!;
          path.push(p);
        }
        path.reverse();
        return path;
      }
      queue.push(nxt);
    }
  }
  return null;
}

export function undirectedAdjacency(doc: AtlasDocument): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();
  const ensure = (id: string) => {
    if (!adj.has(id)) adj.set(id, new Set());
  };
  for (const e of doc.entities) ensure(e.id);
  const link = (a: string, b: string) => {
    if (a === b) return;
    if (!adj.has(a) || !adj.has(b)) return;
    adj.get(a)!.add(b);
    adj.get(b)!.add(a);
  };
  for (const r of doc.relationships) link(r.fromId, r.toId);
  for (const c of doc.connections) {
    if (!c.active) continue;
    link(c.fromId, c.toId);
  }
  return adj;
}

export function connectedComponents(doc: AtlasDocument): string[][] {
  const adj = undirectedAdjacency(doc);
  const seen = new Set<string>();
  const components: string[][] = [];
  for (const id of adj.keys()) {
    if (seen.has(id)) continue;
    const stack = [id];
    const comp: string[] = [];
    seen.add(id);
    while (stack.length) {
      const cur = stack.pop()!;
      comp.push(cur);
      for (const nxt of adj.get(cur) ?? []) {
        if (seen.has(nxt)) continue;
        seen.add(nxt);
        stack.push(nxt);
      }
    }
    components.push(comp);
  }
  components.sort((a, b) => b.length - a.length);
  return components;
}

/** Cycles on the directed dependency graph (Tarjan SCCs of size > 1 or self-loop). */
export function findCycles(doc: AtlasDocument): string[][] {
  const edges = buildDependencyEdges(doc);
  const adj = new Map<string, string[]>();
  for (const e of doc.entities) adj.set(e.id, []);
  for (const e of edges) {
    adj.get(e.to)?.push(e.from);
  }
  // self-relations
  const selfLoops: string[][] = [];
  for (const r of doc.relationships) {
    if (r.fromId === r.toId) selfLoops.push([r.fromId]);
  }

  let index = 0;
  const indices = new Map<string, number>();
  const low = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const sccs: string[][] = [];

  const strongconnect = (v: string) => {
    indices.set(v, index);
    low.set(v, index);
    index += 1;
    stack.push(v);
    onStack.add(v);
    for (const w of adj.get(v) ?? []) {
      if (!indices.has(w)) {
        strongconnect(w);
        low.set(v, Math.min(low.get(v)!, low.get(w)!));
      } else if (onStack.has(w)) {
        low.set(v, Math.min(low.get(v)!, indices.get(w)!));
      }
    }
    if (low.get(v) === indices.get(v)) {
      const scc: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        scc.push(w);
      } while (w !== v);
      if (scc.length > 1) sccs.push(scc);
    }
  };

  for (const id of adj.keys()) {
    if (!indices.has(id)) strongconnect(id);
  }
  return [...selfLoops, ...sccs];
}

export function orphans(doc: AtlasDocument): string[] {
  const linked = new Set<string>();
  for (const r of doc.relationships) {
    linked.add(r.fromId);
    linked.add(r.toId);
  }
  for (const c of doc.connections) {
    linked.add(c.fromId);
    linked.add(c.toId);
  }
  return doc.entities.filter((e) => !linked.has(e.id)).map((e) => e.id);
}

export function degreeMap(doc: AtlasDocument): Map<string, number> {
  const deg = new Map<string, number>();
  for (const e of doc.entities) deg.set(e.id, 0);
  const bump = (id: string) => {
    if (!deg.has(id)) return;
    deg.set(id, (deg.get(id) ?? 0) + 1);
  };
  for (const r of doc.relationships) {
    bump(r.fromId);
    bump(r.toId);
  }
  return deg;
}

export function danglingRelationships(doc: AtlasDocument): string[] {
  const ids = new Set(doc.entities.map((e) => e.id));
  return doc.relationships
    .filter((r) => !ids.has(r.fromId) || !ids.has(r.toId))
    .map((r) => r.id);
}

export function danglingConnections(doc: AtlasDocument): string[] {
  const ids = new Set(doc.entities.map((e) => e.id));
  return doc.connections
    .filter((c) => !ids.has(c.fromId) || !ids.has(c.toId))
    .map((c) => c.id);
}

export function pruneDangling(doc: AtlasDocument): AtlasDocument {
  const ids = new Set(doc.entities.map((e) => e.id));
  const roomIds = new Set(doc.rooms.map((r) => r.id));
  const sysIds = new Set(doc.systems.map((s) => s.id));
  return {
    ...doc,
    entities: doc.entities.map((e) => ({
      ...e,
      roomId: e.roomId && roomIds.has(e.roomId) ? e.roomId : null,
      systemIds: e.systemIds.filter((id) => sysIds.has(id)),
    })),
    relationships: doc.relationships.filter((r) => ids.has(r.fromId) && ids.has(r.toId)),
    connections: doc.connections.filter((c) => ids.has(c.fromId) && ids.has(c.toId)),
    maintenance: doc.maintenance.filter((m) => ids.has(m.entityId)),
  };
}

export function duplicateIds(doc: AtlasDocument): string[] {
  const seen = new Set<string>();
  const dups: string[] = [];
  const consider = (id: string) => {
    if (seen.has(id)) dups.push(id);
    else seen.add(id);
  };
  for (const r of doc.rooms) consider(r.id);
  for (const s of doc.systems) consider(s.id);
  for (const e of doc.entities) consider(e.id);
  for (const r of doc.relationships) consider(r.id);
  for (const c of doc.connections) consider(c.id);
  for (const m of doc.maintenance) consider(m.id);
  return dups;
}
