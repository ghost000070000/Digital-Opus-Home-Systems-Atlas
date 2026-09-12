import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/atlas/page-header";
import { FAILURE_DISCLAIMER } from "@/lib/atlas/types";

export const Route = createFileRoute("/guide")({ component: GuidePage });

function GuidePage() {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <PageHeader
        eyebrow="How to use this"
        title="Guide"
        description="A systems memory for real rooms — not a network simulator, not an electrical planner."
      />
      <article className="mx-auto max-w-3xl space-y-8 px-4 py-6 text-sm leading-relaxed text-muted md:px-6">
        <section className="space-y-2">
          <h3 className="font-display text-2xl text-fg">What this is</h3>
          <p>
            Home Systems Atlas keeps a map of what you own, where it lives, how it connects, and what you think
            depends on what. It runs entirely in your browser. There is no account, no telemetry, and no required
            cloud.
          </p>
        </section>
        <section className="space-y-2">
          <h3 className="font-display text-2xl text-fg">Relationships</h3>
          <p>
            Relationships are the heart of the product. Prefer a specific type: <em>powered by</em>,{" "}
            <em>provides signal to</em>, <em>protects</em>, <em>depends on</em>. Direction matters. “TV powered by
            strip” means the TV is affected if the strip fails — not the other way around.
          </p>
          <p>
            Custom relations never move failure on their own. Use them when you want a note without pretending at
            causality.
          </p>
        </section>
        <section className="space-y-2">
          <h3 className="font-display text-2xl text-fg">Rooms and systems</h3>
          <p>
            A room is a place. A system is a job (Internet, Heating, Backup Power). One NAS can sit in the server
            closet and belong to Storage, Security, and Home Office at once.
          </p>
        </section>
        <section className="space-y-2">
          <h3 className="font-display text-2xl text-fg">Failure analysis</h3>
          <p>{FAILURE_DISCLAIMER}</p>
          <p>
            Marking an item failed in the inspector changes saved status. What-if mode does not. Hard impact means
            “this item is modeled as stopping.” Degraded means “this item loses a capability or protection.” UPS
            failure, for example, usually hard-stops things it powers and only degrades things it merely protects.
          </p>
        </section>
        <section className="space-y-2">
          <h3 className="font-display text-2xl text-fg">Privacy</h3>
          <p>
            Data is stored in localStorage on this device. Exports are files you choose to download. Labels encode
            only the identifier you typed. Nothing is uploaded by this app.
          </p>
        </section>
        <section className="space-y-2">
          <h3 className="font-display text-2xl text-fg">Backup</h3>
          <p>
            Use Backup to download versioned JSON (the complete graph), CSV lists, an SVG of the diagram, or a
            printable report. Restore replaces the current atlas after validation. Duplicate IDs are regenerated;
            links to missing items are dropped.
          </p>
        </section>
        <section className="space-y-2">
          <h3 className="font-display text-2xl text-fg">Limits</h3>
          <ul className="list-disc space-y-1 pl-5">
            <li>Do not use this to plan mains electrical work.</li>
            <li>Cycles are allowed; traversal still stops.</li>
            <li>Very large atlases (thousands of nodes) stay usable for analysis; the canvas is happiest under a few hundred.</li>
            <li>Images attached to items live inside the JSON backup and can make it large.</li>
          </ul>
        </section>
        <section className="space-y-2">
          <h3 className="font-display text-2xl text-fg">Shortcuts</h3>
          <p>
            <kbd className="rounded-sm bg-surface px-1.5 py-0.5 font-mono text-xs">/</kbd> or{" "}
            <kbd className="rounded-sm bg-surface px-1.5 py-0.5 font-mono text-xs">⌘K</kbd> search. Drag the atlas
            to pan, scroll to zoom, drag a node to place it. Double-click a room chip to collapse it.
          </p>
        </section>
      </article>
    </div>
  );
}
