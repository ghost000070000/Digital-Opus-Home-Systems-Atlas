# Test report

Runner: `node --experimental-strip-types --test src/lib/atlas/atlas.test.ts`

Date: 2026-09-11

## Result

**34 / 34 passed.**

## Coverage

| Area | Status |
| --- | --- |
| Graph creation | pass |
| Cycle handling | pass |
| Upstream / downstream traversal | pass |
| Shortest path | pass |
| Connected components / orphans | pass |
| Deleted-node relationship pruning | pass |
| Duplicate ID regeneration | pass |
| Serialization round-trip | pass |
| Schema migration / unknown fields | pass |
| Malformed JSON | pass |
| Unicode CSV | pass |
| SVG export | pass |
| Room grouping | pass |
| System grouping (multi-membership) | pass |
| Relationship filters | pass |
| Failure simulation | pass |
| What-if does not mutate stored data | pass |
| Scenario compare | pass |
| Backup alternatives | pass |
| Search | pass |
| Insights (orphan, location, SPOF) | pass |
| Deterministic layout | pass |
| Room-clustered layout / min distance | pass |
| Local QR encode | pass |
| Synthetic graphs 200 / 800 / 2000 | pass |

## Performance (traversal + components + JSON round-trip)

| Nodes | Extra edges | Time | Downstream visited |
| --- | --- | --- | --- |
| 200 | 40 | ~3 ms | 40 |
| 800 | 200 | ~8 ms | 246 |
| 2000 | 400 | ~28 ms | 544 |

All well under the 4s budget.

## Dogfood (Willow House)

| | Count |
| --- | --- |
| Entities | 54 |
| Relationships | 90 |
| Rooms | 7 |
| Systems | 10 |
| Cables | 17 |
| Maintenance notes | 3 |

Shared dependencies: closet UPS, core switch, PoE switch, NAS, mesh AP.

Demo revision: **4** (hand-laid Willow House rooms, labels hidden until zoom).
