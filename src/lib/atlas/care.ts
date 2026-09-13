import { entityMap, roomMap } from "./document.ts";
import type { AtlasDocument, Entity } from "./types.ts";

export function parseMoney(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.,-]/g, "").replace(/,/g, "");
  if (!cleaned) return null;
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function daysUntil(iso: string, today = new Date()): number | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  let end: number;
  if (m) {
    end = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  } else {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    end = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }
  const start = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((end - start) / 86_400_000);
}

export interface CareRow {
  entity: Entity;
  kind: "service" | "warranty";
  date: string;
  days: number;
}

export interface CostBucket {
  id: string;
  name: string;
  total: number;
  count: number;
}

export interface CareDesk {
  overdue: CareRow[];
  upcoming: CareRow[];
  warranties: CareRow[];
  byRoom: CostBucket[];
  bySystem: CostBucket[];
  totalKnown: number;
  pricedCount: number;
  unpricedCount: number;
}

export function careDesk(doc: AtlasDocument, today = new Date()): CareDesk {
  const rooms = roomMap(doc);
  const overdue: CareRow[] = [];
  const upcoming: CareRow[] = [];
  const warranties: CareRow[] = [];

  for (const e of doc.entities) {
    const serviceDays = daysUntil(e.nextService, today);
    if (serviceDays !== null) {
      const row: CareRow = { entity: e, kind: "service", date: e.nextService, days: serviceDays };
      if (serviceDays < 0) overdue.push(row);
      else if (serviceDays <= 60) upcoming.push(row);
    }
    const warDays = daysUntil(e.purchase.warrantyUntil, today);
    if (warDays !== null && warDays <= 90) {
      warranties.push({ entity: e, kind: "warranty", date: e.purchase.warrantyUntil, days: warDays });
    }
  }

  const sortRows = (a: CareRow, b: CareRow) => a.days - b.days || a.entity.name.localeCompare(b.entity.name);
  overdue.sort(sortRows);
  upcoming.sort(sortRows);
  warranties.sort(sortRows);

  const roomTotals = new Map<string, CostBucket>();
  const sysTotals = new Map<string, CostBucket>();
  let totalKnown = 0;
  let pricedCount = 0;
  let unpricedCount = 0;

  for (const e of doc.entities) {
    const money = parseMoney(e.purchase.price);
    if (money === null) {
      unpricedCount += 1;
      continue;
    }
    pricedCount += 1;
    totalKnown += money;
    const roomKey = e.roomId ?? "_none";
    const roomName = e.roomId ? (rooms.get(e.roomId)?.name ?? "Unknown room") : "No room";
    const rb = roomTotals.get(roomKey) ?? { id: roomKey, name: roomName, total: 0, count: 0 };
    rb.total += money;
    rb.count += 1;
    roomTotals.set(roomKey, rb);
    for (const sid of e.systemIds) {
      const sys = doc.systems.find((s) => s.id === sid);
      const sb = sysTotals.get(sid) ?? { id: sid, name: sys?.name ?? sid, total: 0, count: 0 };
      sb.total += money;
      sb.count += 1;
      sysTotals.set(sid, sb);
    }
  }

  const byValue = (a: CostBucket, b: CostBucket) => b.total - a.total;
  return {
    overdue,
    upcoming,
    warranties,
    byRoom: [...roomTotals.values()].sort(byValue),
    bySystem: [...sysTotals.values()].sort(byValue),
    totalKnown,
    pricedCount,
    unpricedCount,
  };
}

export function formatMoney(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function careLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
  if (days === 0) return "due today";
  if (days === 1) return "due tomorrow";
  return `in ${days} days`;
}

export function entityById(doc: AtlasDocument, id: string) {
  return entityMap(doc).get(id);
}