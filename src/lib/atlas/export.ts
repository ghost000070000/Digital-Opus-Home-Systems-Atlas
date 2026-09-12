import { csvEscape } from "../utils.ts";
import { relationLabel } from "./relations.ts";
import { SCHEMA_VERSION, type AtlasDocument } from "./types.ts";

export function toVersionedJson(doc: AtlasDocument): string {
  return `${JSON.stringify({ ...doc, version: SCHEMA_VERSION }, null, 2)}\n`;
}

export function entitiesToCsv(doc: AtlasDocument): string {
  const rooms = new Map(doc.rooms.map((r) => [r.id, r.name]));
  const systems = new Map(doc.systems.map((s) => [s.id, s.name]));
  const header = [
    "id",
    "label",
    "name",
    "category",
    "status",
    "room",
    "systems",
    "manufacturer",
    "model",
    "serial",
    "tags",
    "notes",
  ];
  const rows = doc.entities.map((e) =>
    [
      e.id,
      e.label,
      e.name,
      e.category,
      e.status,
      e.roomId ? (rooms.get(e.roomId) ?? "") : "",
      e.systemIds.map((id) => systems.get(id) ?? id).join("; "),
      e.manufacturer,
      e.model,
      e.serial,
      e.tags.join("; "),
      e.notes,
    ]
      .map(csvEscape)
      .join(","),
  );
  return [header.join(","), ...rows].join("\n") + "\n";
}

export function relationshipsToCsv(doc: AtlasDocument): string {
  const names = new Map(doc.entities.map((e) => [e.id, e.name]));
  const header = ["id", "from", "to", "type", "label", "notes"];
  const rows = doc.relationships.map((r) =>
    [
      r.id,
      names.get(r.fromId) ?? r.fromId,
      names.get(r.toId) ?? r.toId,
      r.type,
      relationLabel(r.type, r.customLabel),
      r.notes,
    ]
      .map(csvEscape)
      .join(","),
  );
  return [header.join(","), ...rows].join("\n") + "\n";
}

export function connectionsToCsv(doc: AtlasDocument): string {
  const names = new Map(doc.entities.map((e) => [e.id, e.name]));
  const header = [
    "id",
    "label",
    "type",
    "from",
    "fromPort",
    "to",
    "toPort",
    "length",
    "active",
    "spare",
    "notes",
  ];
  const rows = doc.connections.map((c) =>
    [
      c.id,
      c.label,
      c.cableType,
      names.get(c.fromId) ?? c.fromId,
      c.fromPort,
      names.get(c.toId) ?? c.toId,
      c.toPort,
      c.length,
      c.active ? "yes" : "no",
      c.spare ? "yes" : "no",
      c.notes,
    ]
      .map(csvEscape)
      .join(","),
  );
  return [header.join(","), ...rows].join("\n") + "\n";
}

export function reportHtml(doc: AtlasDocument): string {
  const rooms = new Map(doc.rooms.map((r) => [r.id, r.name]));
  const names = new Map(doc.entities.map((e) => [e.id, e.name]));
  const esc = (s: string) =>
    s.replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">");
  const failed = doc.entities.filter((e) => e.status === "failed" || e.status === "offline");
  const rows = doc.entities
    .map(
      (e) =>
        `<tr><td>${esc(e.label || e.id)}</td><td>${esc(e.name)}</td><td>${esc(e.category)}</td><td>${esc(e.status)}</td><td>${esc(e.roomId ? rooms.get(e.roomId) ?? "" : "")}</td><td>${esc(e.model)}</td></tr>`,
    )
    .join("");
  const rels = doc.relationships
    .map(
      (r) =>
        `<li>${esc(names.get(r.fromId) ?? r.fromId)} <em>${esc(relationLabel(r.type, r.customLabel))}</em> ${esc(names.get(r.toId) ?? r.toId)}</li>`,
    )
    .join("");
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${esc(doc.meta.name)} — report</title>
<style>
  body { font: 14px/1.5 Georgia, serif; color: #1a1814; background: #f3efe6; margin: 40px auto; max-width: 800px; }
  h1 { font-weight: 500; letter-spacing: -0.02em; }
  .meta { color: #6b665c; font-size: 13px; }
  table { border-collapse: collapse; width: 100%; margin: 24px 0; font-size: 13px; }
  th, td { border-bottom: 1px solid #d9d2c5; padding: 6px 8px; text-align: left; }
  th { color: #6b665c; font-weight: 500; }
  .disclaimer { border-top: 1px solid #d9d2c5; margin-top: 32px; padding-top: 12px; color: #6b665c; font-size: 12px; }
</style></head>
<body>
  <p class="meta">Digital Opus · Home Systems Atlas${doc.meta.isDemo ? " · Demo data" : ""}</p>
  <h1>${esc(doc.meta.name)}</h1>
  <p class="meta">${doc.entities.length} items · ${doc.relationships.length} relationships · ${doc.rooms.length} rooms · ${doc.systems.length} systems</p>
  ${failed.length ? `<p><strong>Currently marked failed/offline:</strong> ${failed.map((e) => esc(e.name)).join(", ")}</p>` : ""}
  <h2>Inventory</h2>
  <table><thead><tr><th>Label</th><th>Name</th><th>Type</th><th>Status</th><th>Room</th><th>Model</th></tr></thead><tbody>${rows}</tbody></table>
  <h2>Relationships</h2>
  <ul>${rels}</ul>
  <p class="disclaimer">This report is a record of user-entered items and dependencies. It is not electrical, structural, or safety engineering advice. Do not use it to plan mains wiring.</p>
</body></html>`;
}

export function graphToSvg(
  doc: AtlasDocument,
  opts?: { highlight?: Set<string>; dim?: Set<string> },
): string {
  const pad = 80;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const e of doc.entities) {
    minX = Math.min(minX, e.position.x);
    minY = Math.min(minY, e.position.y);
    maxX = Math.max(maxX, e.position.x);
    maxY = Math.max(maxY, e.position.y);
  }
  if (!Number.isFinite(minX)) {
    minX = 0;
    minY = 0;
    maxX = 800;
    maxY = 500;
  }
  const w = Math.max(400, maxX - minX + pad * 2);
  const h = Math.max(300, maxY - minY + pad * 2);
  const tx = (x: number) => x - minX + pad;
  const ty = (y: number) => y - minY + pad;
  const esc = (s: string) =>
    s.replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">");
  const highlight = opts?.highlight;
  const dim = opts?.dim;

  const edges = doc.relationships
    .map((r) => {
      const a = doc.entities.find((e) => e.id === r.fromId);
      const b = doc.entities.find((e) => e.id === r.toId);
      if (!a || !b) return "";
      const faded = dim && (dim.has(a.id) || dim.has(b.id));
      return `<line x1="${tx(a.position.x)}" y1="${ty(a.position.y)}" x2="${tx(b.position.x)}" y2="${ty(b.position.y)}" stroke="#c4896a" stroke-opacity="${faded ? 0.12 : 0.45}" stroke-width="1.25"/>`;
    })
    .join("");

  const nodes = doc.entities
    .map((e) => {
      const faded = dim?.has(e.id);
      const lit = highlight?.has(e.id);
      const fill = e.status === "failed" ? "#d07060" : lit ? "#c4896a" : "#1c1a18";
      const stroke = e.status === "failed" ? "#d07060" : "#c4896a";
      return `<g opacity="${faded ? 0.2 : 1}">
        <circle cx="${tx(e.position.x)}" cy="${ty(e.position.y)}" r="16" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>
        <text x="${tx(e.position.x)}" y="${ty(e.position.y) + 28}" text-anchor="middle" fill="#f3efe6" font-size="11" font-family="Georgia, serif">${esc(e.name)}</text>
      </g>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(w)}" height="${Math.round(h)}" viewBox="0 0 ${w} ${h}">
  <rect width="100%" height="100%" fill="#0c0c0d"/>
  ${edges}
  ${nodes}
</svg>`;
}
