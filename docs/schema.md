# Schema

Versioned document. `version` is currently `2`. Unknown future fields are ignored; older documents are opened as v2.

```
AtlasDocument
  version: number
  meta: { name, createdAt, updatedAt, isDemo, demoRevision }
  floors: Floor[]
  rooms: Room[]          // room.floorId optional
  systems: System[]
  entities: Entity[]
  relationships: Relationship[]
  connections: Connection[]
  maintenance: MaintenanceEvent[]
  contacts: Contact[]
```

## Entity

Optional fields may be empty strings. Nothing is required except `id` and `name`.

- `id`, `name`, `category`, `status`
- `roomId` (nullable), `systemIds[]`
- `notes`, `manufacturer`, `model`, `serial`, `tags[]`, `label`
- `imageDataUrl` (optional local data URL)
- `purchase` { date, price, vendor, warrantyUntil }
- `custom` string map
- `position` { x, y } for the atlas
- `critical` boolean — include in the playbook
- `nextService` ISO date
- `playbook` free text
- `spareForId` optional entity this item replaces

Categories: device, appliance, component, service, cable, power-source, battery, network-endpoint, accessory, storage, sensor, controller, furniture, custom.

Statuses: ok, degraded, failed, offline, spare, unknown.

## Relationship

`fromId` → `toId` with a `type`. Direction is part of the meaning. See [relationship-model.md](relationship-model.md). Custom relations may set `carriesFailure` to participate in what-if.

## Floor

Optional grouping of rooms: `id`, `name`, `notes`, `order`.

## Contact

Local people for the playbook: `id`, `name`, `role`, `phone`, `notes`. Never uploaded.

## Connection (cable inventory)

Optional physical run: type, ports, label, length, active/spare. Unplugging a cable in What-if treats matching relationships as removed.

## Migrations

`parseDocument` is the migration entry point. Duplicate IDs are regenerated. Relationships and cables that point at missing items are dropped. Unknown category / type values become `custom`.
