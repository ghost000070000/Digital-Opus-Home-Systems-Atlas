# Relationship model

A relationship is a directed statement you record. Failure analysis only follows the types below.

| Type | If source fails | If target fails |
| --- | --- | --- |
| powered-by | none | hard on source |
| depends-on | none | hard on source |
| routes-through | none | hard on source |
| feeds | hard on target | none |
| provides-signal-to | hard on target | none |
| provides-data-to | hard on target | none |
| connected-to | degraded both ways | degraded both ways |
| controlled-by | none | degraded on source |
| contains | degraded on target | none |
| installed-in | none | degraded on source |
| mounted-on | none | degraded on source |
| backs-up | degraded on target (loses backup) | none |
| charges | degraded on target | none |
| cools | degraded on target | none |
| stores-data-for | degraded on target | none |
| protects | degraded on target (loses protection) | none |
| custom | none | none, unless `carriesFailure` |

Hard = modeled as stopping. Degraded = modeled as losing a capability or protection.

Custom relations never move failure unless you set `carriesFailure`. Then they behave like depends-on (target failure is hard on the source).

Cycles are allowed. Traversal still terminates.
