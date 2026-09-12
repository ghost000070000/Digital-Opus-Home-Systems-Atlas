# Schema

Versioned document. `version` is currently `1`. Unknown future fields are ignored; older documents are opened as v1.

```
AtlasDocument
  version: number
  meta: { name, createdAt, updatedAt, isDemo }
  rooms: Room[]
  systems: System[]
  entities: Entity[]
  relationships: Relationship[]
  connections: Connection[]
  maintenance: MaintenanceEvent[]
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

Categories: device, appliance, component, service, cable, power-source, battery, network-endpoint, accessory, storage, sensor, controller, furniture, custom.

Statuses: ok, degraded, failed, offline, spare, unknown.

## Relationship

`fromId` → `toId` with a `type`. Direction is part of the meaning. See [relationship-model.md](relationship-model.md).

## Connection (cable inventory)

Optional physical run: type, ports, label, length, active/spare. Unplugging a cable in What-if treats matching relationships as removed.

## Migrations

`parseDocument` is the migration entry point. Duplicate IDs are regenerated. Relationships and cables that point at missing items are dropped. Unknown category / type values become `custom`.
