# Backup and restore

- **JSON** is the complete graph (schema v2). This is the format to keep.
- **CSV** is a flat list of entities, relationships, or cables.
- **SVG** is a static diagram of current positions.
- **Printable report** opens a paper-friendly HTML view.
- **Named snapshots** freeze the atlas in this browser (images stripped). Restoring a snapshot can be undone.
- **Undo** (⌘Z) is session memory. Snapshots survive reloads.

Restore replaces the current atlas after validation. Duplicate IDs are regenerated. Links to missing items are dropped. A v1 file opens as v2 with empty floors and contacts.

Nothing is uploaded. Files you export are yours.