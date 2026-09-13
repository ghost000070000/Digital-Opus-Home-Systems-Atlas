import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/atlas/page-header";
import { Button } from "@/components/ui/button";
import { buildLabelCards, labelsSheetHtml } from "@/lib/atlas/labels";
import { useAtlas } from "@/lib/atlas/store";

export const Route = createFileRoute("/labels")({ component: LabelsPage });

function LabelsPage() {
  const doc = useAtlas((s) => s.doc);
  const [picked, setPicked] = useState<string[]>([]);
  const cards = useMemo(
    () => buildLabelCards(doc, picked.length ? picked : undefined),
    [doc, picked],
  );

  function toggle(id: string) {
    setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  function printSheet() {
    const html = labelsSheetHtml(cards, doc.meta.name);
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <PageHeader
        eyebrow="Physical world"
        title="Labels"
        description="Printable cards with a local QR. The code is just the identifier you chose — nothing is hosted, nothing is scanned against a cloud."
        actions={
          <Button onClick={printSheet} disabled={cards.length === 0}>
            Print sheet
          </Button>
        }
      />
      <div className="flex flex-wrap gap-1.5 border-b border-border px-4 py-3 md:px-6">
        {doc.entities.map((e) => (
          <button
            key={e.id}
            onClick={() => toggle(e.id)}
            className={`rounded-full px-2.5 py-1 text-xs ${picked.includes(e.id) || picked.length === 0 ? "bg-surface text-fg" : "text-faint"}`}
          >
            {e.label || e.name}
          </button>
        ))}
        {picked.length ? (
          <button className="text-xs text-copper" onClick={() => setPicked([])}>
            All
          </button>
        ) : null}
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 md:p-6">
        {cards.map((c) => (
          <article key={c.entityId} className="flex items-center gap-3 rounded-xl bg-paper p-3 text-ink">
            <div
              className="size-24 shrink-0"
              dangerouslySetInnerHTML={{ __html: c.qr }}
            />
            <div className="min-w-0">
              <p className="font-mono text-lg tracking-wide">{c.title}</p>
              <p className="text-sm text-ink/70">{c.subtitle}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
