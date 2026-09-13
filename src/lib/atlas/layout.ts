import type { AtlasDocument, Vec2 } from "./types.ts";

export interface LayoutOptions {
  iterations?: number;
  repulsion?: number;
  spring?: number;
  springLength?: number;
  roomPull?: number;
  damping?: number;
  seed?: number;
  slotWidth?: number;
  slotHeight?: number;
  intraGap?: number;
  minDistance?: number;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function collide(positions: Record<string, Vec2>, minDist: number, iterations = 48): Record<string, Vec2> {
  const nodes = Object.entries(positions).map(([id, p]) => ({ id, x: p.x, y: p.y }));
  const n = nodes.length;
  if (n < 2) return positions;
  const passes = n > 280 ? 8 : iterations;
  for (let iter = 0; iter < passes; iter++) {
    for (let i = 0; i < n; i++) {
      const a = nodes[i]!;
      for (let j = i + 1; j < n; j++) {
        const b = nodes[j]!;
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let dist = Math.hypot(dx, dy);
        if (dist < 0.5) {
          dx = 1;
          dy = 0;
          dist = 1;
        }
        if (dist >= minDist) continue;
        const push = (minDist - dist) / 2;
        const ux = dx / dist;
        const uy = dy / dist;
        a.x += ux * push;
        a.y += uy * push;
        b.x -= ux * push;
        b.y -= uy * push;
      }
    }
  }
  const out: Record<string, Vec2> = {};
  for (const node of nodes) out[node.id] = { x: node.x, y: node.y };
  return out;
}

/**
 * Room-clustered layout. Each room occupies a grid slot; members sit on a
 * compact inner grid. Deterministic when a seed is given.
 */
export function clusteredLayout(doc: AtlasDocument, opts: LayoutOptions = {}): Record<string, Vec2> {
  const rand = mulberry32(opts.seed ?? 1);
  const slotW = opts.slotWidth ?? 1400;
  const slotH = opts.slotHeight ?? 980;
  const intra = opts.intraGap ?? 196;
  const minDist = opts.minDistance ?? 168;
  const cols = Math.max(2, Math.ceil(Math.sqrt(doc.rooms.length + 1)));

  const slotOf = (index: number) => ({
    x: (index % cols) * slotW + slotW / 2,
    y: Math.floor(index / cols) * slotH + slotH / 2,
  });

  const roomIndex = new Map(doc.rooms.map((r, i) => [r.id, i]));
  const groups = new Map<string, string[]>();
  const unlocated: string[] = [];
  for (const e of doc.entities) {
    if (e.roomId && roomIndex.has(e.roomId)) {
      const list = groups.get(e.roomId) ?? [];
      list.push(e.id);
      groups.set(e.roomId, list);
    } else {
      unlocated.push(e.id);
    }
  }

  const out: Record<string, Vec2> = {};
  const placeGroup = (ids: string[], cx: number, cy: number) => {
    const n = ids.length;
    if (n === 0) return;
    const gridCols = Math.ceil(Math.sqrt(n));
    const gridRows = Math.ceil(n / gridCols);
    const w = (gridCols - 1) * intra;
    const h = (gridRows - 1) * intra;
    ids.forEach((id, i) => {
      const c = i % gridCols;
      const r = Math.floor(i / gridCols);
      out[id] = {
        x: cx - w / 2 + c * intra + (rand() - 0.5) * 2,
        y: cy - h / 2 + r * intra + (rand() - 0.5) * 2,
      };
    });
  };

  for (const room of doc.rooms) {
    const idx = roomIndex.get(room.id) ?? 0;
    const slot = slotOf(idx);
    placeGroup(groups.get(room.id) ?? [], slot.x, slot.y);
  }
  if (unlocated.length) {
    const slot = slotOf(doc.rooms.length);
    placeGroup(unlocated, slot.x, slot.y);
  }

  return collide(out, minDist);
}

/**
 * Force-directed layout with room clustering. Deterministic when a seed is given.
 * Existing positions are used as the starting state when they are non-zero;
 * otherwise nodes start from the clustered layout.
 */
export function forceLayout(doc: AtlasDocument, opts: LayoutOptions = {}): Record<string, Vec2> {
  const iterations = opts.iterations ?? 160;
  const repulsion = opts.repulsion ?? 4200;
  const spring = opts.spring ?? 0.032;
  const springLength = opts.springLength ?? 190;
  const roomPull = opts.roomPull ?? 0.04;
  const damping = opts.damping ?? 0.78;
  const rand = mulberry32(opts.seed ?? 1);
  const clustered = clusteredLayout(doc, opts);

  const nodes = doc.entities.map((e) => {
    const hasPos = e.position.x !== 0 || e.position.y !== 0;
    const start = hasPos ? e.position : clustered[e.id] ?? { x: 400 + rand() * 600, y: 240 + rand() * 400 };
    return {
      id: e.id,
      x: start.x,
      y: start.y,
      vx: 0,
      vy: 0,
      roomId: e.roomId,
    };
  });
  const index = new Map(nodes.map((n, i) => [n.id, i]));

  const roomSlots = new Map<string, Vec2>();
  const cols = Math.max(2, Math.ceil(Math.sqrt(doc.rooms.length + 1)));
  const slotW = opts.slotWidth ?? 1400;
  const slotH = opts.slotHeight ?? 980;
  doc.rooms.forEach((r, i) => {
    roomSlots.set(r.id, {
      x: (i % cols) * slotW + slotW / 2,
      y: Math.floor(i / cols) * slotH + slotH / 2,
    });
  });

  const links: Array<[number, number, number]> = [];
  const seen = new Set<string>();
  const add = (a: string, b: string, rest: number) => {
    const ia = index.get(a);
    const ib = index.get(b);
    if (ia === undefined || ib === undefined || ia === ib) return;
    const key = ia < ib ? `${ia}-${ib}` : `${ib}-${ia}`;
    if (seen.has(key)) return;
    seen.add(key);
    links.push([ia, ib, rest]);
  };
  for (const r of doc.relationships) {
    const sameRoom =
      doc.entities.find((e) => e.id === r.fromId)?.roomId ===
      doc.entities.find((e) => e.id === r.toId)?.roomId;
    add(r.fromId, r.toId, sameRoom ? springLength : springLength * 2.4);
  }
  for (const c of doc.connections) {
    if (c.active) add(c.fromId, c.toId, springLength * 1.4);
  }

  const n = nodes.length;
  const maxPair = n > 280 ? 0 : n;
  const iters = n > 280 ? Math.min(iterations, 40) : iterations;

  for (let iter = 0; iter < iters; iter++) {
    if (maxPair) {
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const a = nodes[i]!;
          const b = nodes[j]!;
          let dx = a.x - b.x;
          let dy = a.y - b.y;
          let dist2 = dx * dx + dy * dy;
          if (dist2 < 16) {
            dx = (rand() - 0.5) * 4;
            dy = (rand() - 0.5) * 4;
            dist2 = dx * dx + dy * dy;
          }
          const dist = Math.sqrt(dist2);
          const same = a.roomId && a.roomId === b.roomId;
          const force = (same ? repulsion : repulsion * 1.6) / dist2;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          a.vx += fx;
          a.vy += fy;
          b.vx -= fx;
          b.vy -= fy;
        }
      }
    }

    for (const [ia, ib, rest] of links) {
      const a = nodes[ia]!;
      const b = nodes[ib]!;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.max(8, Math.hypot(dx, dy));
      const t = (dist - rest) * spring;
      const fx = (dx / dist) * t;
      const fy = (dy / dist) * t;
      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    }

    for (const node of nodes) {
      if (node.roomId) {
        const c = roomSlots.get(node.roomId);
        if (c) {
          node.vx += (c.x - node.x) * roomPull;
          node.vy += (c.y - node.y) * roomPull;
        }
      }
      node.vx *= damping;
      node.vy *= damping;
      node.x += node.vx;
      node.y += node.vy;
    }
  }

  const out: Record<string, Vec2> = {};
  for (const node of nodes) out[node.id] = { x: node.x, y: node.y };
  return collide(out, opts.minDistance ?? 168, n > 280 ? 8 : 48);
}

export function applyLayout(doc: AtlasDocument, positions: Record<string, Vec2>): AtlasDocument {
  return {
    ...doc,
    entities: doc.entities.map((e) => ({
      ...e,
      position: positions[e.id] ? { ...positions[e.id]! } : e.position,
    })),
  };
}

export function boundsOf(doc: AtlasDocument, pad = 80): { x: number; y: number; w: number; h: number } {
  if (doc.entities.length === 0) return { x: 0, y: 0, w: 800, h: 500 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const e of doc.entities) {
    minX = Math.min(minX, e.position.x);
    minY = Math.min(minY, e.position.y);
    maxX = Math.max(maxX, e.position.x);
    maxY = Math.max(maxY, e.position.y);
  }
  return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 };
}

export function minNodeDistance(positions: Record<string, Vec2>): number {
  const pts = Object.values(positions);
  if (pts.length < 2) return Infinity;
  let min = Infinity;
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      min = Math.min(min, Math.hypot(pts[i]!.x - pts[j]!.x, pts[i]!.y - pts[j]!.y));
    }
  }
  return min;
}
