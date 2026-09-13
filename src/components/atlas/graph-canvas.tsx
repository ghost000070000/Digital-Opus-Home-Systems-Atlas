import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { CATEGORY_LABEL, initials } from "@/lib/atlas/catalog";
import { analyzeFailure } from "@/lib/atlas/failure";
import { traverse } from "@/lib/atlas/graph";
import { RELATION_META, relationLabel } from "@/lib/atlas/relations";
import { useAtlas } from "@/lib/atlas/store";
import { readCanvasTheme, type CanvasTheme } from "@/lib/atlas/theme";
import { clamp } from "@/lib/utils";
import type { AtlasDocument, Entity, RelationType } from "@/lib/atlas/types";

const NODE_R = 22;

interface DrawNode {
  id: string;
  kind: "entity" | "room";
  x: number;
  y: number;
  r: number;
  name: string;
  mark: string;
  status?: Entity["status"];
  roomId?: string | null;
  category?: Entity["category"];
}

interface DrawEdge {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  type: RelationType;
  fromId: string;
  toId: string;
  group: string;
}

function visibleEntities(
  doc: AtlasDocument,
  roomFilter: string[],
  systemFilter: string[],
  floorFilter: string[],
): Entity[] {
  const floorRooms =
    floorFilter.length === 0
      ? null
      : new Set(doc.rooms.filter((r) => r.floorId && floorFilter.includes(r.floorId)).map((r) => r.id));
  return doc.entities.filter((e) => {
    if (roomFilter.length && (!e.roomId || !roomFilter.includes(e.roomId))) return false;
    if (floorRooms && (!e.roomId || !floorRooms.has(e.roomId))) return false;
    if (systemFilter.length && !e.systemIds.some((id) => systemFilter.includes(id))) return false;
    return true;
  });
}

function buildScene(
  doc: AtlasDocument,
  collapsed: Set<string>,
  hidden: Set<RelationType>,
  roomFilter: string[],
  systemFilter: string[],
  floorFilter: string[],
) {
  const vis = visibleEntities(doc, roomFilter, systemFilter, floorFilter);
  const collapsedRooms = new Set([...collapsed].filter((id) => vis.some((e) => e.roomId === id)));
  const nodes: DrawNode[] = [];
  const roomPos = new Map<string, { x: number; y: number }>();

  for (const room of doc.rooms) {
    const members = vis.filter((e) => e.roomId === room.id);
    if (!members.length) continue;
    const cx = members.reduce((s, m) => s + m.position.x, 0) / members.length;
    const cy = members.reduce((s, m) => s + m.position.y, 0) / members.length;
    roomPos.set(room.id, { x: cx, y: cy });
    if (collapsedRooms.has(room.id)) {
      nodes.push({
        id: `room:${room.id}`,
        kind: "room",
        x: cx,
        y: cy,
        r: 34,
        name: room.name,
        mark: String(members.length),
        roomId: room.id,
      });
    }
  }

  for (const e of vis) {
    if (e.roomId && collapsedRooms.has(e.roomId)) continue;
    nodes.push({
      id: e.id,
      kind: "entity",
      x: e.position.x,
      y: e.position.y,
      r: NODE_R,
      name: e.name,
      mark: e.label ? e.label.slice(0, 4) : initials(e.name),
      status: e.status,
      roomId: e.roomId,
      category: e.category,
    });
  }

  const posOf = (entityId: string): { x: number; y: number } | null => {
    const ent = vis.find((e) => e.id === entityId);
    if (!ent) return null;
    if (ent.roomId && collapsedRooms.has(ent.roomId)) return roomPos.get(ent.roomId) ?? null;
    return ent.position;
  };

  const edges: DrawEdge[] = [];
  const seen = new Set<string>();
  for (const r of doc.relationships) {
    if (hidden.has(r.type)) continue;
    const a = posOf(r.fromId);
    const b = posOf(r.toId);
    if (!a || !b) continue;
    if (a.x === b.x && a.y === b.y) continue;
    const key = `${Math.min(a.x, b.x).toFixed(1)}:${Math.min(a.y, b.y).toFixed(1)}:${r.type}:${r.fromId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    edges.push({
      x1: a.x,
      y1: a.y,
      x2: b.x,
      y2: b.y,
      label: relationLabel(r.type, r.customLabel),
      type: r.type,
      fromId: r.fromId,
      toId: r.toId,
      group: RELATION_META[r.type].group,
    });
  }

  const hulls = doc.rooms
    .map((room) => {
      const members = vis.filter((e) => e.roomId === room.id && !collapsedRooms.has(room.id));
      if (members.length < 1 || collapsedRooms.has(room.id)) return null;
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const m of members) {
        minX = Math.min(minX, m.position.x);
        minY = Math.min(minY, m.position.y);
        maxX = Math.max(maxX, m.position.x);
        maxY = Math.max(maxY, m.position.y);
      }
      return { id: room.id, name: room.name, minX, minY, maxX, maxY };
    })
    .filter((h): h is NonNullable<typeof h> => h !== null);

  return { nodes, edges, hulls, vis };
}

function hitNode(nodes: DrawNode[], wx: number, wy: number): DrawNode | null {
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i]!;
    const dx = wx - n.x;
    const dy = wy - n.y;
    const hit = n.kind === "room" ? n.r + 10 : n.r + 8;
    if (dx * dx + dy * dy <= hit * hit) return n;
  }
  return null;
}

function edgeColor(group: string, theme: CanvasTheme, alpha: number): string {
  const hex =
    group === "power"
      ? theme.copper
      : group === "data"
        ? theme.ok
        : group === "control"
          ? theme.warn
          : group === "signal"
            ? theme.paper
            : theme.muted;
  const n = parseInt(hex.replace("#", "").slice(0, 6), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function hashBend(a: string, b: string): number {
  let h = 0;
  const key = `${a}|${b}`;
  for (let i = 0; i !== key.length; i += 1) h = (h * 31 + key.charCodeAt(i)) | 0;
  return ((h % 5) - 2) * 18;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export function GraphCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const miniRef = useRef<HTMLCanvasElement>(null);
  const miniMap = useRef({ minX: 0, minY: 0, sc: 1, ox: 0, oy: 0 });
  const themeRef = useRef<CanvasTheme | null>(null);
  const drag = useRef<{
    mode: "pan" | "node" | null;
    id: string | null;
    lx: number;
    ly: number;
    moved: boolean;
  }>({ mode: null, id: null, lx: 0, ly: 0, moved: false });
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [tip, setTip] = useState<{ x: number; y: number; node: DrawNode } | null>(null);

  const doc = useAtlas((s) => s.doc);
  const ui = useAtlas((s) => s.ui);
  const setCamera = useAtlas((s) => s.setCamera);
  const selectEntity = useAtlas((s) => s.selectEntity);
  const moveEntity = useAtlas((s) => s.moveEntity);
  const commitPositions = useAtlas((s) => s.commitPositions);
  const toggleCollapsedRoom = useAtlas((s) => s.toggleCollapsedRoom);
  const hydrated = useAtlas((s) => s.hydrated);

  const camera = ui.camera;

  const scene = useMemo(
    () =>
      buildScene(
        doc,
        new Set(ui.collapsedRoomIds),
        new Set(ui.hiddenRelationTypes),
        ui.roomFilter,
        ui.systemFilter,
        ui.floorFilter,
      ),
    [doc, ui.collapsedRoomIds, ui.hiddenRelationTypes, ui.roomFilter, ui.systemFilter, ui.floorFilter],
  );

  const impact = ui.whatIf.enabled
    ? analyzeFailure(doc, {
        failedIds: ui.whatIf.failedIds,
        removedRelationIds: ui.whatIf.removedRelationIds,
        unpluggedConnectionIds: ui.whatIf.unpluggedConnectionIds,
      })
    : null;

  const focusSet = useMemo(() => {
    if (!ui.focusMode || !ui.selectedEntityId) return null;
    const down = traverse(doc, [ui.selectedEntityId], "downstream");
    const up = traverse(doc, [ui.selectedEntityId], "upstream");
    return new Set([...down.visited, ...up.visited]);
  }, [ui.focusMode, ui.selectedEntityId, doc]);

  const activeId = hoverId ?? ui.selectedEntityId;
  const neighborIds = useMemo(() => {
    if (!activeId) return new Set<string>();
    const set = new Set<string>([activeId]);
    for (const e of scene.edges) {
      if (e.fromId === activeId || e.toId === activeId) {
        set.add(e.fromId);
        set.add(e.toId);
      }
    }
    return set;
  }, [activeId, scene.edges]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const theme = themeRef.current ?? readCanvasTheme();
    themeRef.current = theme;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, w, h);

    const { x: cx, y: cy, zoom } = camera;
    const toScreen = (x: number, y: number) => ({ x: x * zoom + cx, y: y * zoom + cy });

    const hard = new Set(impact?.hard ?? []);
    const degraded = new Set(impact?.degraded ?? []);
    const seeds = new Set(impact?.seeds ?? []);
    const quiet = ui.quietLinks;
    const selected = ui.selectedEntityId;
    const hasFocus = Boolean(activeId || (ui.focusMode && selected));

    const dimmed = (id: string) => {
      if (id.startsWith("room:")) return false;
      if (focusSet && !focusSet.has(id)) return true;
      if (quiet && hasFocus && !neighborIds.has(id) && !seeds.has(id) && !hard.has(id) && !degraded.has(id)) {
        return true;
      }
      return false;
    };

    ctx.save();
    for (const hull of scene.hulls) {
      const pad = zoom < 0.5 ? 110 : 88;
      const p1 = toScreen(hull.minX - pad, hull.minY - pad + 8);
      const p2 = toScreen(hull.maxX + pad, hull.maxY + pad - 12);
      const rw = p2.x - p1.x;
      const rh = p2.y - p1.y;
      roundRect(ctx, p1.x, p1.y, rw, rh, 20);
      ctx.fillStyle = zoom < 0.5 ? "rgba(243,239,230,0.045)" : "rgba(243,239,230,0.03)";
      ctx.fill();
      ctx.strokeStyle = "rgba(243,239,230,0.14)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = theme.faint;
      ctx.font = zoom < 0.45 ? "500 13px IBM Plex Sans, sans-serif" : "500 11px IBM Plex Sans, sans-serif";
      ctx.textBaseline = "top";
      ctx.textAlign = "left";
      ctx.fillText(hull.name.toUpperCase(), p1.x + 14, p1.y + 12);
    }

    const drawEdge = (e: (typeof scene.edges)[number], lit: boolean) => {
      const a = toScreen(e.x1, e.y1);
      const b = toScreen(e.x2, e.y2);
      const faded = dimmed(e.fromId) || dimmed(e.toId);
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.max(1, Math.hypot(dx, dy));
      const nx = -dy / len;
      const ny = dx / len;
      const bend = hashBend(e.fromId, e.toId) * zoom;
      const mx = (a.x + b.x) / 2 + nx * bend;
      const my = (a.y + b.y) / 2 + ny * bend;
      const power = e.group === "power";
      let alpha = 0.12;
      if (quiet && !hasFocus) alpha = power ? 0.28 : 0.1;
      if (quiet && hasFocus && !lit) alpha = 0.05;
      if (lit) alpha = 0.92;
      if (faded && !lit) alpha = 0.04;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(mx, my, b.x, b.y);
      ctx.strokeStyle = edgeColor(e.group, theme, alpha);
      ctx.lineWidth = lit ? 2 : power ? 1.5 : 1.05;
      ctx.stroke();
      if (lit) {
        const t = 0.86;
        const px = (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * mx + t * t * b.x;
        const py = (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * my + t * t * b.y;
        const tx = 2 * (1 - t) * (mx - a.x) + 2 * t * (b.x - mx);
        const ty = 2 * (1 - t) * (my - a.y) + 2 * t * (b.y - my);
        const ang = Math.atan2(ty, tx);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px - Math.cos(ang - 0.4) * 7, py - Math.sin(ang - 0.4) * 7);
        ctx.lineTo(px - Math.cos(ang + 0.4) * 7, py - Math.sin(ang + 0.4) * 7);
        ctx.closePath();
        ctx.fillStyle = edgeColor(e.group, theme, 0.95);
        ctx.fill();
        if (zoom >= 0.7) {
          const lx = (1 - 0.5) * (1 - 0.5) * a.x + 2 * (1 - 0.5) * 0.5 * mx + 0.25 * b.x;
          const ly = (1 - 0.5) * (1 - 0.5) * a.y + 2 * (1 - 0.5) * 0.5 * my + 0.25 * b.y;
          ctx.font = "500 10px IBM Plex Sans, sans-serif";
          const tw = ctx.measureText(e.label).width;
          roundRect(ctx, lx - tw / 2 - 5, ly - 16, tw + 10, 16, 4);
          ctx.fillStyle = "rgba(12,12,13,0.86)";
          ctx.fill();
          ctx.fillStyle = theme.fg;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(e.label, lx, ly - 8);
        }
      }
    };

    for (const e of scene.edges) {
      const lit = Boolean(activeId && (e.fromId === activeId || e.toId === activeId));
      if (lit) continue;
      drawEdge(e, false);
    }
    for (const e of scene.edges) {
      const lit = Boolean(activeId && (e.fromId === activeId || e.toId === activeId));
      if (!lit) continue;
      drawEdge(e, true);
    }

    for (const n of scene.nodes) {
      const p = toScreen(n.x, n.y);
      const fade = n.kind === "entity" && dimmed(n.id);
      ctx.globalAlpha = fade ? 0.22 : 1;
      const failed = n.status === "failed" || n.status === "offline" || seeds.has(n.id);
      const isHard = hard.has(n.id);
      const isDeg = degraded.has(n.id);
      const isSel = ui.selectedEntityId === n.id || hoverId === n.id;
      const r = n.r * (zoom < 0.55 ? 0.82 : 1);
      const powerish = n.category === "battery" || n.category === "power-source";

      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = failed ? theme.danger : n.kind === "room" ? theme.elevated : powerish ? "#241c18" : theme.surface;
      ctx.fill();
      ctx.lineWidth = isSel ? 2.6 : 1.35;
      ctx.strokeStyle = failed
        ? theme.danger
        : isHard
          ? theme.danger
          : isDeg
            ? theme.warn
            : isSel
              ? theme.paper
              : theme.copper;
      ctx.stroke();

      if (ui.whatIf.enabled && seeds.has(n.id)) {
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.arc(p.x, p.y, r + 6, 0, Math.PI * 2);
        ctx.strokeStyle = theme.warn;
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.fillStyle = failed ? theme.fg : theme.paper;
      ctx.font = `${n.kind === "room" ? 12 : 10}px IBM Plex Sans, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(n.mark.slice(0, 5), p.x, p.y);

      if (n.kind === "room" || isSel || hoverId === n.id || (zoom >= 0.58 && !fade)) {
        const label = n.name.length > 24 ? `${n.name.slice(0, 22)}…` : n.name;
        ctx.font = "500 11px IBM Plex Sans, sans-serif";
        const tw = ctx.measureText(label).width;
        const ly = p.y + r + 6;
        roundRect(ctx, p.x - tw / 2 - 5, ly, tw + 10, 16, 4);
        ctx.fillStyle = "rgba(12,12,13,0.82)";
        ctx.fill();
        ctx.fillStyle = theme.fg;
        ctx.textBaseline = "middle";
        ctx.fillText(label, p.x, ly + 8);
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    const mini = miniRef.current;
    if (mini) {
      const mctx = mini.getContext("2d");
      if (mctx) {
        const mw = mini.clientWidth;
        const mh = mini.clientHeight;
        const d = window.devicePixelRatio || 1;
        if (mini.width !== Math.floor(mw * d) || mini.height !== Math.floor(mh * d)) {
          mini.width = Math.floor(mw * d);
          mini.height = Math.floor(mh * d);
        }
        mctx.setTransform(d, 0, 0, d, 0, 0);
        mctx.fillStyle = theme.elevated;
        mctx.fillRect(0, 0, mw, mh);
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (const n of scene.nodes) {
          minX = Math.min(minX, n.x);
          minY = Math.min(minY, n.y);
          maxX = Math.max(maxX, n.x);
          maxY = Math.max(maxY, n.y);
        }
        if (Number.isFinite(minX)) {
          const pad = 80;
          minX -= pad;
          minY -= pad;
          maxX += pad;
          maxY += pad;
          const sx = mw / (maxX - minX);
          const sy = mh / (maxY - minY);
          const sc = Math.min(sx, sy);
          const ox = (mw - (maxX - minX) * sc) / 2;
          const oy = (mh - (maxY - minY) * sc) / 2;
          miniMap.current = { minX, minY, sc, ox, oy };
          mctx.fillStyle = theme.copper;
          for (const n of scene.nodes) {
            mctx.globalAlpha = 0.85;
            mctx.beginPath();
            mctx.arc((n.x - minX) * sc + ox, (n.y - minY) * sc + oy, 2.2, 0, Math.PI * 2);
            mctx.fill();
          }
          mctx.globalAlpha = 1;
          const viewX = -cx / zoom;
          const viewY = -cy / zoom;
          const viewW = w / zoom;
          const viewH = h / zoom;
          mctx.strokeStyle = theme.paper;
          mctx.lineWidth = 1;
          mctx.strokeRect((viewX - minX) * sc + ox, (viewY - minY) * sc + oy, viewW * sc, viewH * sc);
        }
      }
    }
  }, [
    camera,
    scene,
    ui.selectedEntityId,
    ui.whatIf.enabled,
    ui.quietLinks,
    ui.focusMode,
    impact,
    focusSet,
    hoverId,
    activeId,
    neighborIds,
  ]);

  useEffect(() => {
    draw();
  }, [draw, hydrated, doc, ui]);

  useEffect(() => {
    const onResize = () => draw();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const sx = ev.clientX - rect.left;
      const sy = ev.clientY - rect.top;
      const cam = useAtlas.getState().ui.camera;
      const factor = ev.deltaY > 0 ? 0.92 : 1.08;
      const nextZoom = clamp(cam.zoom * factor, 0.18, 2.8);
      const wx = (sx - cam.x) / cam.zoom;
      const wy = (sy - cam.y) / cam.zoom;
      useAtlas.getState().setCamera({
        zoom: nextZoom,
        x: sx - wx * nextZoom,
        y: sy - wy * nextZoom,
      });
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, []);

  const worldFromEvent = (ev: ReactPointerEvent, el: HTMLCanvasElement) => {
    const rect = el.getBoundingClientRect();
    const sx = ev.clientX - rect.left;
    const sy = ev.clientY - rect.top;
    return {
      sx,
      sy,
      wx: (sx - camera.x) / camera.zoom,
      wy: (sy - camera.y) / camera.zoom,
    };
  };

  const hoverNode = hoverId ? scene.nodes.find((n) => n.id === hoverId) : null;

  return (
    <div className="relative h-full min-h-0 w-full">
      <canvas
        ref={canvasRef}
        className="block h-full w-full touch-none"
        aria-label="Home systems atlas"
        style={{ cursor: hoverId ? "pointer" : "grab" }}
        onPointerDown={(ev) => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          canvas.setPointerCapture(ev.pointerId);
          const { wx, wy, sx, sy } = worldFromEvent(ev, canvas);
          const node = hitNode(scene.nodes, wx, wy);
          if (node && ev.button === 0) {
            drag.current = { mode: "node", id: node.id, lx: sx, ly: sy, moved: false };
            if (node.kind === "entity") selectEntity(node.id);
          } else {
            drag.current = { mode: "pan", id: null, lx: sx, ly: sy, moved: false };
            if (ev.button === 0) selectEntity(null);
          }
        }}
        onPointerMove={(ev) => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const { sx, sy, wx, wy } = worldFromEvent(ev, canvas);
          const d = drag.current;
          if (!d.mode) {
            const node = hitNode(scene.nodes, wx, wy);
            setHoverId(node?.id ?? null);
            setTip(node ? { x: sx, y: sy, node } : null);
            return;
          }
          const dx = sx - d.lx;
          const dy = sy - d.ly;
          if (Math.hypot(dx, dy) > 3) d.moved = true;
          if (d.mode === "pan") {
            setCamera({ x: camera.x + dx, y: camera.y + dy, zoom: camera.zoom });
            d.lx = sx;
            d.ly = sy;
          } else if (d.mode === "node" && d.id && !d.id.startsWith("room:")) {
            moveEntity(d.id, { x: wx, y: wy }, false);
            d.lx = sx;
            d.ly = sy;
          }
        }}
        onPointerUp={(ev) => {
          const d = drag.current;
          if (d.mode === "node" && d.id?.startsWith("room:") && !d.moved) {
            toggleCollapsedRoom(d.id.slice(5));
          }
          if (d.mode === "node" && d.moved && d.id && !d.id.startsWith("room:")) {
            commitPositions();
          }
          drag.current = { mode: null, id: null, lx: 0, ly: 0, moved: false };
          try {
            canvasRef.current?.releasePointerCapture(ev.pointerId);
          } catch {
            /* already released */
          }
        }}
        onPointerLeave={() => {
          if (!drag.current.mode) {
            setHoverId(null);
            setTip(null);
          }
        }}
      />
      {tip && hoverNode && !drag.current.mode ? (
        <div
          className="pointer-events-none absolute z-10 max-w-56 rounded-md bg-bg-elevated px-2.5 py-2 text-xs shadow-[var(--shadow-border)]"
          style={{ left: tip.x + 14, top: tip.y + 14 }}
        >
          <p className="font-medium text-fg">{hoverNode.name}</p>
          <p className="text-muted">
            {hoverNode.kind === "room"
              ? "Room cluster — click to expand"
              : `${hoverNode.category ? CATEGORY_LABEL[hoverNode.category] : "Item"} · ${hoverNode.status ?? "ok"}`}
          </p>
        </div>
      ) : null}
      <div className="pointer-events-none absolute bottom-3 left-3 hidden rounded-md bg-bg-elevated/90 px-2.5 py-2 text-[10px] uppercase tracking-[0.12em] text-faint sm:block">
        <p className="mb-1 text-muted">Links</p>
        <p>
          <span className="mr-1 inline-block h-1.5 w-3 rounded-full bg-copper align-middle" /> Power
        </p>
        <p>
          <span className="mr-1 inline-block h-1.5 w-3 rounded-full bg-paper align-middle opacity-60" /> Signal
        </p>
        <p>
          <span className="mr-1 inline-block h-1.5 w-3 rounded-full bg-ok align-middle" /> Data
        </p>
        <p>
          <span className="mr-1 inline-block h-1.5 w-3 rounded-full bg-warn align-middle" /> Control
        </p>
      </div>
      <canvas
        ref={miniRef}
        width={160}
        height={96}
        className="absolute bottom-3 right-3 hidden h-24 w-40 cursor-pointer rounded-md shadow-[var(--shadow-border)] sm:block"
        aria-label="Atlas overview"
        onPointerDown={(ev) => {
          const mini = miniRef.current;
          const stage = canvasRef.current;
          if (!mini || !stage) return;
          const rect = mini.getBoundingClientRect();
          const mx = ev.clientX - rect.left;
          const my = ev.clientY - rect.top;
          const { minX, minY, sc, ox, oy } = miniMap.current;
          if (sc === 0) return;
          const wx = (mx - ox) / sc + minX;
          const wy = (my - oy) / sc + minY;
          const cam = useAtlas.getState().ui.camera;
          const w = stage.clientWidth;
          const h = stage.clientHeight;
          useAtlas.getState().setCamera({
            zoom: cam.zoom,
            x: w / 2 - wx * cam.zoom,
            y: h / 2 - wy * cam.zoom,
          });
        }}
      />
    </div>
  );
}
