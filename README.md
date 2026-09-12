# Digital Opus Home Systems Atlas

A local-first visual memory of the systems in a home, workshop, studio, small office, or homelab.

It is **not** a network topology tool and **not** an electrical planner. It records what exists, where it is, how it connects, and what you believe depends on what.

## Principles

- Local-first — data stays in this browser
- No account, no telemetry, no required cloud
- Understandable without being an engineer
- Deterministic analysis (no generated “AI insights”)
- Exportable: versioned JSON, CSV, SVG, printable report and labels

## Try it

The app opens on the Willow House demo (clearly marked). Drag the atlas, click a node, press **What if** on the closet UPS, and watch the blast radius.

- `/` atlas graph
- `/rooms` and `/systems` grouped views
- `/inventory` accessible list
- `/cables` optional cable inventory
- `/what-if` scenario comparison
- `/insights` deterministic notices
- `/labels` printable QR labels (local identifiers only)
- `/backup` export / restore
- `/guide` the user guide

Search with `/` or ⌘K.

## Privacy

See [docs/privacy.md](docs/privacy.md). Nothing is uploaded. Restoring a JSON file replaces the local atlas after validation.

## Schema

See [docs/schema.md](docs/schema.md). Current version: **1**.

## Tests

Graph algorithms, failure simulation, import/export, Unicode, duplicate IDs, dangling links, and synthetic graphs (200 / 800 / 2000 nodes) live in `src/lib/atlas/atlas.test.ts`. Results: [docs/TEST-REPORT.md](docs/TEST-REPORT.md).

## Limitations

See [docs/limitations.md](docs/limitations.md). Do not use this to plan mains wiring.
