import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { describe, it } from "node:test";
import { willowHouseDemo, demoStats } from "./demo.ts";
import {
  createEntity,
  createRelationship,
  createRoom,
  createSystem,
  emptyDocument,
  nextFreePosition,
} from "./document.ts";
import { connectionsToCsv, entitiesToCsv, graphToSvg, relationshipsToCsv, toVersionedJson } from "./export.ts";
import { analyzeFailure, compareScenarios } from "./failure.ts";
import {
  connectedComponents,
  danglingRelationships,
  findCycles,
  orphans,
  pruneDangling,
  shortestPath,
  traverse,
  duplicateIds,
} from "./graph.ts";
import { DEFAULT_HIDDEN_RELATIONS } from "./catalog.ts";
import { computeInsights } from "./insights.ts";
import { clusteredLayout, forceLayout, minNodeDistance } from "./layout.ts";
import { encodeQrMatrix, qrSvg } from "./qr.ts";
import { parseDocument } from "./schema.ts";
import { searchAtlas } from "./search.ts";
import { syntheticGraph } from "./synthetic.ts";
import { DEMO_REVISION, FAILURE_DISCLAIMER, SCHEMA_VERSION } from "./types.ts";

describe("demo atlas", () => {
  it("meets dogfood size", () => {
    const stats = demoStats();
    assert.ok(stats.entities >= 40, `entities ${stats.entities}`);
    assert.ok(stats.relationships >= 60, `relationships ${stats.relationships}`);
    assert.ok(stats.rooms >= 5);
    assert.ok(stats.systems >= 6);
    assert.equal(willowHouseDemo().meta.isDemo, true);
    assert.equal(willowHouseDemo().meta.demoRevision, DEMO_REVISION);
  });

  it("keeps nodes from sitting on top of each other", () => {
    const doc = willowHouseDemo();
    const positions: Record<string, { x: number; y: number }> = {};
    for (const e of doc.entities) positions[e.id] = e.position;
    assert.ok(minNodeDistance(positions) >= 160, `min distance ${minNodeDistance(positions)}`);
    const ups = doc.entities.find((e) => e.id === "ent_ups_closet");
    const nas = doc.entities.find((e) => e.id === "ent_nas");
    assert.ok(ups && nas);
    assert.ok(
      Math.hypot(ups.position.x - nas.position.x, ups.position.y - nas.position.y) >= 200,
      "closet UPS should not sit on the NAS",
    );
  });
});

describe("graph creation and traversal", () => {
  const doc = willowHouseDemo();

  it("walks downstream from closet UPS", () => {
    const down = traverse(doc, ["ent_ups_closet"], "downstream");
    assert.ok(down.visited.includes("ent_router"));
    assert.ok(down.visited.includes("ent_nas"));
    assert.ok(down.visited.includes("ent_ont"));
    assert.equal(down.impact.get("ent_router"), "hard");
  });

  it("walks upstream from the TV", () => {
    const up = traverse(doc, ["ent_tv"], "upstream");
    assert.ok(up.visited.includes("ent_avr"));
    assert.ok(up.visited.includes("ent_strip_living"));
  });

  it("finds a shortest path", () => {
    const path = shortestPath(doc, "ent_console", "ent_tv");
    assert.ok(path);
    assert.equal(path![0], "ent_console");
    assert.equal(path![path!.length - 1], "ent_tv");
  });

  it("handles cycles without looping forever", () => {
    const cyclic = emptyDocument();
    cyclic.entities = [
      createEntity({ id: "a", name: "A", position: { x: 0, y: 0 } }),
      createEntity({ id: "b", name: "B", position: { x: 1, y: 0 } }),
      createEntity({ id: "c", name: "C", position: { x: 2, y: 0 } }),
    ];
    cyclic.relationships = [
      createRelationship({ id: "1", fromId: "a", toId: "b", type: "depends-on" }),
      createRelationship({ id: "2", fromId: "b", toId: "c", type: "depends-on" }),
      createRelationship({ id: "3", fromId: "c", toId: "a", type: "depends-on" }),
    ];
    const cycles = findCycles(cyclic);
    assert.ok(cycles.some((c) => c.length >= 3));
    const down = traverse(cyclic, ["a"], "downstream");
    assert.ok(down.visited.length <= 3);
  });

  it("detects orphans and components", () => {
    const d = emptyDocument();
    d.entities = [
      createEntity({ id: "a", name: "A" }),
      createEntity({ id: "b", name: "B" }),
      createEntity({ id: "c", name: "lonely" }),
    ];
    d.relationships = [createRelationship({ id: "1", fromId: "a", toId: "b", type: "connected-to" })];
    assert.deepEqual(orphans(d), ["c"]);
    const comps = connectedComponents(d);
    assert.equal(comps.length, 2);
  });

  it("prunes relationships to deleted nodes", () => {
    const d = emptyDocument();
    d.entities = [createEntity({ id: "a", name: "A" })];
    d.relationships = [
      createRelationship({ id: "1", fromId: "a", toId: "missing", type: "depends-on" }),
    ];
    assert.deepEqual(danglingRelationships(d), ["1"]);
    const pruned = pruneDangling(d);
    assert.equal(pruned.relationships.length, 0);
  });
});

describe("failure and what-if", () => {
  const doc = willowHouseDemo();

  it("models UPS failure as a blast radius", () => {
    const impact = analyzeFailure(doc, { failedIds: ["ent_ups_closet"] });
    assert.ok(impact.hard.includes("ent_router"));
    assert.ok(impact.hard.includes("ent_nas"));
    assert.ok(impact.systemsHard.includes("sys_internet") || impact.systemsDegraded.includes("sys_internet"));
    assert.equal(impact.disclaimer, FAILURE_DISCLAIMER);
    assert.ok(!impact.hard.includes("ent_kettle"));
  });

  it("does not mutate stored data", () => {
    const before = JSON.stringify(doc);
    analyzeFailure(doc, { failedIds: ["ent_switch"] });
    assert.equal(JSON.stringify(doc), before);
  });

  it("treats unplugged cables as removed links", () => {
    const withCable = analyzeFailure(doc, { failedIds: ["ent_avr"] });
    const unplugged = analyzeFailure(doc, {
      failedIds: [],
      unpluggedConnectionIds: ["cab_hdmi_avr_tv"],
    });
    assert.ok(withCable.hard.includes("ent_tv") || withCable.degraded.includes("ent_tv"));
    assert.ok(
      unplugged.hard.includes("ent_tv") ||
        unplugged.degraded.includes("ent_tv") ||
        unplugged.unaffected.includes("ent_tv"),
    );
  });

  it("compares two scenarios", () => {
    const cmp = compareScenarios(
      doc,
      { failedIds: ["ent_ups_closet"] },
      { failedIds: ["ent_mains_garage"] },
    );
    assert.ok(cmp.onlyA.length > 0);
    assert.ok(cmp.onlyB.includes("ent_mains_garage") || cmp.onlyB.length > 0);
  });

  it("records backup alternatives", () => {
    const impact = analyzeFailure(doc, { failedIds: ["ent_nas"] });
    assert.ok(impact.alternatives.some((a) => a.alternativeId === "ent_backup_drive"));
  });
});

describe("rooms, systems, filters", () => {
  const doc = willowHouseDemo();

  it("groups entities by room", () => {
    const living = doc.entities.filter((e) => e.roomId === "room_living");
    assert.ok(living.length >= 8);
  });

  it("allows an item in multiple systems", () => {
    const nas = doc.entities.find((e) => e.id === "ent_nas")!;
    assert.ok(nas.systemIds.length >= 2);
  });

  it("can hide relation types", () => {
    const hidden = new Set(["powered-by"]);
    const visible = doc.relationships.filter((r) => !hidden.has(r.type));
    assert.ok(visible.length < doc.relationships.length);
    assert.ok(visible.every((r) => r.type !== "powered-by"));
  });
});

describe("serialization, import, schema", () => {
  it("round-trips JSON", () => {
    const doc = willowHouseDemo();
    const json = toVersionedJson(doc);
    const parsed = parseDocument(json);
    assert.equal(parsed.ok, true);
    assert.equal(parsed.doc.version, SCHEMA_VERSION);
    assert.equal(parsed.doc.entities.length, doc.entities.length);
    assert.equal(parsed.doc.relationships.length, doc.relationships.length);
  });

  it("exports CSV with unicode", () => {
    const doc = emptyDocument("Café");
    doc.entities.push(
      createEntity({ id: "u", name: "lampe de chevet — ベッド", notes: "日本語 and café" }),
    );
    const csv = entitiesToCsv(doc);
    assert.ok(csv.includes("ベッド"));
    assert.ok(relationshipsToCsv(doc).includes("id"));
    assert.ok(connectionsToCsv(doc).includes("id"));
  });

  it("emits SVG", () => {
    const svg = graphToSvg(willowHouseDemo());
    assert.ok(svg.includes("<svg"));
    assert.ok(svg.includes("circle"));
  });

  it("migrates missing version and unknown fields", () => {
    const parsed = parseDocument({
      meta: { name: "Old" },
      entities: [{ id: "x", name: "Box", category: "spaceship", extra: true }],
      relationships: [{ id: "r", fromId: "x", toId: "x", type: "teleports" }],
    });
    assert.equal(parsed.doc.entities[0]?.category, "custom");
    assert.equal(parsed.doc.relationships[0]?.type, "custom");
    assert.ok(parsed.warnings.length >= 1);
  });

  it("rejects malformed JSON", () => {
    const parsed = parseDocument("{not json");
    assert.equal(parsed.ok, false);
  });

  it("regenerates duplicate IDs", () => {
    const parsed = parseDocument({
      version: 1,
      entities: [
        { id: "dup", name: "One" },
        { id: "dup", name: "Two" },
      ],
    });
    assert.equal(duplicateIds(parsed.doc).length, 0);
    assert.equal(new Set(parsed.doc.entities.map((e) => e.id)).size, 2);
  });

  it("drops dangling links on parse", () => {
    const parsed = parseDocument({
      version: 1,
      entities: [{ id: "a", name: "A" }],
      relationships: [{ id: "r", fromId: "a", toId: "ghost", type: "depends-on" }],
    });
    assert.equal(parsed.doc.relationships.length, 0);
  });
});

describe("search and insights", () => {
  const doc = willowHouseDemo();

  it("finds by name, model, label, and relation", () => {
    assert.ok(searchAtlas(doc, "NAS-01").some((h) => h.id === "ent_nas"));
    assert.ok(searchAtlas(doc, "DS923").length >= 1);
    assert.ok(searchAtlas(doc, "powered by").length >= 1);
    assert.ok(searchAtlas(doc, "living").length >= 1);
  });

  it("flags hubs and missing locations", () => {
    const lonely = emptyDocument();
    lonely.entities.push(createEntity({ id: "z", name: "Stray" }));
    const insights = computeInsights(lonely);
    assert.ok(insights.some((i) => i.kind === "orphan"));
    assert.ok(insights.some((i) => i.kind === "unknown-location"));
  });

  it("flags the closet UPS as a single point of failure", () => {
    const insights = computeInsights(doc);
    assert.ok(insights.some((i) => i.kind === "spof" && i.entityIds.includes("ent_ups_closet")));
  });
});

describe("layout and QR", () => {
  it("is deterministic", () => {
    const doc = syntheticGraph(20, 5, 3);
    doc.entities.forEach((e) => {
      e.position = { x: 0, y: 0 };
    });
    const a = forceLayout(doc, { iterations: 40, seed: 3 });
    const b = forceLayout(doc, { iterations: 40, seed: 3 });
    assert.deepEqual(a, b);
  });

  it("encodes a local identifier as QR", () => {
    const { size, modules } = encodeQrMatrix("atlas:NAS-01");
    assert.ok(size >= 21);
    assert.equal(modules.length, size * size);
    const svg = qrSvg("atlas:NAS-01");
    assert.ok(svg.startsWith("<svg"));
  });

  it("clusters rooms without collapsing nodes", () => {
    const doc = syntheticGraph(24, 6, 2);
    const pos = clusteredLayout(doc, { seed: 9, minDistance: 90 });
    assert.ok(minNodeDistance(pos) >= 84);
    assert.ok(!DEFAULT_HIDDEN_RELATIONS.includes("powered-by"));
  });
});

describe("performance", () => {
  const cases = [
    { n: 200, extra: 40 },
    { n: 800, extra: 200 },
    { n: 2000, extra: 400 },
  ];

  for (const { n, extra } of cases) {
    it(`traverses ${n} nodes`, () => {
      const doc = syntheticGraph(n, extra, 11);
      const t0 = performance.now();
      const down = traverse(doc, ["n0"], "downstream");
      const comps = connectedComponents(doc);
      const json = toVersionedJson(doc);
      const parsed = parseDocument(json);
      const t1 = performance.now();
      const ms = t1 - t0;
      assert.ok(down.visited.length >= 1);
      assert.ok(comps.length >= 1);
      assert.equal(parsed.doc.entities.length, n);
      assert.ok(ms < 4000, `took ${ms.toFixed(1)}ms for n=${n}`);
      // eslint-disable-next-line no-console
      console.log(`perf n=${n} extra=${extra} ${ms.toFixed(1)}ms visited=${down.visited.length}`);
    });
  }
});

describe("document helpers", () => {
  it("creates rooms and systems", () => {
    const r = createRoom({ name: "Attic" });
    const s = createSystem({ name: "Solar" });
    assert.ok(r.id.startsWith("room"));
    assert.ok(s.id.startsWith("sys"));
  });

  it("places a new item off existing members", () => {
    const d = emptyDocument();
    d.rooms = [createRoom({ id: "r1", name: "Lab" })];
    d.entities = [createEntity({ id: "a", name: "A", roomId: "r1", position: { x: 100, y: 100 } })];
    const p = nextFreePosition(d, "r1");
    assert.ok(Math.hypot(p.x - 100, p.y - 100) >= 160);
  });
});
