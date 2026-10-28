import type { Confidence, Grade, Status } from "../types";

/** Where the murder happened (the shop). Used by the rules to decide "near the scene". */
export const SCENE = { lat: 12.9784, lng: 77.6408 };

/** What a person claims in their statement. The rules check these claims against the evidence. */
export type Claim =
  | { type: "alibi"; place: string; lat: number; lng: number; from: string; to: string }
  | { type: "call"; with: string; at: string }
  | { type: "names"; person: string; at: string }
  | { type: "departure"; person: string; at: string };

export interface Statement {
  id: string; person: string; said: string; source: string; date: string;
  confidence: Confidence; grade: Grade; claims: Claim[];
}
export const STATEMENTS: Statement[] = [
  { id: "S1", person: "P3", said: "I was at home in Koramangala all evening on 14 March. I did not go to Indiranagar.",
    source: "Statement to Insp. Rao", date: "16 Mar 2026", confidence: "medium", grade: "B",
    claims: [{ type: "alibi", place: "home in Koramangala", lat: 12.9352, lng: 77.6245, from: "2026-03-14T20:00", to: "2026-03-14T23:30" }] },
  { id: "S2", person: "P2", said: "I spoke to Ravi on the phone around 8:40 pm about the stock money. After that I went home. I have not seen Ravi since.",
    source: "Statement to SI Prakash", date: "16 Mar 2026", confidence: "medium", grade: "B",
    claims: [{ type: "call", with: "P1", at: "2026-03-14T20:40" }] },
  { id: "S3", person: "P5", said: "Around 10 pm I heard two men shouting in Ravi's shop. One voice sounded like Manoj.",
    source: "Statement to SI Prakash", date: "15 Mar 2026", confidence: "low", grade: "B",
    claims: [{ type: "names", person: "P3", at: "2026-03-14T22:00" }] },
  { id: "S4", person: "P6", said: "Ravi left the house at about 8:30 pm to close the shop.",
    source: "Statement to Insp. Rao", date: "15 Mar 2026", confidence: "medium", grade: "B",
    claims: [{ type: "departure", person: "P1", at: "2026-03-14T20:30" }] },
];

export type FactKind = "call" | "tower" | "cctv" | "post" | "record" | "incident" | "other";
export const FACT_KINDS: Record<FactKind, string> = {
  call: "Phone call", tower: "Phone on a cell tower", cctv: "CCTV sighting", post: "Social media post",
  record: "Document or record", incident: "The incident (time window)", other: "Other",
};

/** One piece of evidence with a time. The timeline, the checks and the map are all built from these. */
export interface Fact {
  id: string; kind: FactKind;
  person: string;            // card id of the person it is about, or "" for general records
  with?: string;            // for calls: card id of the other person
  time: string;             // "2026-03-14T21:40", or just "2026-03-15" for a record with no time of day
  until?: string;           // for the incident: when the window ends
  lat?: number; lng?: number;
  title: string; detail: string; source: string;
  status: Status; confidence: Confidence; grade: Grade;
  ref?: string;             // optional linked card on the board
}
export const FACTS: Fact[] = [
  { id: "F1", kind: "call", person: "P3", with: "P1", time: "2026-03-14T20:05", title: "Manoj calls Ravi", detail: "Call of about 3 minutes.", source: "Phone records", status: "verified", confidence: "high", grade: "A" },
  { id: "F2", kind: "call", person: "P2", with: "P1", time: "2026-03-14T20:40", title: "Suresh calls Ravi", detail: "Call of about 2 minutes.", source: "Phone records", status: "verified", confidence: "high", grade: "A" },
  { id: "F3", kind: "call", person: "P3", with: "P4", time: "2026-03-14T21:10", title: "Manoj calls Deepak", detail: "Short call, one minute.", source: "Phone records", status: "verified", confidence: "high", grade: "A" },
  { id: "F4", kind: "tower", person: "P4", time: "2026-03-14T21:20", ...SCENE, title: "Deepak's phone on the scene tower", detail: "Used the tower covering the shop while calling Suresh. Ten minutes before the window.", source: "Phone records", status: "verified", confidence: "high", grade: "A" },
  { id: "F5", kind: "post", person: "P3", time: "2026-03-14T21:40", ...SCENE, title: "Instagram post tagged Indiranagar", detail: "Public post tagged Indiranagar. A tag can be edited later.", source: "Public Instagram post", status: "unverified", confidence: "low", grade: "C", ref: "M2" },
  { id: "F6", kind: "cctv", person: "P4", time: "2026-03-14T21:48", lat: 12.9803, lng: 77.6385, title: "White bike on CCTV (plate not confirmed)", detail: "Plate ends in 4471. Only part of the plate is readable.", source: "Municipal CCTV CAM-03", status: "pending", confidence: "medium", grade: "B", ref: "M1" },
  { id: "F7", kind: "tower", person: "P3", time: "2026-03-14T22:15", ...SCENE, title: "Manoj's phone on the scene tower", detail: "Phone used the tower covering the shop, inside the window.", source: "Phone records", status: "verified", confidence: "high", grade: "A" },
  { id: "F8", kind: "call", person: "P2", with: "P4", time: "2026-03-14T23:20", title: "Suresh calls Deepak", detail: "Call after the window ends.", source: "Phone records", status: "verified", confidence: "high", grade: "A" },
  { id: "F9", kind: "incident", person: "P1", time: "2026-03-14T21:30", until: "2026-03-14T23:00", title: "Time of death window", detail: "3 stab wounds, defensive cut on the left palm.", source: "Post-mortem report", status: "verified", confidence: "high", grade: "A", ref: "EV4" },
  { id: "F10", kind: "record", person: "", time: "2026-01-12", title: "Rs 4 lakh sent to Manoj", detail: "UPI transfer from Ravi's account. No repayment appears.", source: "Bank statement", status: "verified", confidence: "high", grade: "A", ref: "D1" },
  { id: "F11", kind: "record", person: "", time: "2026-02-02", title: "Partners' dispute in the news", detail: "Ravi and Suresh accuse each other over Rs 12 lakh of stock payments.", source: "The Deccan Courier", status: "verified", confidence: "high", grade: "B", ref: "EV5" },
  { id: "F12", kind: "record", person: "", time: "2026-03-15", title: "Letter found in Ravi's drawer", detail: "Ravi to Manoj: Rs 4,00,000 by the 10th or I tell your father.", source: "Collected from the shop", status: "verified", confidence: "high", grade: "B", ref: "D2" },
  { id: "F13", kind: "record", person: "", time: "2026-03-15", title: "Knife found behind plant pot", detail: "Found at the shop back door. DNA matches Manoj.", source: "SI Prakash", status: "pending", confidence: "medium", grade: "B", ref: "EV2" },
  { id: "F14", kind: "record", person: "", time: "2026-03-15", title: "Blood and hair collected", detail: "Both sent to the lab.", source: "SI Prakash", status: "verified", confidence: "high", grade: "A", ref: "EV1" },
];