import { createEntity, createRelationship, createRoom, emptyDocument } from "./document.ts";
import type { AtlasDocument, RelationType } from "./types.ts";

const TYPES: RelationType[] = ["depends-on", "powered-by", "connected-to", "feeds", "protects"];

/** Deterministic synthetic atlas for performance and stress tests. */
export function syntheticGraph(n: number, extraEdges = 0, seed = 1): AtlasDocument {
  const doc = emptyDocument(`Synthetic ${n}`);
  const roomCount = Math.max(1, Math.round(Math.sqrt(n / 4)));
  for (let r = 0; r < roomCount; r++) {
    doc.rooms.push(createRoom({ id: `r${r}`, name: `Room ${r}` }));
  }
  for (let i = 0; i < n; i++) {
    const col = i % Math.ceil(Math.sqrt(n));
    const row = Math.floor(i / Math.ceil(Math.sqrt(n)));
    doc.entities.push(
      createEntity({
        id: `n${i}`,
        name: `Node ${i}`,
        category: i % 9 === 0 ? "power-source" : "device",
        roomId: `r${i % roomCount}`,
        position: { x: col * 80, y: row * 80 },
      }),
    );
  }
  // spanning tree so the graph is connected
  for (let i = 1; i < n; i++) {
    const parent = Math.floor((i - 1) / 2);
    const type = TYPES[i % TYPES.length]!;
    doc.relationships.push(
      createRelationship({
        id: `e${i}`,
        fromId: `n${i}`,
        toId: `n${parent}`,
        type,
      }),
    );
  }
  let rng = seed >>> 0;
  const next = () => {
    rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0;
    return rng / 4294967296;
  };
  for (let k = 0; k < extraEdges; k++) {
    const a = Math.floor(next() * n);
    const b = Math.floor(next() * n);
    if (a === b) continue;
    doc.relationships.push(
      createRelationship({
        id: `x${k}`,
        fromId: `n${a}`,
        toId: `n${b}`,
        type: TYPES[k % TYPES.length]!,
      }),
    );
  }
  return doc;
}
