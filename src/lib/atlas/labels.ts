import { qrSvg } from "./qr.ts";
import type { AtlasDocument, Entity } from "./types.ts";

export function labelText(entity: Entity): string {
  if (entity.label.trim()) return entity.label.trim();
  const slug = entity.name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 16);
  return slug || entity.id.slice(0, 12);
}

export function labelPayload(entity: Entity): string {
  return `atlas:${entity.id}:${labelText(entity)}`;
}

export interface LabelCard {
  entityId: string;
  title: string;
  subtitle: string;
  code: string;
  qr: string;
}

export function buildLabelCards(doc: AtlasDocument, entityIds?: string[]): LabelCard[] {
  const ids = entityIds && entityIds.length ? new Set(entityIds) : null;
  return doc.entities
    .filter((e) => (ids ? ids.has(e.id) : true))
    .map((e) => ({
      entityId: e.id,
      title: labelText(e),
      subtitle: e.name,
      code: labelPayload(e),
      qr: qrSvg(labelPayload(e), { module: 3, pad: 3 }),
    }));
}

export function labelsSheetHtml(cards: LabelCard[], atlasName: string): string {
  const items = cards
    .map(
      (c) => `<article class="card">
  <div class="qr">${c.qr}</div>
  <div class="meta">
    <div class="code">${escapeHtml(c.title)}</div>
    <div class="name">${escapeHtml(c.subtitle)}</div>
    <div class="tiny">${escapeHtml(c.code)}</div>
  </div>
</article>`,
    )
    .join("");
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Labels — ${escapeHtml(atlasName)}</title>
<style>
  @page { size: letter; margin: 12mm; }
  body { font-family: "IBM Plex Sans", Helvetica, sans-serif; background: #fff; color: #1a1814; margin: 0; }
  h1 { font-size: 14px; font-weight: 500; margin: 0 0 12px; }
  .sheet { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .card { border: 1px solid #c9c2b4; border-radius: 8px; padding: 10px; display: flex; gap: 12px; align-items: center; break-inside: avoid; }
  .qr svg { width: 88px; height: 88px; display: block; }
  .code { font-family: ui-monospace, monospace; font-size: 16px; letter-spacing: 0.04em; }
  .name { font-size: 12px; color: #5c574e; }
  .tiny { font-size: 9px; color: #8a8478; margin-top: 4px; word-break: break-all; }
  @media print { h1 { display: none; } }
</style></head>
<body>
  <h1>${escapeHtml(atlasName)} — printable labels</h1>
  <div class="sheet">${items}</div>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">");
}
