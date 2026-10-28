import type { Confidence, Grade, Status } from "../types";

export type PinKind = "scene" | "cctv" | "tower" | "home" | "witness" | "place";
export const KINDS: Record<PinKind, { label: string; name: string }> = {
  scene: { label: "S", name: "Crime scene" }, cctv: { label: "C", name: "CCTV camera" }, tower: { label: "T", name: "Cell tower" },
  home: { label: "H", name: "Home / stated location" }, witness: { label: "W", name: "Witness location" }, place: { label: "P", name: "Other place" },
};

export interface MapPin {
  custom?: boolean; kind?: PinKind;
  id: string; lat: number; lng: number; label: string; title: string; ref?: string;
  status: Status; confidence: Confidence; grade: Grade; rows: [string, string][];
}
/** Cell tower that covers the scene (coverage circle on the map). Sample case only. */
export const TOWER = { lat: 12.9776, lng: 77.642, radius: 700, name: "TWR-IND-02" };

export const MAP_PINS: MapPin[] = [
  { id: "S", lat: 12.9784, lng: 77.6408, label: "S", title: "Scene: Ravi's shop", ref: "L1", status: "verified", confidence: "high", grade: "A",
    rows: [["Why it matters", "Ravi was killed here between 9:30 and 11 pm."]] },
  { id: "C", lat: 12.9803, lng: 77.6385, label: "C", title: "CCTV camera, 1st Main", ref: "L2", status: "verified", confidence: "high", grade: "A",
    rows: [["Seen here", "White bike at 9:48 pm, plate ends 4471"]] },
  { id: "T", lat: 12.9776, lng: 77.642, label: "T", title: "Cell tower TWR-IND-02", status: "verified", confidence: "high", grade: "A",
    rows: [["Covers", "The shop and the streets around it, about 700 m"], ["Deepak's phone", "On this tower at 9:20 pm"], ["Manoj's phone", "On this tower at 10:15 pm"], ["Source", "Phone records"]] },
];