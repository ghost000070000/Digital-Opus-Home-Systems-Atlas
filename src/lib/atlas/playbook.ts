import { roomMap } from "./document.ts";
import { analyzeFailure } from "./failure.ts";
import { computeInsights } from "./insights.ts";
import type { AlternativePath, AtlasDocument, Contact, Entity } from "./types.ts";

export interface PlaybookCard {
  entity: Entity;
  roomName: string;
  hard: Entity[];
  degraded: Entity[];
  alternatives: AlternativePath[];
  contacts: Contact[];
  reason: "critical" | "spof" | "failed";
}

export function playbookCards(doc: AtlasDocument): PlaybookCard[] {
  const rooms = roomMap(doc);
  const entities = new Map(doc.entities.map((e) => [e.id, e]));
  const insights = computeInsights(doc);
  const spof = new Set(
    insights.filter((i) => i.kind === "spof").flatMap((i) => (i.entityIds[0] ? [i.entityIds[0]] : [])),
  );
  const ids = new Set<string>();
  for (const e of doc.entities) {
    if (e.critical) ids.add(e.id);
    if (e.status === "failed" || e.status === "offline") ids.add(e.id);
    if (spof.has(e.id)) ids.add(e.id);
  }

  const cards: PlaybookCard[] = [];
  for (const id of ids) {
    const entity = entities.get(id);
    if (!entity) continue;
    const blast = analyzeFailure(doc, { failedIds: [id] });
    const reason: PlaybookCard["reason"] =
      entity.status === "failed" || entity.status === "offline"
        ? "failed"
        : entity.critical
          ? "critical"
          : "spof";
    cards.push({
      entity,
      roomName: entity.roomId ? (rooms.get(entity.roomId)?.name ?? "") : "",
      hard: blast.hard.map((hid) => entities.get(hid)).filter((x): x is Entity => Boolean(x)),
      degraded: blast.degraded.map((hid) => entities.get(hid)).filter((x): x is Entity => Boolean(x)),
      alternatives: blast.alternatives.filter((a) => a.failedId === id),
      contacts: doc.contacts,
      reason,
    });
  }

  const order = { failed: 0, critical: 1, spof: 2 };
  cards.sort((a, b) => order[a.reason] - order[b.reason] || a.entity.name.localeCompare(b.entity.name));
  return cards;
}

export function playbookHtml(doc: AtlasDocument): string {
  const cards = playbookCards(doc);
  const rows = cards
    .map((c) => {
      const steps = c.entity.playbook
        ? `<p>${escapeHtml(c.entity.playbook).replace(/\n/g, "<br/>")}</p>`
        : `<p class="muted">No written response yet.</p>`;
      const hard = c.hard.length
        ? `<p><strong>Hard:</strong> ${c.hard.map((e) => escapeHtml(e.name)).join(", ")}</p>`
        : "";
      const alt = c.alternatives.length
        ? `<p><strong>Recorded alternatives:</strong> ${c.alternatives.map((a) => escapeHtml(a.reason)).join(" ")}</p>`
        : "";
      return `<article class="card">
        <h2>${escapeHtml(c.entity.name)}</h2>
        <p class="muted">${escapeHtml(c.roomName)} · ${c.reason}${c.entity.label ? ` · ${escapeHtml(c.entity.label)}` : ""}</p>
        ${steps}
        ${hard}
        ${alt}
      </article>`;
    })
    .join("\n");
  const people = doc.contacts
    .map(
      (c) =>
        `<li><strong>${escapeHtml(c.name)}</strong>${c.role ? ` — ${escapeHtml(c.role)}` : ""}${c.phone ? ` · ${escapeHtml(c.phone)}` : ""}</li>`,
    )
    .join("");
  return `<!doctype html>
<html><head><meta charset="utf-8"/><title>${escapeHtml(doc.meta.name)} playbook</title>
<style>
  body{font:15px/1.45 "IBM Plex Sans",system-ui,sans-serif;background:#f3efe6;color:#1a1814;margin:32px;}
  h1{font-family:"Instrument Serif",serif;font-weight:400;font-size:36px;margin:0 0 8px;}
  .muted{color:#6b665c;}
  .card{border:1px solid #d8d2c6;padding:16px 18px;margin:16px 0;border-radius:12px;background:#fffdf8;break-inside:avoid;}
  h2{font-family:"Instrument Serif",serif;font-size:24px;margin:0 0 4px;font-weight:400;}
  ul{padding-left:18px;}
</style></head>
<body>
  <h1>${escapeHtml(doc.meta.name)} — outage playbook</h1>
  <p class="muted">Dependency model only. Not electrical, structural, or safety advice.</p>
  ${people ? `<h2>People</h2><ul>${people}</ul>` : ""}
  ${rows || "<p class='muted'>Mark items as critical, or record a single point of failure, to generate cards.</p>"}
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
