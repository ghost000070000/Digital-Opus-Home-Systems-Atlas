import {
  createConnection,
  createContact,
  createEntity,
  createFloor,
  createMaintenance,
  createRelationship,
  createRoom,
  createSystem,
  emptyDocument,
} from "./document.ts";
import { DEMO_REVISION, type AtlasDocument, type CableType, type Entity, type EntityCategory, type EntityStatus, type RelationType, type Vec2 } from "./types.ts";

const F = {
  ground: "floor_ground",
  upper: "floor_upper",
  utility: "floor_utility",
};

const R = {
  living: "room_living",
  office: "room_office",
  closet: "room_closet",
  kitchen: "room_kitchen",
  garage: "room_garage",
  bedroom: "room_bedroom",
  workshop: "room_workshop",
};

const S = {
  internet: "sys_internet",
  entertainment: "sys_entertainment",
  office: "sys_office",
  security: "sys_security",
  heating: "sys_heating",
  backup: "sys_backup",
  gaming: "sys_gaming",
  smart: "sys_smart",
  storage: "sys_storage",
  workshop: "sys_workshop",
};

function pos(col: number, row: number, origin: Vec2, gapX = 220, gapY = 188): Vec2 {
  return { x: origin.x + col * gapX, y: origin.y + row * gapY };
}

function e(
  id: string,
  name: string,
  category: EntityCategory,
  roomId: string,
  systemIds: string[],
  position: Vec2,
  extra: Partial<Entity> = {},
): Entity {
  return createEntity({
    id,
    name,
    category,
    roomId,
    systemIds,
    position,
    status: (extra.status as EntityStatus) ?? "ok",
    ...extra,
  });
}

function rel(id: string, fromId: string, type: RelationType, toId: string, notes = "") {
  return createRelationship({ id, fromId, toId, type, notes });
}

function cab(
  id: string,
  fromId: string,
  toId: string,
  cableType: CableType,
  extra: {
    label?: string;
    fromPort?: string;
    toPort?: string;
    length?: string;
    spare?: boolean;
    active?: boolean;
    notes?: string;
  } = {},
) {
  return createConnection({ id, fromId, toId, cableType, ...extra });
}

/**
 * Willow House — a realistic mixed home / office / homelab used as dogfood.
 * Clearly marked as demo data.
 */
export function willowHouseDemo(): AtlasDocument {
  const doc = emptyDocument("Willow House");
  doc.meta.isDemo = true;
  doc.meta.demoRevision = DEMO_REVISION;
  doc.meta.createdAt = "2026-03-12T15:00:00.000Z";
  doc.meta.updatedAt = "2026-09-04T18:22:00.000Z";

  doc.floors = [
    createFloor({ id: F.ground, name: "Ground", notes: "Living, kitchen, garage, workshop.", order: 0 }),
    createFloor({ id: F.upper, name: "Upper", notes: "Office and bedroom.", order: 1 }),
    createFloor({ id: F.utility, name: "Utility", notes: "Server closet on the ground-floor hall.", order: 2 }),
  ];

  doc.rooms = [
    createRoom({ id: R.living, name: "Living Room", notes: "TV wall, seating, console cabinet.", floorId: F.ground }),
    createRoom({ id: R.office, name: "Home Office", notes: "Standing desk, two monitors, docking station.", floorId: F.upper }),
    createRoom({ id: R.closet, name: "Server Closet", notes: "12U rack, patch panel, UPS. Door stays closed.", floorId: F.utility }),
    createRoom({ id: R.kitchen, name: "Kitchen", notes: "Counter tablet and a few smart plugs.", floorId: F.ground }),
    createRoom({ id: R.garage, name: "Garage", notes: "Furnace, opener, driveway camera homerun.", floorId: F.ground }),
    createRoom({ id: R.bedroom, name: "Bedroom", notes: "Mesh AP and thermostat.", floorId: F.upper }),
    createRoom({ id: R.workshop, name: "Workshop", notes: "Bench PC and 3D printer.", floorId: F.ground }),
  ];

  doc.systems = [
    createSystem({ id: S.internet, name: "Internet", notes: "ONT → router → switch fabric → APs." }),
    createSystem({ id: S.entertainment, name: "Entertainment", notes: "TV, receiver, console, streaming." }),
    createSystem({ id: S.office, name: "Home Office", notes: "Workstation, dock, displays, printer." }),
    createSystem({ id: S.security, name: "Security", notes: "PoE cameras, doorbell, lock, NVR on NAS." }),
    createSystem({ id: S.heating, name: "Heating", notes: "Thermostat controls furnace." }),
    createSystem({ id: S.backup, name: "Backup Power", notes: "Closet UPS and office UPS. User-recorded only." }),
    createSystem({ id: S.gaming, name: "Gaming Setup", notes: "Gaming PC in the office plus living-room console." }),
    createSystem({ id: S.smart, name: "Smart Home", notes: "Home Assistant on a Pi with a Zigbee stick." }),
    createSystem({ id: S.storage, name: "Homelab Storage", notes: "NAS, drives, USB cold backup." }),
    createSystem({ id: S.workshop, name: "Workshop", notes: "Printer and bench machine." }),
  ];

  const living = { x: 200, y: 160 };
  const office = { x: 1480, y: 160 };
  const closet = { x: 2760, y: 80 };
  const kitchen = { x: 200, y: 1180 };
  const bedroom = { x: 1480, y: 1180 };
  const garage = { x: 2760, y: 1180 };
  const workshop = { x: 2760, y: 1880 };

  doc.entities = [
    e("ent_ont", "Fiber ONT", "network-endpoint", R.closet, [S.internet], pos(0, 0, closet), {
      label: "ONT-01",
      manufacturer: "Nokia",
      model: "G-010G-A",
      notes: "ISP handoff. Lives on the UPS.",
      critical: true,
      playbook: "ONT is ISP gear. Power-cycle once. If the LOS light stays red, call the fiber desk — not an electrician.",
    }),
    e("ent_router", "UDM Pro", "device", R.closet, [S.internet], pos(1, 0, closet), {
      label: "RTR-01",
      manufacturer: "Ubiquiti",
      model: "UDM-Pro",
      notes: "Gateway, IDS, and controller.",
      critical: true,
      purchase: { date: "2024-11-02", price: "379", vendor: "Ubiquiti", warrantyUntil: "2027-01-15" },
    }),
    e("ent_switch", "Core switch", "device", R.closet, [S.internet], pos(2, 0, closet), {
      label: "SW-CORE",
      manufacturer: "Ubiquiti",
      model: "USW-24",
      critical: true,
    }),
    e("ent_switch_spare", "Spare 8-port", "device", R.closet, [S.internet], pos(4, 0, closet), {
      label: "SW-SPARE",
      manufacturer: "Ubiquiti",
      model: "USW-Lite-8",
      status: "spare",
      spareForId: "ent_switch",
      notes: "Shelf spare. Not in the rack.",
    }),
    e("ent_poe", "PoE switch", "device", R.closet, [S.internet, S.security], pos(1, 1, closet), {
      label: "SW-POE",
      manufacturer: "Ubiquiti",
      model: "USW-16-PoE",
    }),
    e("ent_patch", "Patch panel", "component", R.closet, [S.internet], pos(2, 1, closet), {
      label: "PATCH-01",
      notes: "24-port Cat6.",
    }),
    e("ent_pdu", "Rack PDU", "power-source", R.closet, [S.backup], pos(0, 1, closet), {
      label: "PDU-01",
      notes: "Metered PDU on the UPS output.",
    }),
    e("ent_ups_closet", "Closet UPS", "battery", R.closet, [S.backup, S.internet, S.storage], pos(0, 2, closet), {
      label: "UPS-CL",
      manufacturer: "CyberPower",
      model: "CP1500PFCLCD",
      notes: "Protects the rack. Not a generator.",
      critical: true,
      nextService: "2026-10-18",
      playbook:
        "If the closet UPS is on battery, shut the NAS down from DSM after ten minutes. Do not run the 3D printer from this circuit. ISP ONT dies with it — call the fiber desk if power is out more than an hour.",
      purchase: { date: "2024-04-18", price: "189.99", vendor: "Canada Computers", warrantyUntil: "2027-04-18" },
    }),
    e("ent_mains_closet", "Closet circuit", "power-source", R.closet, [S.backup], pos(0, 3, closet), {
      label: "CIRC-CL",
      notes: "Recorded as a dependency only — not a wiring plan.",
    }),
    e("ent_rack", "12U rack", "furniture", R.closet, [S.storage, S.internet], pos(1, 2, closet), {
      label: "RACK-01",
    }),
    e("ent_nas", "Synology NAS", "storage", R.closet, [S.storage, S.security, S.office], pos(2, 2, closet), {
      label: "NAS-01",
      manufacturer: "Synology",
      model: "DS923+",
      notes: "Files, Time Machine, camera recordings.",
      critical: true,
      nextService: "2026-11-01",
      playbook:
        "If the NAS is dark, check the UPS first. Cameras keep a local buffer for a few minutes. Do not rebuild the volume without the USB backup drive in the office.",
      purchase: { date: "2023-10-12", price: "649", vendor: "Memory Express", warrantyUntil: "2026-10-12" },
    }),
    e("ent_hdd_a", "HDD 8TB A", "storage", R.closet, [S.storage], pos(3, 2, closet), {
      label: "HDD-A",
      manufacturer: "Seagate",
      model: "IronWolf 8TB",
    }),
    e("ent_hdd_b", "HDD 8TB B", "storage", R.closet, [S.storage], pos(3, 3, closet), {
      label: "HDD-B",
      manufacturer: "Seagate",
      model: "IronWolf 8TB",
    }),
    e("ent_ssd", "NVMe cache", "storage", R.closet, [S.storage], pos(3, 1, closet), {
      label: "SSD-CACHE",
      manufacturer: "Samsung",
      model: "980 1TB",
    }),
    e("ent_pi", "Home Assistant Pi", "controller", R.closet, [S.smart], pos(2, 3, closet), {
      label: "HA-PI",
      manufacturer: "Raspberry Pi",
      model: "Pi 5 8GB",
    }),
    e("ent_hub", "Zigbee stick", "controller", R.closet, [S.smart], pos(3, 0, closet), {
      label: "ZIG-01",
      manufacturer: "Sonoff",
      model: "ZBdongle-E",
    }),
    e("ent_backup_drive", "USB backup drive", "storage", R.office, [S.storage], pos(3, 3, office), {
      label: "USB-BAK",
      notes: "Cold backup, usually unplugged.",
      status: "spare",
    }),

    e("ent_workstation", "Office workstation", "device", R.office, [S.office], pos(1, 1, office), {
      label: "WS-01",
      manufacturer: "Framework",
      model: "Desktop",
    }),
    e("ent_laptop", "Laptop", "device", R.office, [S.office], pos(0, 1, office), {
      label: "LAP-01",
      manufacturer: "Framework",
      model: "13",
    }),
    e("ent_dock", "Thunderbolt dock", "accessory", R.office, [S.office], pos(1, 2, office), {
      label: "DOCK-01",
      manufacturer: "CalDigit",
      model: "TS4",
    }),
    e("ent_mon_a", "Monitor left", "device", R.office, [S.office], pos(0, 0, office), {
      label: "MON-L",
      manufacturer: "Dell",
      model: "U2723QE",
    }),
    e("ent_mon_b", "Monitor right", "device", R.office, [S.office], pos(1, 0, office), {
      label: "MON-R",
      manufacturer: "Dell",
      model: "U2723QE",
    }),
    e("ent_spk_office", "Office speakers", "accessory", R.office, [S.office], pos(2, 0, office), {
      label: "SPK-OF",
      manufacturer: "Audioengine",
      model: "A2+",
    }),
    e("ent_printer", "Office printer", "appliance", R.office, [S.office], pos(2, 2, office), {
      label: "PRT-01",
      manufacturer: "Brother",
      model: "HL-L3270CDW",
      notes: "Wi-Fi + ink/toner.",
    }),
    e("ent_labeler", "Label printer", "appliance", R.office, [S.office], pos(2, 3, office), {
      label: "LBL-01",
      manufacturer: "Brother",
      model: "PT-P710BT",
    }),
    e("ent_ups_office", "Office UPS", "battery", R.office, [S.backup, S.office], pos(0, 2, office), {
      label: "UPS-OF",
      manufacturer: "APC",
      model: "BR1500MS",
    }),
    e("ent_strip_office", "Office power strip", "power-source", R.office, [S.backup], pos(0, 3, office), {
      label: "STRIP-OF",
    }),
    e("ent_mains_office", "Office circuit", "power-source", R.office, [S.backup], pos(-1, 3, office), {
      label: "CIRC-OF",
      notes: "Recorded dependency, not a wiring diagram.",
    }),
    e("ent_gpc", "Gaming PC", "device", R.office, [S.gaming, S.office], pos(3, 1, office), {
      label: "GPC-01",
      manufacturer: "Custom",
      model: "Ryzen build",
    }),
    e("ent_gmon", "Ultrawide monitor", "device", R.office, [S.gaming], pos(3, 0, office), {
      label: "MON-UW",
      manufacturer: "LG",
      model: "34WN80C",
    }),
    e("ent_gspk", "Gaming speakers", "accessory", R.office, [S.gaming], pos(2, 1, office), {
      label: "SPK-GM",
    }),

    e("ent_tv", "Living TV", "appliance", R.living, [S.entertainment], pos(1, 0, living), {
      label: "TV-01",
      manufacturer: "LG",
      model: "C3 65",
    }),
    e("ent_avr", "AV receiver", "device", R.living, [S.entertainment], pos(1, 1, living), {
      label: "AVR-01",
      manufacturer: "Denon",
      model: "AVR-S970H",
    }),
    e("ent_console", "Game console", "device", R.living, [S.entertainment, S.gaming], pos(0, 1, living), {
      label: "CON-01",
      manufacturer: "Sony",
      model: "PlayStation 5",
    }),
    e("ent_stream", "Streaming box", "device", R.living, [S.entertainment], pos(2, 1, living), {
      label: "STR-01",
      manufacturer: "Apple",
      model: "TV 4K",
    }),
    e("ent_sub", "Subwoofer", "accessory", R.living, [S.entertainment], pos(0, 2, living), {
      label: "SUB-01",
    }),
    e("ent_soundbar", "Front speakers", "accessory", R.living, [S.entertainment], pos(2, 0, living), {
      label: "SPK-LR",
    }),
    e("ent_strip_living", "Living power strip", "power-source", R.living, [S.backup, S.entertainment], pos(1, 2, living), {
      label: "STRIP-LR",
    }),
    e("ent_mains_living", "Living circuit", "power-source", R.living, [S.backup], pos(1, 3, living), {
      label: "CIRC-LR",
    }),
    e("ent_ap_living", "Mesh AP living", "network-endpoint", R.living, [S.internet, S.smart], pos(2, 2, living), {
      label: "AP-LR",
      manufacturer: "Ubiquiti",
      model: "U6+",
    }),

    e("ent_ap_bedroom", "Mesh AP bedroom", "network-endpoint", R.bedroom, [S.internet], pos(0, 0, bedroom), {
      label: "AP-BR",
      manufacturer: "Ubiquiti",
      model: "U6+",
    }),
    e("ent_thermo", "Thermostat", "controller", R.bedroom, [S.heating, S.smart], pos(1, 0, bedroom), {
      label: "THM-01",
      manufacturer: "Ecobee",
      model: "Smart Thermostat",
      critical: true,
    }),
    e("ent_smoke", "Smoke sensor", "sensor", R.bedroom, [S.smart, S.security], pos(1, 1, bedroom), {
      label: "SMK-01",
    }),

    e("ent_kettle", "Kettle", "appliance", R.kitchen, [S.smart], pos(0, 0, kitchen), {
      label: "KTL-01",
      notes: "On a smart plug. Isolated on purpose.",
    }),
    e("ent_plug_kitchen", "Kitchen smart plug", "controller", R.kitchen, [S.smart], pos(1, 0, kitchen), {
      label: "PLG-KT",
    }),

    e("ent_furnace", "Furnace", "appliance", R.garage, [S.heating], pos(0, 1, garage), {
      label: "FURN-01",
      notes: "Controlled by the thermostat. No wiring advice.",
      critical: true,
      nextService: "2026-09-01",
      playbook: "If the house is cold, check the thermostat first. Filter was last changed in spring. Call HVAC — do not open the cabinet.",
    }),
    e("ent_mains_garage", "Garage circuit", "power-source", R.garage, [S.backup, S.heating], pos(0, 2, garage), {
      label: "CIRC-GA",
    }),
    e("ent_opener", "Garage door opener", "appliance", R.garage, [S.smart, S.security], pos(1, 1, garage), {
      label: "GDO-01",
    }),
    e("ent_cam_drive", "Driveway camera", "sensor", R.garage, [S.security], pos(2, 0, garage), {
      label: "CAM-DR",
      manufacturer: "Ubiquiti",
      model: "G4 Bullet",
    }),
    e("ent_cam_front", "Front camera", "sensor", R.living, [S.security], pos(0, 0, living), {
      label: "CAM-FR",
      manufacturer: "Ubiquiti",
      model: "G4 Pro",
    }),
    e("ent_doorbell", "Video doorbell", "sensor", R.living, [S.security], pos(0, 3, living), {
      label: "BELL-01",
      manufacturer: "Ubiquiti",
      model: "G4 Doorbell",
    }),
    e("ent_lock", "Front smart lock", "controller", R.living, [S.smart, S.security], pos(-1, 0, living), {
      label: "LOCK-01",
    }),

    e("ent_bench_pc", "Bench PC", "device", R.workshop, [S.workshop], pos(0, 0, workshop), {
      label: "BENCH-01",
    }),
    e("ent_printer3d", "3D printer", "appliance", R.workshop, [S.workshop], pos(1, 0, workshop), {
      label: "P3D-01",
      manufacturer: "Bambu",
      model: "P1S",
    }),
    e("ent_strip_workshop", "Workshop power strip", "power-source", R.workshop, [S.workshop], pos(0, 1, workshop), {
      label: "STRIP-WS",
    }),
  ];

  doc.relationships = [
    rel("rel_ont_ups", "ent_ont", "powered-by", "ent_ups_closet"),
    rel("rel_rtr_ups", "ent_router", "powered-by", "ent_ups_closet"),
    rel("rel_sw_pdu", "ent_switch", "powered-by", "ent_pdu"),
    rel("rel_poe_pdu", "ent_poe", "powered-by", "ent_pdu"),
    rel("rel_pdu_ups", "ent_pdu", "powered-by", "ent_ups_closet"),
    rel("rel_nas_ups", "ent_nas", "powered-by", "ent_ups_closet"),
    rel("rel_pi_ups", "ent_pi", "powered-by", "ent_ups_closet"),
    rel("rel_ups_mains", "ent_ups_closet", "powered-by", "ent_mains_closet"),
    rel("rel_ups_protect_rtr", "ent_ups_closet", "protects", "ent_router"),
    rel("rel_ups_protect_ont", "ent_ups_closet", "protects", "ent_ont"),
    rel("rel_ups_protect_nas", "ent_ups_closet", "protects", "ent_nas"),
    rel("rel_ups_protect_sw", "ent_ups_closet", "protects", "ent_switch"),
    rel("rel_rtr_ont", "ent_router", "depends-on", "ent_ont"),
    rel("rel_sw_rtr", "ent_switch", "connected-to", "ent_router"),
    rel("rel_poe_sw", "ent_poe", "connected-to", "ent_switch"),
    rel("rel_nas_sw", "ent_nas", "routes-through", "ent_switch"),
    rel("rel_pi_sw", "ent_pi", "connected-to", "ent_switch"),
    rel("rel_ap_poe", "ent_ap_living", "connected-to", "ent_poe"),
    rel("rel_apb_poe", "ent_ap_bedroom", "connected-to", "ent_poe"),
    rel("rel_patch_sw", "ent_switch", "routes-through", "ent_patch"),
    rel("rel_rack_nas", "ent_rack", "contains", "ent_nas"),
    rel("rel_rack_sw", "ent_rack", "contains", "ent_switch"),
    rel("rel_rack_rtr", "ent_rack", "contains", "ent_router"),
    rel("rel_rack_pdu", "ent_rack", "contains", "ent_pdu"),
    rel("rel_hdd_a", "ent_hdd_a", "installed-in", "ent_nas"),
    rel("rel_hdd_b", "ent_hdd_b", "installed-in", "ent_nas"),
    rel("rel_ssd", "ent_ssd", "installed-in", "ent_nas"),
    rel("rel_hub_pi", "ent_hub", "installed-in", "ent_pi"),
    rel("rel_bak_nas", "ent_backup_drive", "backs-up", "ent_nas"),
    rel("rel_nas_ws", "ent_nas", "stores-data-for", "ent_workstation"),
    rel("rel_nas_gpc", "ent_nas", "stores-data-for", "ent_gpc"),
    rel("rel_nas_camf", "ent_nas", "stores-data-for", "ent_cam_front"),
    rel("rel_nas_camd", "ent_nas", "stores-data-for", "ent_cam_drive"),

    rel("rel_ws_ups", "ent_workstation", "powered-by", "ent_ups_office"),
    rel("rel_dock_strip", "ent_dock", "powered-by", "ent_strip_office"),
    rel("rel_prt_strip", "ent_printer", "powered-by", "ent_strip_office"),
    rel("rel_gpc_strip", "ent_gpc", "powered-by", "ent_strip_office"),
    rel("rel_ups_of_strip", "ent_ups_office", "powered-by", "ent_strip_office"),
    rel("rel_strip_of_mains", "ent_strip_office", "powered-by", "ent_mains_office"),
    rel("rel_ups_of_ws", "ent_ups_office", "protects", "ent_workstation"),
    rel("rel_ups_of_dock", "ent_ups_office", "protects", "ent_dock"),
    rel("rel_ws_dock", "ent_workstation", "connected-to", "ent_dock"),
    rel("rel_lap_dock", "ent_laptop", "connected-to", "ent_dock"),
    rel("rel_dock_charges", "ent_dock", "charges", "ent_laptop"),
    rel("rel_dock_mona", "ent_dock", "provides-signal-to", "ent_mon_a"),
    rel("rel_dock_monb", "ent_dock", "provides-signal-to", "ent_mon_b"),
    rel("rel_dock_spk", "ent_dock", "provides-signal-to", "ent_spk_office"),
    rel("rel_dock_sw", "ent_dock", "routes-through", "ent_switch"),
    rel("rel_gpc_sw", "ent_gpc", "connected-to", "ent_switch"),
    rel("rel_gpc_gmon", "ent_gpc", "provides-signal-to", "ent_gmon"),
    rel("rel_gpc_gspk", "ent_gpc", "provides-signal-to", "ent_gspk"),
    rel("rel_prt_ap", "ent_printer", "depends-on", "ent_ap_living"),
    rel("rel_lap_ap", "ent_laptop", "depends-on", "ent_ap_living"),
    rel("rel_lbl_prt", "ent_labeler", "connected-to", "ent_workstation"),

    rel("rel_tv_strip", "ent_tv", "powered-by", "ent_strip_living"),
    rel("rel_avr_strip", "ent_avr", "powered-by", "ent_strip_living"),
    rel("rel_con_strip", "ent_console", "powered-by", "ent_strip_living"),
    rel("rel_str_strip", "ent_stream", "powered-by", "ent_strip_living"),
    rel("rel_sub_strip", "ent_sub", "powered-by", "ent_strip_living"),
    rel("rel_strip_lr_mains", "ent_strip_living", "powered-by", "ent_mains_living"),
    rel("rel_avr_tv", "ent_avr", "provides-signal-to", "ent_tv"),
    rel("rel_con_avr", "ent_console", "provides-signal-to", "ent_avr"),
    rel("rel_str_avr", "ent_stream", "provides-signal-to", "ent_avr"),
    rel("rel_avr_sub", "ent_avr", "provides-signal-to", "ent_sub"),
    rel("rel_avr_spk", "ent_avr", "provides-signal-to", "ent_soundbar"),
    rel("rel_tv_ap", "ent_tv", "depends-on", "ent_ap_living"),
    rel("rel_str_ap", "ent_stream", "depends-on", "ent_ap_living"),
    rel("rel_con_ap", "ent_console", "depends-on", "ent_ap_living"),

    rel("rel_camf_poe", "ent_cam_front", "powered-by", "ent_poe"),
    rel("rel_camd_poe", "ent_cam_drive", "powered-by", "ent_poe"),
    rel("rel_camf_data", "ent_cam_front", "provides-data-to", "ent_nas"),
    rel("rel_camd_data", "ent_cam_drive", "provides-data-to", "ent_nas"),
    rel("rel_bell_ap", "ent_doorbell", "depends-on", "ent_ap_living"),
    rel("rel_lock_hub", "ent_lock", "controlled-by", "ent_hub"),
    rel("rel_opener_hub", "ent_opener", "controlled-by", "ent_hub"),
    createRelationship({
      id: "rel_thermo_furnace",
      fromId: "ent_thermo",
      toId: "ent_furnace",
      type: "custom",
      notes: "Thermostat commands the furnace.",
      carriesFailure: true,
    }),
    createRelationship({
      id: "rel_pi_nas",
      fromId: "ent_pi",
      toId: "ent_nas",
      type: "custom",
      notes: "Home Assistant backups live on the NAS.",
      carriesFailure: true,
    }),
    rel("rel_spare_sw", "ent_switch_spare", "backs-up", "ent_switch"),
    rel("rel_furnace_ctrl", "ent_furnace", "controlled-by", "ent_thermo"),
    rel("rel_thermo_hub", "ent_thermo", "controlled-by", "ent_hub"),
    rel("rel_smoke_pi", "ent_smoke", "provides-data-to", "ent_pi"),
    rel("rel_furnace_mains", "ent_furnace", "powered-by", "ent_mains_garage"),
    rel("rel_opener_mains", "ent_opener", "powered-by", "ent_mains_garage"),
    rel("rel_kettle_plug", "ent_kettle", "controlled-by", "ent_plug_kitchen"),
    rel("rel_plug_ap", "ent_plug_kitchen", "depends-on", "ent_ap_living"),
    rel("rel_ap_living_power", "ent_ap_living", "powered-by", "ent_poe"),
    rel("rel_ap_bed_power", "ent_ap_bedroom", "powered-by", "ent_poe"),

    rel("rel_bench_strip", "ent_bench_pc", "powered-by", "ent_strip_workshop"),
    rel("rel_p3d_strip", "ent_printer3d", "powered-by", "ent_strip_workshop"),
    rel("rel_strip_ws_mains", "ent_strip_workshop", "powered-by", "ent_mains_garage"),
    rel("rel_p3d_ap", "ent_printer3d", "depends-on", "ent_ap_living"),
    rel("rel_bench_ap", "ent_bench_pc", "depends-on", "ent_ap_living"),
  ];

  doc.connections = [
    cab("cab_eth_rtr_sw", "ent_router", "ent_switch", "ethernet", {
      label: "ETH-SW1-P01",
      fromPort: "LAN 1",
      toPort: "1",
      length: "0.5 m",
    }),
    cab("cab_eth_sw_poe", "ent_switch", "ent_poe", "ethernet", {
      label: "ETH-SW1-P02",
      fromPort: "2",
      toPort: "SFP/1",
      length: "0.5 m",
    }),
    cab("cab_eth_sw_nas", "ent_switch", "ent_nas", "ethernet", {
      label: "ETH-SW1-P07",
      fromPort: "7",
      toPort: "LAN 1",
      length: "0.5 m",
    }),
    cab("cab_eth_sw_dock", "ent_switch", "ent_dock", "ethernet", {
      label: "ETH-OF-DOCK",
      fromPort: "11",
      toPort: "2.5G",
      length: "12 m",
    }),
    cab("cab_eth_sw_gpc", "ent_switch", "ent_gpc", "ethernet", {
      label: "ETH-OF-GPC",
      fromPort: "12",
      toPort: "NIC",
      length: "8 m",
    }),
    cab("cab_poe_ap", "ent_poe", "ent_ap_living", "poe", {
      label: "POE-AP-LR",
      fromPort: "3",
      length: "18 m",
    }),
    cab("cab_poe_apb", "ent_poe", "ent_ap_bedroom", "poe", {
      label: "POE-AP-BR",
      fromPort: "4",
      length: "22 m",
    }),
    cab("cab_poe_camf", "ent_poe", "ent_cam_front", "poe", {
      label: "POE-CAM-FR",
      fromPort: "5",
      length: "16 m",
    }),
    cab("cab_poe_camd", "ent_poe", "ent_cam_drive", "poe", {
      label: "POE-CAM-DR",
      fromPort: "6",
      length: "24 m",
    }),
    cab("cab_hdmi_con", "ent_console", "ent_avr", "hdmi", {
      label: "TV-HDMI-2",
      fromPort: "HDMI OUT",
      toPort: "HDMI 2",
      length: "2 m",
    }),
    cab("cab_hdmi_str", "ent_stream", "ent_avr", "hdmi", {
      label: "TV-HDMI-3",
      fromPort: "HDMI",
      toPort: "HDMI 3",
      length: "1.5 m",
    }),
    cab("cab_hdmi_avr_tv", "ent_avr", "ent_tv", "hdmi", {
      label: "TV-HDMI-ARC",
      fromPort: "MONITOR OUT",
      toPort: "HDMI ARC",
      length: "2 m",
    }),
    cab("cab_dp_gpc", "ent_gpc", "ent_gmon", "displayport", {
      label: "GPC-DP-1",
      fromPort: "DP 1",
      toPort: "DP IN",
      length: "1.5 m",
    }),
    cab("cab_usbc_lap", "ent_laptop", "ent_dock", "thunderbolt", {
      label: "LAP-TB4",
      fromPort: "TB4",
      toPort: "Host",
      length: "0.8 m",
    }),
    cab("cab_dp_mona", "ent_dock", "ent_mon_a", "displayport", {
      label: "DOCK-DP-L",
      fromPort: "DP",
      toPort: "DP",
      length: "1 m",
    }),
    cab("cab_hdmi_monb", "ent_dock", "ent_mon_b", "hdmi", {
      label: "DOCK-HDMI-R",
      fromPort: "HDMI",
      toPort: "HDMI",
      length: "1 m",
    }),
    cab("cab_spare_eth", "ent_patch", "ent_switch", "ethernet", {
      label: "ETH-SPARE-08",
      fromPort: "8",
      toPort: "8",
      spare: true,
      active: false,
      notes: "Spare run, not in service.",
    }),
  ];

  doc.maintenance = [
    createMaintenance({
      id: "mnt_1",
      entityId: "ent_nas",
      kind: "firmware-updated",
      date: "2026-08-02",
      notes: "DSM update applied.",
    }),
    createMaintenance({
      id: "mnt_2",
      entityId: "ent_ups_closet",
      kind: "battery-changed",
      date: "2026-04-18",
      notes: "Replaced internal battery.",
    }),
    createMaintenance({
      id: "mnt_4",
      entityId: "ent_printer",
      kind: "cleaned",
      date: "2026-06-11",
      notes: "Paper path cleared.",
    }),
  ];

  doc.contacts = [
    createContact({
      id: "who_alex",
      name: "Alex",
      role: "Household",
      phone: "604-555-0142",
      notes: "Knows the rack password envelope.",
    }),
    createContact({
      id: "who_fiber",
      name: "Fiber desk",
      role: "ISP",
      phone: "1-800-555-0199",
      notes: "Account on the ONT sticker.",
    }),
    createContact({
      id: "who_hvac",
      name: "North Shore HVAC",
      role: "Heating",
      phone: "604-555-0177",
      notes: "Annual service in September.",
    }),
  ];

  return doc;
}

export function demoStats(doc: AtlasDocument = willowHouseDemo()) {
  return {
    entities: doc.entities.length,
    relationships: doc.relationships.length,
    rooms: doc.rooms.length,
    systems: doc.systems.length,
    connections: doc.connections.length,
    maintenance: doc.maintenance.length,
    floors: doc.floors.length,
    contacts: doc.contacts.length,
    critical: doc.entities.filter((e) => e.critical).length,
  };
}
