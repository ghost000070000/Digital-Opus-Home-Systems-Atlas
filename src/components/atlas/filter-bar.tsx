import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DEFAULT_HIDDEN_RELATIONS, RELATION_TYPE_ORDER } from "@/lib/atlas/catalog";
import { RELATION_META } from "@/lib/atlas/relations";
import { useAtlas } from "@/lib/atlas/store";
import type { RelationType } from "@/lib/atlas/types";

export function FilterBar() {
  const doc = useAtlas((s) => s.doc);
  const ui = useAtlas((s) => s.ui);
  const setRoomFilter = useAtlas((s) => s.setRoomFilter);
  const setSystemFilter = useAtlas((s) => s.setSystemFilter);
  const toggleHiddenRelation = useAtlas((s) => s.toggleHiddenRelation);
  const setHiddenRelations = useAtlas((s) => s.setHiddenRelations);
  const toggleCollapsedRoom = useAtlas((s) => s.toggleCollapsedRoom);
  const setCollapsedRooms = useAtlas((s) => s.setCollapsedRooms);
  const setFocusMode = useAtlas((s) => s.setFocusMode);
  const setQuietLinks = useAtlas((s) => s.setQuietLinks);
  const setWhatIf = useAtlas((s) => s.setWhatIf);

  function toggle(list: string[], id: string, set: (ids: string[]) => void) {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  const allCollapsed = doc.rooms.length > 0 && doc.rooms.every((r) => ui.collapsedRoomIds.includes(r.id));

  return (
    <div className="flex flex-col gap-1.5 border-b border-border bg-bg-elevated px-3 py-2">
      <div className="flex items-center gap-1.5 overflow-x-auto">
        <span className="mr-1 shrink-0 text-[11px] uppercase tracking-[0.14em] text-faint">Rooms</span>
        {doc.rooms.map((r) => {
          const on = ui.roomFilter.length === 0 || ui.roomFilter.includes(r.id);
          const collapsed = ui.collapsedRoomIds.includes(r.id);
          return (
            <button
              key={r.id}
              onClick={() => toggle(ui.roomFilter, r.id, setRoomFilter)}
              onDoubleClick={() => toggleCollapsedRoom(r.id)}
              className={`h-8 shrink-0 rounded-full px-2.5 text-xs ${on ? "bg-surface text-fg" : "text-faint"}`}
              title="Click to filter. Double-click to collapse on the atlas."
            >
              {collapsed ? "· " : ""}
              {r.name}
            </button>
          );
        })}
        {ui.roomFilter.length ? (
          <button className="shrink-0 text-xs text-copper" onClick={() => setRoomFilter([])}>
            Clear
          </button>
        ) : null}
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto shrink-0"
          onClick={() => setCollapsedRooms(allCollapsed ? [] : doc.rooms.map((r) => r.id))}
        >
          {allCollapsed ? "Expand rooms" : "Collapse rooms"}
        </Button>
      </div>
      <div className="flex items-center gap-1.5 overflow-x-auto">
        <span className="mr-1 hidden shrink-0 text-[11px] uppercase tracking-[0.14em] text-faint md:inline">
          Systems
        </span>
        <div className="hidden items-center gap-1.5 md:flex">
          {doc.systems.map((s) => {
            const on = ui.systemFilter.length === 0 || ui.systemFilter.includes(s.id);
            return (
              <button
                key={s.id}
                onClick={() => toggle(ui.systemFilter, s.id, setSystemFilter)}
                className={`h-8 shrink-0 rounded-full px-2.5 text-xs ${on ? "bg-surface text-fg" : "text-faint"}`}
              >
                {s.name}
              </button>
            );
          })}
          {ui.systemFilter.length ? (
            <button className="shrink-0 text-xs text-copper" onClick={() => setSystemFilter([])}>
              Clear
            </button>
          ) : null}
        </div>
        <span className="mx-1 hidden h-4 w-px shrink-0 bg-border md:block" />
        <Button size="sm" variant={ui.focusMode ? "default" : "ghost"} onClick={() => setFocusMode(!ui.focusMode)}>
          Focus
        </Button>
        <Button
          size="sm"
          variant={ui.whatIf.enabled ? "default" : "ghost"}
          onClick={() => setWhatIf({ enabled: !ui.whatIf.enabled })}
        >
          What-if overlay
        </Button>
        <Button size="sm" variant={ui.quietLinks ? "default" : "ghost"} onClick={() => setQuietLinks(!ui.quietLinks)}>
          Quiet links
        </Button>
        {ui.whatIf.enabled && ui.whatIf.failedIds.length > 0 ? (
          <span className="text-xs text-warn">{ui.whatIf.failedIds.length} simulated fail</span>
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" className="ml-auto">
              Links
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="max-h-80 overflow-y-auto">
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                setHiddenRelations([...DEFAULT_HIDDEN_RELATIONS]);
              }}
            >
              Essentials
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                setHiddenRelations([]);
              }}
            >
              Show all types
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {RELATION_TYPE_ORDER.map((t) => {
              const hidden = ui.hiddenRelationTypes.includes(t as RelationType);
              return (
                <DropdownMenuItem
                  key={t}
                  onSelect={(e) => {
                    e.preventDefault();
                    toggleHiddenRelation(t);
                  }}
                >
                  <Check className={`size-3.5 ${hidden ? "opacity-0" : "opacity-100"}`} />
                  {RELATION_META[t].label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
