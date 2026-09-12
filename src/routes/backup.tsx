import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { PageHeader } from "@/components/atlas/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  connectionsToCsv,
  entitiesToCsv,
  graphToSvg,
  relationshipsToCsv,
  reportHtml,
  toVersionedJson,
} from "@/lib/atlas/export";
import { useAtlas } from "@/lib/atlas/store";
import { downloadText } from "@/lib/utils";

export const Route = createFileRoute("/backup")({ component: BackupPage });

function BackupPage() {
  const doc = useAtlas((s) => s.doc);
  const importJson = useAtlas((s) => s.importJson);
  const loadDemo = useAtlas((s) => s.loadDemo);
  const newAtlas = useAtlas((s) => s.newAtlas);
  const renameAtlas = useAtlas((s) => s.renameAtlas);
  const fileRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function stamp() {
    return new Date().toISOString().slice(0, 10);
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <PageHeader
        eyebrow="Your data"
        title="Backup"
        description="Everything lives in this browser. Export a versioned JSON snapshot before you change devices. Restoring replaces the current atlas."
      />
      <div className="grid gap-6 p-4 md:grid-cols-2 md:p-6">
        <section className="space-y-3 rounded-xl bg-bg-elevated p-4 shadow-[var(--shadow-border)]">
          <p className="font-display text-2xl">This atlas</p>
          <Input value={doc.meta.name} onChange={(e) => renameAtlas(e.target.value)} />
          <p className="text-sm text-muted">
            {doc.entities.length} items · {doc.relationships.length} relationships · {doc.rooms.length} rooms
          </p>
          {doc.meta.isDemo ? (
            <p className="text-sm text-warn">Demo data is loaded. Exporting it is fine; starting fresh is one click.</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <a href="/digital-opus-home-systems-atlas.zip" download="digital-opus-home-systems-atlas.zip">
                Download app zip
              </a>
            </Button>
            <Button onClick={() => downloadText(`atlas-${stamp()}.json`, toVersionedJson(doc), "application/json")}>
              Export JSON
            </Button>
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              Restore JSON
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const text = await file.text();
                const result = importJson(text);
                setNotice(
                  result.ok
                    ? `Restored${result.warnings[0] ? ` — ${result.warnings[0]}` : "."}`
                    : result.errors.join(" "),
                );
                e.target.value = "";
              }}
            />
          </div>
          {notice ? <p className="text-sm text-muted">{notice}</p> : null}
        </section>
        <section className="space-y-3 rounded-xl bg-bg-elevated p-4 shadow-[var(--shadow-border)]">
          <p className="font-display text-2xl">Other formats</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => downloadText(`entities-${stamp()}.csv`, entitiesToCsv(doc), "text/csv")}>
              Entities CSV
            </Button>
            <Button
              variant="secondary"
              onClick={() => downloadText(`relationships-${stamp()}.csv`, relationshipsToCsv(doc), "text/csv")}
            >
              Relationships CSV
            </Button>
            <Button
              variant="secondary"
              onClick={() => downloadText(`cables-${stamp()}.csv`, connectionsToCsv(doc), "text/csv")}
            >
              Cables CSV
            </Button>
            <Button variant="secondary" onClick={() => downloadText(`atlas-${stamp()}.svg`, graphToSvg(doc), "image/svg+xml")}>
              Diagram SVG
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                const w = window.open("", "_blank");
                if (!w) return;
                w.document.write(reportHtml(doc));
                w.document.close();
                w.focus();
                w.print();
              }}
            >
              Printable report
            </Button>
          </div>
        </section>
        <section className="space-y-3 rounded-xl bg-bg-elevated p-4 shadow-[var(--shadow-border)] md:col-span-2">
          <p className="font-display text-2xl">Reset</p>
          <p className="text-sm text-muted">
            Starting over only clears this browser’s copy. Exported files are not touched.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => loadDemo()}>
              Load Willow House demo
            </Button>
            <Button variant="ghost" onClick={() => newAtlas("Untitled atlas")}>
              Start empty
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
