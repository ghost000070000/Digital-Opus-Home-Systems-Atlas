import { Link, useRouterState } from "@tanstack/react-router";
import {
  Archive,
  BookOpen,
  Boxes,
  Cable,
  DoorOpen,
  Ellipsis,
  Layers,
  Map,
  Plus,
  ScanSearch,
  Search,
  Tag,
  TriangleAlert,
} from "lucide-react";
import { type ReactNode, useLayoutEffect, useState } from "react";
import { AddItemDialog } from "@/components/atlas/add-item-dialog";
import { SearchDialog } from "@/components/atlas/search-dialog";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAtlas } from "@/lib/atlas/store";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Atlas", icon: Map },
  { to: "/rooms", label: "Rooms", icon: DoorOpen },
  { to: "/systems", label: "Systems", icon: Layers },
  { to: "/inventory", label: "Inventory", icon: Boxes },
  { to: "/cables", label: "Cables", icon: Cable },
  { to: "/what-if", label: "What if", icon: TriangleAlert },
  { to: "/insights", label: "Insights", icon: ScanSearch },
  { to: "/labels", label: "Labels", icon: Tag },
  { to: "/backup", label: "Backup", icon: Archive },
  { to: "/guide", label: "Guide", icon: BookOpen },
] as const;

const MOBILE_PRIMARY = ["/", "/rooms", "/systems", "/inventory", "/what-if"] as const;
const MOBILE_MORE = NAV.filter((item) => !(MOBILE_PRIMARY as readonly string[]).includes(item.to));

export function AppShell({ children }: { children: ReactNode }) {
  const hydrate = useAtlas((s) => s.hydrate);
  const hydrated = useAtlas((s) => s.hydrated);
  const doc = useAtlas((s) => s.doc);
  const setSearchOpen = useAtlas((s) => s.setSearchOpen);
  const setAddOpen = useAtlas((s) => s.setAddOpen);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [moreOpen, setMoreOpen] = useState(false);

  useLayoutEffect(() => {
    hydrate();
  }, [hydrate]);

  const moreActive = MOBILE_MORE.some((item) => pathname.startsWith(item.to));

  return (
    <TooltipProvider>
      <div className="flex h-dvh min-h-0 flex-col bg-bg text-fg">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-3 md:px-4">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.18em] text-copper">Digital Opus</p>
            <div className="flex items-baseline gap-2">
              <h1 className="truncate font-display text-lg leading-none md:text-xl">Home Systems Atlas</h1>
              {doc.meta.isDemo ? (
                <span className="hidden text-[11px] uppercase tracking-wider text-warn sm:inline">Demo</span>
              ) : null}
            </div>
          </div>
          <p className="hidden truncate text-xs text-muted md:block">{doc.meta.name}</p>
          <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
            <a href="/digital-opus-home-systems-atlas.zip" download="digital-opus-home-systems-atlas.zip">
              Zip
            </a>
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)} aria-label="Search">
            <Search className="size-4" />
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)} className="hidden sm:inline-flex">
            <Plus className="size-4" />
            Add
          </Button>
          <Button size="icon" onClick={() => setAddOpen(true)} className="sm:hidden" aria-label="Add">
            <Plus className="size-4" />
          </Button>
        </header>

        <div className="flex min-h-0 flex-1">
          <nav className="hidden w-[200px] shrink-0 flex-col gap-0.5 border-r border-border p-2 md:flex">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex h-10 items-center gap-2 rounded-md px-2.5 text-sm",
                    active ? "bg-surface text-fg" : "text-muted hover:bg-surface hover:text-fg",
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
            <p className="mt-auto px-2 pb-2 text-[11px] leading-relaxed text-faint">
              Local only. Nothing leaves this browser.
            </p>
          </nav>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">{hydrated ? children : <LoadingPane />}</div>
        </div>

        <nav className="flex shrink-0 border-t border-border md:hidden">
          {NAV.filter((item) => (MOBILE_PRIMARY as readonly string[]).includes(item.to)).map((item) => {
            const Icon = item.icon;
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-2 text-[10px]",
                  active ? "text-fg" : "text-muted",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-2 text-[10px]",
              moreActive ? "text-fg" : "text-muted",
            )}
          >
            <Ellipsis className="size-4" />
            More
          </button>
        </nav>
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetContent side="bottom" className="md:hidden">
            <SheetTitle className="font-display text-2xl">More</SheetTitle>
            <p className="mt-1 text-sm text-muted">Cables, insights, labels, backup, and the guide.</p>
            <div className="mt-4 grid gap-1 pb-4">
              {MOBILE_MORE.map((item) => {
                const Icon = item.icon;
                const active = pathname.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex h-12 items-center gap-3 rounded-md px-3 text-sm",
                      active ? "bg-surface text-fg" : "text-muted hover:bg-surface hover:text-fg",
                    )}
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
        <AddItemDialog />
        <SearchDialog />
      </div>
    </TooltipProvider>
  );
}

function LoadingPane() {
  return (
    <div className="flex h-full items-center justify-center">
      <div>
        <p className="font-display text-3xl">Home Systems Atlas</p>
        <p className="mt-2 text-sm text-muted">Opening local memory…</p>
      </div>
    </div>
  );
}
