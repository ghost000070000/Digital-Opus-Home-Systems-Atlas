# Backup and restore

From Backup:

- **JSON** — complete graph, schema version 1. This is the real backup.
- **CSV** — entities, relationships, cables (lossy; use JSON to restore).
- **SVG** — diagram snapshot.
- **Printable report** — inventory + relationship list + disclaimer.

Restore reads JSON, migrates, regenerates duplicate IDs, and drops dangling links. It replaces the current atlas.

Starting empty or reloading the Willow House demo also replaces the current atlas. Export first.
