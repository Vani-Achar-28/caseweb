export type NodeType = "person" | "media" | "location" | "event" | "evidence" | "doc" | "note";
export type Status = "verified" | "pending" | "unverified";
export type Confidence = "high" | "medium" | "low";
export type Grade = "A" | "B" | "C";
export interface NodeData {
  confidence?: Confidence; grade?: Grade;
  id: string; type: NodeType; x: number; y: number; r: number; w: number; h: number; title: string;
  rows: [string, string][]; role?: string; status?: Status; art?: "cctv" | "post"; c?: string; photo?: string; thumb?: string;
  photoMeta?: { hash: string; name: string; at: string };
}
/** [from, to, label, 1 = not confirmed yet] */
export type LinkData = [string, string, string, number?];
export type Pos = Record<string, { x: number; y: number }>;
export interface TimelineEntry {
  id: string; when: string; until?: string; lane?: string; title: string; detail: string; ref?: string;
  status: Status; confidence: Confidence; grade: Grade; source: string; flag?: string; claim?: boolean;
}
export interface Task {
  id: string; title: string; kind: "task" | "question"; status: "todo" | "doing" | "done";
  priority: "high" | "medium" | "low"; owner: string; due: string; from?: string;
}