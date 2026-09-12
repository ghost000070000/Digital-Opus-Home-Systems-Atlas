import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { searchAtlas } from "@/lib/atlas/search";
import { useAtlas } from "@/lib/atlas/store";

export function SearchDialog() {
  const open = useAtlas((s) => s.ui.searchOpen);
  const setSearchOpen = useAtlas((s) => s.setSearchOpen);
  const query = useAtlas((s) => s.ui.searchQuery);
  const setSearchQuery = useAtlas((s) => s.setSearchQuery);
  const doc = useAtlas((s) => s.doc);
  const selectEntity = useAtlas((s) => s.selectEntity);
  const navigate = useNavigate();
  const [active, setActive] = useState(0);
  const hits = useMemo(() => searchAtlas(doc, query), [doc, query]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if ((meta && e.key.toLowerCase() === "k") || e.key === "/") {
        const tag = (e.target as HTMLElement | null)?.tagName;
        if (e.key === "/" && (tag === "INPUT" || tag === "TEXTAREA")) return;
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") setSearchOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setSearchOpen]);

  function go(index: number) {
    const hit = hits[index];
    if (!hit) return;
    if (hit.kind === "room") navigate({ to: "/rooms/$roomId", params: { roomId: hit.id } });
    else if (hit.kind === "system") navigate({ to: "/systems/$systemId", params: { systemId: hit.id } });
    else {
      navigate({ to: "/" });
      selectEntity(hit.entityIds[0] ?? null);
    }
    setSearchOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setSearchOpen}>
      <DialogContent className="p-0">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>Search</DialogTitle>
        </DialogHeader>
        <div className="px-4 pb-4">
          <Input
            autoFocus
            placeholder="Names, rooms, models, cables, notes"
            value={query}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(hits.length - 1, a + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(0, a - 1));
              } else if (e.key === "Enter") {
                go(active);
              }
            }}
          />
          <ul className="mt-3 max-h-72 overflow-y-auto">
            {hits.map((h, i) => (
              <li key={`${h.kind}:${h.id}`}>
                <button
                  className={`flex w-full flex-col items-start rounded-md px-3 py-2 text-left ${i === active ? "bg-surface" : ""}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(i)}
                >
                  <span className="text-sm text-fg">{h.title}</span>
                  <span className="text-xs capitalize text-muted">{h.kind} · {h.subtitle}</span>
                </button>
              </li>
            ))}
            {query.trim() && hits.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-muted">No matches</li>
            ) : null}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
