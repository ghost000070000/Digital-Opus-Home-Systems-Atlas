import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/atlas/page-header";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CATEGORY_LABEL, STATUS_LABEL } from "@/lib/atlas/catalog";
import { searchAtlas } from "@/lib/atlas/search";
import { useAtlas } from "@/lib/atlas/store";

export const Route = createFileRoute("/inventory")({ component: InventoryPage });

function InventoryPage() {
  const doc = useAtlas((s) => s.doc);
  const selectEntity = useAtlas((s) => s.selectEntity);
  const [q, setQ] = useState("");
  const rooms = useMemo(() => new Map(doc.rooms.map((r) => [r.id, r.name])), [doc.rooms]);
  const ids = q.trim() ? new Set(searchAtlas(doc, q).flatMap((h) => h.entityIds)) : null;
  const rows = doc.entities.filter((e) => !ids || ids.has(e.id));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        eyebrow="List"
        title="Inventory"
        description="Every item in the atlas. This view is the accessible alternative to the graph."
      />
      <div className="border-b border-border px-4 py-3 md:px-6">
        <Input placeholder="Filter inventory" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <ul className="divide-y divide-border md:hidden">
          {rows.map((e) => (
            <li key={e.id} className="px-4 py-3">
              <Link to="/" onClick={() => selectEntity(e.id)} className="block">
                <p className="text-sm text-fg">{e.name}</p>
                <p className="mt-0.5 font-mono text-xs text-copper">{e.label || "—"}</p>
                <p className="mt-1 text-xs text-muted">
                  {CATEGORY_LABEL[e.category]} · {e.roomId ? rooms.get(e.roomId) ?? "—" : "No room"} ·{" "}
                  {STATUS_LABEL[e.status]}
                </p>
              </Link>
            </li>
          ))}
          {rows.length === 0 ? <li className="px-4 py-8 text-center text-sm text-muted">No items match.</li> : null}
        </ul>
        <table className="hidden w-full min-w-[640px] text-left text-sm md:table">
          <thead className="sticky top-0 bg-bg text-[11px] uppercase tracking-[0.12em] text-faint">
            <tr>
              <th className="px-4 py-2 font-medium">Label</th>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 font-medium">Room</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Model</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id} className="border-t border-border">
                <td className="px-4 py-2 font-mono text-xs text-copper">{e.label || "—"}</td>
                <td className="px-4 py-2">
                  <Link to="/" onClick={() => selectEntity(e.id)} className="text-fg">
                    {e.name}
                  </Link>
                </td>
                <td className="px-4 py-2 text-muted">{CATEGORY_LABEL[e.category]}</td>
                <td className="px-4 py-2 text-muted">{e.roomId ? rooms.get(e.roomId) ?? "—" : "—"}</td>
                <td className="px-4 py-2">
                  <Badge variant={e.status === "failed" ? "danger" : e.status === "ok" ? "ok" : "default"}>
                    {STATUS_LABEL[e.status]}
                  </Badge>
                </td>
                <td className="px-4 py-2 text-muted">{e.model || "—"}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  No items match.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
