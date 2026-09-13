import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/atlas/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CABLE_LABEL } from "@/lib/atlas/catalog";
import { useAtlas } from "@/lib/atlas/store";
import { CABLE_TYPES, type CableType } from "@/lib/atlas/types";

export const Route = createFileRoute("/cables")({ component: CablesPage });

function CablesPage() {
  const doc = useAtlas((s) => s.doc);
  const addConnection = useAtlas((s) => s.addConnection);
  const updateConnection = useAtlas((s) => s.updateConnection);
  const deleteConnection = useAtlas((s) => s.deleteConnection);
  const selectEntity = useAtlas((s) => s.selectEntity);
  const setWhatIf = useAtlas((s) => s.setWhatIf);
  const whatIf = useAtlas((s) => s.ui.whatIf);
  const navigate = useNavigate();
  const nameOf = (id: string) => doc.entities.find((e) => e.id === id)?.name ?? id;

  function openItem(id: string) {
    selectEntity(id);
    void navigate({ to: "/" });
  }

  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [cableType, setCableType] = useState<CableType>("ethernet");
  const [label, setLabel] = useState("");
  const [fromPort, setFromPort] = useState("");
  const [toPort, setToPort] = useState("");
  const [length, setLength] = useState("");

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <PageHeader
        eyebrow="Physical runs"
        title="Cables"
        description="Optional inventory of HDMI, Ethernet, USB-C, power, and the rest. This is not electrical wiring advice — do not use it to plan mains."
      />
      <div className="grid gap-6 p-4 lg:grid-cols-[minmax(0,1fr)_320px] md:p-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-[0.12em] text-faint">
              <tr>
                <th className="py-2 font-medium">Label</th>
                <th className="py-2 font-medium">Type</th>
                <th className="py-2 font-medium">From</th>
                <th className="py-2 font-medium">To</th>
                <th className="py-2 font-medium">State</th>
                <th className="py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {doc.connections.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="py-2 font-mono text-xs text-copper">{c.label || "—"}</td>
                  <td className="py-2">{CABLE_LABEL[c.cableType]}</td>
                  <td className="py-2">
                    <button onClick={() => openItem(c.fromId)}>
                      {nameOf(c.fromId)}
                      {c.fromPort ? <span className="text-faint"> · {c.fromPort}</span> : null}
                    </button>
                  </td>
                  <td className="py-2">
                    <button onClick={() => openItem(c.toId)}>
                      {nameOf(c.toId)}
                      {c.toPort ? <span className="text-faint"> · {c.toPort}</span> : null}
                    </button>
                  </td>
                  <td className="py-2">
                    {c.spare ? <Badge>Spare</Badge> : c.active ? <Badge variant="ok">Active</Badge> : <Badge>Inactive</Badge>}
                  </td>
                  <td className="py-2 text-right">
                    <button
                      className="mr-3 text-xs text-muted"
                      onClick={() =>
                        setWhatIf({
                          enabled: true,
                          unpluggedConnectionIds: whatIf.unpluggedConnectionIds.includes(c.id)
                            ? whatIf.unpluggedConnectionIds.filter((x) => x !== c.id)
                            : [...whatIf.unpluggedConnectionIds, c.id],
                        })
                      }
                    >
                      Unplug
                    </button>
                    <button className="mr-3 text-xs text-muted" onClick={() => updateConnection(c.id, { active: !c.active })}>
                      Toggle
                    </button>
                    <button className="text-xs text-faint" onClick={() => deleteConnection(c.id)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {doc.connections.length === 0 ? (
            <p className="mt-6 text-sm text-muted">No cables recorded. A run is optional — relationships can stand alone.</p>
          ) : null}
        </div>
        <form
          className="space-y-3 rounded-xl bg-bg-elevated p-4 shadow-[var(--shadow-border)]"
          onSubmit={(e) => {
            e.preventDefault();
            if (!fromId || !toId) return;
            addConnection({ fromId, toId, cableType, label, fromPort, toPort, length });
            setLabel("");
            setFromPort("");
            setToPort("");
            setLength("");
          }}
        >
          <p className="font-display text-xl">Record a run</p>
          <Select value={fromId || "pick"} onValueChange={setFromId}>
            <SelectTrigger>
              <SelectValue placeholder="From" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pick">From</SelectItem>
              {doc.entities.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={toId || "pick"} onValueChange={setToId}>
            <SelectTrigger>
              <SelectValue placeholder="To" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pick">To</SelectItem>
              {doc.entities.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={cableType} onValueChange={(v) => setCableType(v as CableType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CABLE_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {CABLE_LABEL[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input placeholder="Label" value={label} onChange={(e) => setLabel(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Port A" value={fromPort} onChange={(e) => setFromPort(e.target.value)} />
            <Input placeholder="Port B" value={toPort} onChange={(e) => setToPort(e.target.value)} />
          </div>
          <Input placeholder="Length" value={length} onChange={(e) => setLength(e.target.value)} />
          <Button type="submit" className="w-full" disabled={!fromId || !toId || fromId === "pick" || toId === "pick"}>
            Add cable
          </Button>
        </form>
      </div>
    </div>
  );
}
