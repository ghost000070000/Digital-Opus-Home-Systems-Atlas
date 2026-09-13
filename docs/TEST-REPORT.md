# Test report

Runner: `node --experimental-strip-types --test src/lib/atlas/atlas.test.ts`

Date: 2026-09-12

## Result

**44 / 44 passed.**

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
| Schema migration v1 → v2 | pass |
| Malformed JSON | pass |
| Unicode CSV | pass |
| SVG export | pass |
| Room grouping | pass |
| System grouping (multi-membership) | pass |
| Relationship filters | pass |
| Failure simulation | pass |
| What-if does not mutate stored data | pass |
| Scenario compare | pass |
| Search | pass |
| Insights (orphan, location, SPOF) | pass |
| Deterministic layout | pass |
| Room-clustered layout / min distance | pass |
| Local QR encode | pass |
| Synthetic graphs 200 / 800 / 2000 | pass |
| Custom relation carriesFailure | pass |
| Spare alternatives | pass |
| Undo / redo + coalesce | pass |
| Snapshots strip images | pass |
| Care desk dates and prices | pass |
| Playbook cards | pass |
| Starter templates | pass |
| Willow House floors / contacts / playbooks | pass |

## Performance (traversal + components + JSON round-trip)

| Nodes | Extra edges | Time | Downstream visited |
| --- | --- | --- | --- |
| 200 | 40 | ~4 ms | 40 |
| 800 | 200 | ~17 ms | 246 |
| 2000 | 400 | ~52 ms | 544 |

All well under the 4s budget.

## Dogfood (Willow House)

| | Count |
| --- | --- |
| Entities | 55 |
| Relationships | 92 |
| Rooms | 7 |
| Floors | 3 |
| Systems | 10 |
| Cables | 17 |
| Maintenance notes | 3 |
| Contacts | 3 |
| Critical items | 7 |

Shared dependencies: closet UPS, core switch, PoE switch, NAS, mesh AP. Spare 8-port is recorded as a spare for the core switch.

Demo revision: **5** (floors, playbooks, care dates, spare switch, custom failure on HA→NAS).