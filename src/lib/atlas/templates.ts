import {
  createConnection,
  createEntity,
  createRelationship,
  createRoom,
  createSystem,
  createFloor,
  emptyDocument,
} from "./document.ts";
import type { AtlasDocument } from "./types.ts";

export interface AtlasTemplate {
  id: string;
  name: string;
  blurb: string;
  build: () => AtlasDocument;
}

function apartment(): AtlasDocument {
  const doc = emptyDocument("Apartment");
  doc.floors = [createFloor({ id: "fl_apt", name: "Apartment", order: 0 })];
  doc.rooms = [
    createRoom({ id: "r_live", name: "Living", floorId: "fl_apt" }),
    createRoom({ id: "r_bed", name: "Bedroom", floorId: "fl_apt" }),
    createRoom({ id: "r_kit", name: "Kitchen", floorId: "fl_apt" }),
  ];
  doc.systems = [
    createSystem({ id: "s_net", name: "Internet" }),
    createSystem({ id: "s_av", name: "Entertainment" }),
  ];
  const p = (x: number, y: number) => ({ x, y });
  doc.entities = [
    createEntity({ id: "e_modem", name: "Cable modem", category: "network-endpoint", roomId: "r_live", systemIds: ["s_net"], position: p(200, 180), critical: true, label: "MDM" }),
    createEntity({ id: "e_router", name: "Wi-Fi router", category: "device", roomId: "r_live", systemIds: ["s_net"], position: p(420, 180), critical: true, label: "RTR" }),
    createEntity({ id: "e_strip", name: "TV strip", category: "power-source", roomId: "r_live", systemIds: ["s_av"], position: p(200, 380) }),
    createEntity({ id: "e_tv", name: "Television", category: "device", roomId: "r_live", systemIds: ["s_av"], position: p(420, 380) }),
    createEntity({ id: "e_console", name: "Console", category: "device", roomId: "r_live", systemIds: ["s_av"], position: p(640, 380) }),
    createEntity({ id: "e_ap", name: "Bedroom AP", category: "network-endpoint", roomId: "r_bed", systemIds: ["s_net"], position: p(980, 180) }),
    createEntity({ id: "e_lamp", name: "Bed lamp", category: "accessory", roomId: "r_bed", position: p(980, 380) }),
    createEntity({ id: "e_fridge", name: "Fridge", category: "appliance", roomId: "r_kit", position: p(200, 680) }),
  ];
  doc.relationships = [
    createRelationship({ fromId: "e_router", toId: "e_modem", type: "depends-on" }),
    createRelationship({ fromId: "e_modem", toId: "e_strip", type: "powered-by" }),
    createRelationship({ fromId: "e_router", toId: "e_strip", type: "powered-by" }),
    createRelationship({ fromId: "e_tv", toId: "e_strip", type: "powered-by" }),
    createRelationship({ fromId: "e_console", toId: "e_strip", type: "powered-by" }),
    createRelationship({ fromId: "e_console", toId: "e_tv", type: "provides-signal-to" }),
    createRelationship({ fromId: "e_ap", toId: "e_router", type: "depends-on" }),
    createRelationship({ fromId: "e_tv", toId: "e_router", type: "depends-on" }),
  ];
  doc.connections = [
    createConnection({ fromId: "e_modem", toId: "e_router", cableType: "ethernet", label: "WAN" }),
    createConnection({ fromId: "e_console", toId: "e_tv", cableType: "hdmi", label: "HDMI-1" }),
  ];
  return doc;
}

function homelab(): AtlasDocument {
  const doc = emptyDocument("Homelab closet");
  doc.floors = [createFloor({ id: "fl_util", name: "Utility", order: 0 })];
  doc.rooms = [
    createRoom({ id: "r_rack", name: "Rack closet", floorId: "fl_util" }),
    createRoom({ id: "r_desk", name: "Desk", floorId: "fl_util" }),
  ];
  doc.systems = [
    createSystem({ id: "s_net", name: "Network" }),
    createSystem({ id: "s_store", name: "Storage" }),
    createSystem({ id: "s_pwr", name: "Power" }),
  ];
  const p = (x: number, y: number) => ({ x, y });
  doc.entities = [
    createEntity({ id: "e_mains", name: "Closet circuit", category: "power-source", roomId: "r_rack", systemIds: ["s_pwr"], position: p(180, 420) }),
    createEntity({
      id: "e_ups",
      name: "Rack UPS",
      category: "battery",
      roomId: "r_rack",
      systemIds: ["s_pwr", "s_net"],
      position: p(180, 220),
      critical: true,
      playbook: "If the UPS beeps on battery, shut the NAS down cleanly after 10 minutes. Do not run the 3D printer from this circuit.",
    }),
    createEntity({ id: "e_pdu", name: "PDU", category: "power-source", roomId: "r_rack", systemIds: ["s_pwr"], position: p(400, 220) }),
    createEntity({ id: "e_sw", name: "Core switch", category: "device", roomId: "r_rack", systemIds: ["s_net"], position: p(620, 220), critical: true }),
    createEntity({ id: "e_nas", name: "NAS", category: "storage", roomId: "r_rack", systemIds: ["s_store"], position: p(840, 220), critical: true }),
    createEntity({ id: "e_host", name: "Lab host", category: "device", roomId: "r_rack", systemIds: ["s_net", "s_store"], position: p(620, 420) }),
    createEntity({ id: "e_spare", name: "Spare switch", category: "device", roomId: "r_rack", systemIds: ["s_net"], position: p(840, 420), status: "spare", spareForId: "e_sw" }),
    createEntity({ id: "e_pc", name: "Admin PC", category: "device", roomId: "r_desk", systemIds: ["s_net"], position: p(180, 720) }),
  ];
  doc.relationships = [
    createRelationship({ fromId: "e_ups", toId: "e_mains", type: "powered-by" }),
    createRelationship({ fromId: "e_pdu", toId: "e_ups", type: "powered-by" }),
    createRelationship({ fromId: "e_sw", toId: "e_pdu", type: "powered-by" }),
    createRelationship({ fromId: "e_nas", toId: "e_pdu", type: "powered-by" }),
    createRelationship({ fromId: "e_host", toId: "e_pdu", type: "powered-by" }),
    createRelationship({ fromId: "e_nas", toId: "e_sw", type: "connected-to" }),
    createRelationship({ fromId: "e_host", toId: "e_sw", type: "connected-to" }),
    createRelationship({ fromId: "e_pc", toId: "e_sw", type: "connected-to" }),
    createRelationship({ fromId: "e_spare", toId: "e_sw", type: "backs-up" }),
  ];
  return doc;
}

function smallOffice(): AtlasDocument {
  const doc = emptyDocument("Small office");
  doc.floors = [createFloor({ id: "fl_off", name: "Office floor", order: 0 })];
  doc.rooms = [
    createRoom({ id: "r_it", name: "IT closet", floorId: "fl_off" }),
    createRoom({ id: "r_work", name: "Work floor", floorId: "fl_off" }),
    createRoom({ id: "r_front", name: "Front desk", floorId: "fl_off" }),
  ];
  doc.systems = [
    createSystem({ id: "s_net", name: "Network" }),
    createSystem({ id: "s_print", name: "Print" }),
    createSystem({ id: "s_desk", name: "Desks" }),
  ];
  const p = (x: number, y: number) => ({ x, y });
  doc.entities = [
    createEntity({ id: "e_fw", name: "Firewall", category: "device", roomId: "r_it", systemIds: ["s_net"], position: p(200, 180), critical: true }),
    createEntity({ id: "e_sw", name: "PoE switch", category: "device", roomId: "r_it", systemIds: ["s_net"], position: p(420, 180), critical: true }),
    createEntity({ id: "e_ups", name: "Closet UPS", category: "battery", roomId: "r_it", systemIds: ["s_net"], position: p(200, 380), critical: true }),
    createEntity({ id: "e_ap", name: "Office AP", category: "network-endpoint", roomId: "r_work", systemIds: ["s_net"], position: p(860, 180) }),
    createEntity({ id: "e_ws1", name: "Desk A", category: "device", roomId: "r_work", systemIds: ["s_desk"], position: p(860, 380) }),
    createEntity({ id: "e_ws2", name: "Desk B", category: "device", roomId: "r_work", systemIds: ["s_desk"], position: p(1080, 380) }),
    createEntity({ id: "e_prn", name: "Printer", category: "device", roomId: "r_front", systemIds: ["s_print"], position: p(200, 680) }),
    createEntity({ id: "e_dock", name: "Front dock", category: "accessory", roomId: "r_front", systemIds: ["s_desk"], position: p(420, 680) }),
  ];
  doc.relationships = [
    createRelationship({ fromId: "e_fw", toId: "e_ups", type: "powered-by" }),
    createRelationship({ fromId: "e_sw", toId: "e_ups", type: "powered-by" }),
    createRelationship({ fromId: "e_sw", toId: "e_fw", type: "depends-on" }),
    createRelationship({ fromId: "e_ap", toId: "e_sw", type: "powered-by" }),
    createRelationship({ fromId: "e_ws1", toId: "e_sw", type: "connected-to" }),
    createRelationship({ fromId: "e_ws2", toId: "e_sw", type: "connected-to" }),
    createRelationship({ fromId: "e_prn", toId: "e_ap", type: "depends-on" }),
    createRelationship({ fromId: "e_dock", toId: "e_sw", type: "connected-to" }),
  ];
  doc.contacts = [
    { id: "who_isp", name: "ISP desk", role: "Internet", phone: "", notes: "Account on the firewall sticker." },
  ];
  return doc;
}

export const ATLAS_TEMPLATES: AtlasTemplate[] = [
  { id: "apartment", name: "Apartment", blurb: "Modem, Wi-Fi, TV, and a couple of rooms.", build: apartment },
  { id: "homelab", name: "Homelab closet", blurb: "UPS, switch, NAS, host, and a recorded spare.", build: homelab },
  { id: "office", name: "Small office", blurb: "Firewall, PoE, desks, printer, front dock.", build: smallOffice },
];