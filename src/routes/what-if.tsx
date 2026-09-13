import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/atlas/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { analyzeFailure, compareScenarios } from "@/lib/atlas/failure";
import { useAtlas } from "@/lib/atlas/store";
import { FAILURE_DISCLAIMER } from "@/lib/atlas/types";

export const Route = createFileRoute("/what-if")({ component: WhatIfPage });

function WhatIfPage() {
  const doc = useAtlas((s) => s.doc);
  const ui = useAtlas((s) => s.ui);
  const setWhatIf = useAtlas((s) => s.setWhatIf);
  const toggleWhatIfFailed = useAtlas((s) => s.toggleWhatIfFailed);
  const selectEntity = useAtlas((s) => s.selectEntity);
  const nameOf = (id: string) => doc.entities.find((e) => e.id === id)?.name ?? id;
  const sysName = (id: string) => doc.systems.find((s) => s.id === id)?.name ?? id;

  const impact = analyzeFailure(doc, {
    failedIds: ui.whatIf.failedIds,
    removedRelationIds: ui.whatIf.removedRelationIds,
    unpluggedConnectionIds: ui.whatIf.unpluggedConnectionIds,
  });
  const compare =
    ui.whatIf.compareFailedIds.length > 0
      ? compareScenarios(
          doc,
          { failedIds: ui.whatIf.failedIds },
          { failedIds: ui.whatIf.compareFailedIds },
        )
      : null;

  const unlocated = doc.entities.filter((e) => !e.roomId);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <PageHeader
        eyebrow="Simulation"
        title="What if?"
        description="Temporarily mark items as failed without changing saved data. This is a dependency model, not engineering certainty."
        actions={
          <div className="flex flex-wrap gap-2">
            {doc.meta.isDemo ? (
              <Button
                variant="secondary"
                onClick={() =>
                  setWhatIf({
                    enabled: true,
                    failedIds: ["ent_ups_closet"],
                    removedRelationIds: [],
                    unpluggedConnectionIds: [],
                    compareFailedIds: [],
                  })
                }
              >
                Try closet UPS
              </Button>
            ) : null}
            <Button
              variant="ghost"
              onClick={() =>
                setWhatIf({
                  enabled: true,
                  failedIds: [],
                  removedRelationIds: [],
                  unpluggedConnectionIds: [],
                  compareFailedIds: [],
                })
              }
            >
              Clear
            </Button>
          </div>
        }
      />
      <div className="grid gap-6 p-4 lg:grid-cols-[minmax(0,1fr)_360px] md:p-6">
        <section className="space-y-6">
          <p className="text-sm text-muted">Tap items to fail. The saved atlas does not change.</p>
          {doc.rooms.map((room) => {
            const members = doc.entities.filter((e) => e.roomId === room.id);
            if (!members.length) return null;
            return (
              <div key={room.id}>
                <h3 className="text-xs uppercase tracking-[0.14em] text-faint">{room.name}</h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {members.map((e) => {
                    const on = ui.whatIf.failedIds.includes(e.id);
                    return (
                      <button
                        key={e.id}
                        onClick={() => toggleWhatIfFailed(e.id)}
                        className={`h-8 rounded-full px-2.5 text-xs ${on ? "bg-danger/20 text-danger" : "bg-surface text-muted"}`}
                      >
                        {e.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {unlocated.length ? (
            <div>
              <h3 className="text-xs uppercase tracking-[0.14em] text-faint">No room</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {unlocated.map((e) => {
                  const on = ui.whatIf.failedIds.includes(e.id);
                  return (
                    <button
                      key={e.id}
                      onClick={() => toggleWhatIfFailed(e.id)}
                      className={`h-8 rounded-full px-2.5 text-xs ${on ? "bg-danger/20 text-danger" : "bg-surface text-muted"}`}
                    >
                      {e.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
          {ui.whatIf.failedIds.length > 0 ? (
            <div>
              <h3 className="text-xs uppercase tracking-[0.14em] text-faint">Compare against</h3>
              <p className="mt-1 text-xs text-muted">Optional second scenario — a different set of seeds.</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {doc.entities.map((e) => {
                  const on = ui.whatIf.compareFailedIds.includes(e.id);
                  return (
                    <button
                      key={e.id}
                      onClick={() =>
                        setWhatIf({
                          compareFailedIds: on
                            ? ui.whatIf.compareFailedIds.filter((x) => x !== e.id)
                            : [...ui.whatIf.compareFailedIds, e.id],
                        })
                      }
                      className={`h-8 rounded-full px-2.5 text-xs ${on ? "bg-warn/20 text-warn" : "bg-surface text-muted"}`}
                    >
                      {e.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </section>
        <section className="h-fit space-y-4 rounded-xl bg-bg-elevated p-4 shadow-[var(--shadow-border)]">
          <p className="font-display text-2xl">Impact</p>
          {ui.whatIf.failedIds.length === 0 ? (
            <p className="text-sm text-muted">
              Pick a seed. In the demo, try the closet UPS — internet, storage, and cameras sit downstream of it.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted">
                {impact.seeds.length} seed{impact.seeds.length === 1 ? "" : "s"} · {impact.hard.length} hard ·{" "}
                {impact.degraded.length} degraded
              </p>
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-faint">Hard affected</p>
                <ul className="mt-1 space-y-1">
                  {impact.hard.map((id) => (
                    <li key={id}>
                      <Link to="/" onClick={() => selectEntity(id)} className="text-sm text-danger">
                        {nameOf(id)}
                      </Link>
                    </li>
                  ))}
                  {impact.hard.length === 0 ? <li className="text-sm text-muted">None</li> : null}
                </ul>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-faint">Degraded</p>
                <ul className="mt-1 space-y-1">
                  {impact.degraded.map((id) => (
                    <li key={id}>
                      <Link to="/" onClick={() => selectEntity(id)} className="text-sm text-warn">
                        {nameOf(id)}
                      </Link>
                    </li>
                  ))}
                  {impact.degraded.length === 0 ? <li className="text-sm text-muted">None</li> : null}
                </ul>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {impact.systemsHard.map((id) => (
                  <Badge key={id} variant="danger">
                    {sysName(id)}
                  </Badge>
                ))}
                {impact.systemsDegraded.map((id) => (
                  <Badge key={id} variant="warn">
                    {sysName(id)}
                  </Badge>
                ))}
              </div>
              {impact.alternatives.length ? (
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-faint">Possible alternatives</p>
                  <ul className="mt-1 space-y-1 text-sm text-muted">
                    {impact.alternatives.map((a) => (
                      <li key={`${a.failedId}-${a.alternativeId}`}>{a.reason}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {compare ? (
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-faint">Compare</p>
                  <p className="text-sm text-muted">
                    Only A: {compare.onlyA.length} · Only B: {compare.onlyB.length} · Both: {compare.both.length}
                  </p>
                </div>
              ) : null}
              <Button asChild variant="secondary" className="w-full">
                <Link to="/">See blast radius on atlas</Link>
              </Button>
            </>
          )}
          <p className="text-[11px] leading-relaxed text-faint">{FAILURE_DISCLAIMER}</p>
        </section>
      </div>
    </div>
  );
}
