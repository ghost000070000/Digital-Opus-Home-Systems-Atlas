# Digital Opus Home Systems Atlas

A local-first visual memory of the systems in a home, workshop, studio, small office, or homelab.

It is **not** a network topology tool and **not** an electrical planner. It records what exists, where it is, how it connects, and what you believe depends on what.

## Download

Phase 2 source zip (direct file):

**https://github.com/ghost000070000/Digital-Opus-Home-Systems-Atlas/releases/download/v2.0.0/digital-opus-home-systems-atlas.zip**

Repository: [github.com/ghost000070000/Digital-Opus-Home-Systems-Atlas](https://github.com/ghost000070000/Digital-Opus-Home-Systems-Atlas)

Release page: [v2.0.0](https://github.com/ghost000070000/Digital-Opus-Home-Systems-Atlas/releases/tag/v2.0.0)

After unzip: `npm install` then `npm run dev`.

## Principles

- Local-first — data stays in this browser
- No account, no telemetry, no required cloud
- Understandable without being an engineer
- Deterministic analysis (no generated “AI insights”)
- Exportable: versioned JSON, CSV, SVG, printable report and labels

## Phase 2

Schema **v2**. Adds:

- Floors (rooms grouped by storey)
- Undo / redo (⌘Z / ⌘⇧Z)
- Named snapshots (images stripped)
- Care desk — next service, warranties, recorded spend
- Outage playbooks for critical items and single points of failure
- Household contacts (local only)
- Starter templates (apartment, homelab, studio)
- Custom relations that can carry failure
- Spare-for alternatives in the blast radius

## Try it

The app opens on the Willow House demo (clearly marked). Drag the atlas, click a node, press **What if** on the closet UPS, and watch the blast radius.

- `/` atlas graph
- `/rooms` and `/systems` grouped views
- `/inventory` accessible list
- `/cables` optional cable inventory
- `/what-if` scenario comparison
- `/playbook` response cards and people
- `/care` service dates, warranties, recorded spend
- `/insights` deterministic notices
- `/labels` printable QR labels (local identifiers only)
- `/backup` export / restore / snapshots / templates
- `/guide` the user guide

Search with `/` or ⌘K.

## Privacy

See [docs/privacy.md](docs/privacy.md). Nothing is uploaded. Restoring a JSON file replaces the local atlas after validation.

## Schema

See [docs/schema.md](docs/schema.md). Current version: **2**.

## Tests

Graph algorithms, failure simulation, import/export, Unicode, duplicate IDs, dangling links, and synthetic graphs (200 / 800 / 2000 nodes) live in `src/lib/atlas/atlas.test.ts`. Results: [docs/TEST-REPORT.md](docs/TEST-REPORT.md).

44 / 44 passing.

## Limitations

See [docs/limitations.md](docs/limitations.md). Do not use this to plan mains wiring.
