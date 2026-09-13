import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/atlas/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { playbookCards, playbookHtml } from "@/lib/atlas/playbook";
import { useAtlas } from "@/lib/atlas/store";
import { FAILURE_DISCLAIMER } from "@/lib/atlas/types";

export const Route = createFileRoute("/playbook")({ component: PlaybookPage });

function PlaybookPage() {
  const doc = useAtlas((s) => s.doc);
  const addContact = useAtlas((s) => s.addContact);
  const updateContact = useAtlas((s) => s.updateContact);
  const deleteContact = useAtlas((s) => s.deleteContact);
  const updateEntity = useAtlas((s) => s.updateEntity);
  const selectEntity = useAtlas((s) => s.selectEntity);
  const [name, setName] = useState("");
  const cards = playbookCards(doc);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <PageHeader
        eyebrow="Response"
        title="Playbook"
        description="What to do if a recorded critical item fails. Generated from the graph plus your notes — not professional advice."
        actions={
          <Button
            variant="secondary"
            onClick={() => {
              const w = window.open("", "_blank");
              if (!w) return;
              w.document.write(playbookHtml(doc));
              w.document.close();
              w.focus();
              w.print();
            }}
          >
            Print cards
          </Button>
        }
      />
      <div className="grid gap-6 p-4 md:p-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <p className="text-sm text-muted">{FAILURE_DISCLAIMER}</p>
          {cards.length === 0 ? (
            <p className="text-sm text-muted">Mark items as critical, or wait for a single point of failure to appear.</p>
          ) : null}
          {cards.map((card) => (
            <article key={card.entity.id} className="rounded-xl bg-bg-elevated p-4 shadow-[var(--shadow-border)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link to="/" onClick={() => selectEntity(card.entity.id)} className="font-display text-2xl">
                    {card.entity.name}
                  </Link>
                  <p className="text-sm text-muted">
                    {[card.roomName, card.entity.label].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <Badge variant={card.reason === "failed" ? "danger" : card.reason === "critical" ? "warn" : "default"}>
                  {card.reason}
                </Badge>
              </div>
              <label className="mt-3 block text-xs uppercase tracking-[0.14em] text-faint">If this fails</label>
              <Textarea
                className="mt-1"
                rows={3}
                value={card.entity.playbook}
                placeholder="Write the household steps."
                onChange={(e) => updateEntity(card.entity.id, { playbook: e.target.value })}
              />
              {card.hard.length ? (
                <p className="mt-3 text-sm">
                  <span className="text-muted">Hard: </span>
                  {card.hard.slice(0, 8).map((e) => e.name).join(", ")}
                  {card.hard.length > 8 ? ` +${card.hard.length - 8}` : ""}
                </p>
              ) : null}
              {card.alternatives.length ? (
                <ul className="mt-2 space-y-1 text-sm text-muted">
                  {card.alternatives.map((a) => (
                    <li key={`${a.failedId}-${a.alternativeId}`}>{a.reason}</li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </div>
        <aside className="space-y-3 rounded-xl bg-bg-elevated p-4 shadow-[var(--shadow-border)]">
          <p className="font-display text-2xl">People</p>
          <p className="text-sm text-muted">Local names only. They never leave this browser.</p>
          <ul className="space-y-3">
            {doc.contacts.map((c) => (
              <li key={c.id} className="space-y-1 rounded-md bg-surface p-2">
                <Input value={c.name} onChange={(e) => updateContact(c.id, { name: e.target.value })} />
                <Input
                  value={c.role}
                  placeholder="Role"
                  onChange={(e) => updateContact(c.id, { role: e.target.value })}
                />
                <Input
                  value={c.phone}
                  placeholder="Phone"
                  onChange={(e) => updateContact(c.id, { phone: e.target.value })}
                />
                <button className="text-xs text-faint hover:text-danger" onClick={() => deleteContact(c.id)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Input
              value={name}
              placeholder="Add a person"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) {
                  addContact(name.trim());
                  setName("");
                }
              }}
            />
            <Button
              variant="secondary"
              onClick={() => {
                if (!name.trim()) return;
                addContact(name.trim());
                setName("");
              }}
            >
              Add
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}