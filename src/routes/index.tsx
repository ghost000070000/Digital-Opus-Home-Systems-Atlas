import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { FilterBar } from "@/components/atlas/filter-bar";
import { GraphCanvas } from "@/components/atlas/graph-canvas";
import { Inspector } from "@/components/atlas/inspector";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { boundsOf } from "@/lib/atlas/layout";
import { useAtlas } from "@/lib/atlas/store";
import { clamp } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: AtlasPage });

function AtlasPage() {
  const doc = useAtlas((s) => s.doc);
  const ui = useAtlas((s) => s.ui);
  const setCamera = useAtlas((s) => s.setCamera);
  const relayout = useAtlas((s) => s.relayout);
  const selectEntity = useAtlas((s) => s.selectEntity);
  const hydrated = useAtlas((s) => s.hydrated);
  const setAddOpen = useAtlas((s) => s.setAddOpen);
  const loadDemo = useAtlas((s) => s.loadDemo);
  const toggleWhatIfFailed = useAtlas((s) => s.toggleWhatIfFailed);
  const [sheet, setSheet] = useState(false);
  const fittedFor = useRef(-1);

  useEffect(() => {
    if (ui.selectedEntityId) setSheet(true);
  }, [ui.selectedEntityId]);

  function fit() {
    const b = boundsOf(useAtlas.getState().doc, 140);
    const el = document.querySelector("[data-atlas-stage]");
    const w = el?.clientWidth ?? 900;
    const h = el?.clientHeight ?? 600;
    if (w < 40 || h < 40) return false;
    const zoom = clamp(Math.min(w / Math.max(b.w, 1), h / Math.max(b.h, 1)) * 0.92, 0.22, 1.35);
    setCamera({
      zoom,
      x: w / 2 - (b.x + b.w / 2) * zoom,
      y: h / 2 - (b.y + b.h / 2) * zoom,
    });
    return true;
  }

  useEffect(() => {
    if (!hydrated || doc.entities.length === 0) return;
    if (fittedFor.current === ui.fitNonce) return;
    let tries = 0;
    const tick = () => {
      if (fit()) {
        fittedFor.current = ui.fitNonce;
        return;
      }
      tries += 1;
      if (tries < 24) window.setTimeout(tick, 50);
    };
    const t = window.setTimeout(tick, 40);
    const again = window.setTimeout(() => fit(), 300);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(again);
    };
  }, [hydrated, doc.entities.length, ui.fitNonce]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <FilterBar />
      <div className="relative flex min-h-0 flex-1">
        <div data-atlas-stage className="relative min-h-0 min-w-0 flex-1">
          <GraphCanvas />
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={fit}>
              Fit
            </Button>
            <Button size="sm" variant="ghost" onClick={() => relayout()}>
              Re-layout
            </Button>
            {doc.meta.isDemo && !ui.whatIf.failedIds.includes("ent_ups_closet") ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  toggleWhatIfFailed("ent_ups_closet");
                  selectEntity("ent_ups_closet");
                }}
              >
                Fail closet UPS
              </Button>
            ) : null}
          </div>
          {hydrated && doc.entities.length === 0 ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-bg/70 p-6">
              <div className="max-w-sm text-center">
                <p className="font-display text-3xl">Empty atlas</p>
                <p className="mt-2 text-sm text-muted">
                  Add a room and an item, or load the Willow House demo to see a finished house.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Button onClick={() => setAddOpen(true, "entity")}>Add item</Button>
                  <Button variant="secondary" onClick={() => loadDemo()}>
                    Load demo
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
          {doc.meta.isDemo ? (
            <p className="pointer-events-none absolute bottom-28 left-3 hidden max-w-sm text-[11px] text-faint md:bottom-3 md:left-36 md:block">
              Demo: Willow House. Click a node to light its links. Scroll to zoom, drag the field to pan.
            </p>
          ) : null}
        </div>
        <div className="hidden lg:block">
          <Inspector />
        </div>
      </div>
      <Sheet
        open={sheet && Boolean(ui.selectedEntityId)}
        onOpenChange={(o) => {
          setSheet(o);
          if (!o) selectEntity(null);
        }}
      >
        <SheetContent side="bottom" className="lg:hidden">
          <SheetTitle className="sr-only">Item</SheetTitle>
          <div className="h-[70vh]">
            <Inspector />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
