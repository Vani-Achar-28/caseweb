import type { Task } from "../types";

export const SEED_TASKS: Task[] = [
  { id: "K1", title: "Who is Deepak Naik? He is in no statement.", kind: "question", status: "todo", priority: "high", owner: "Insp. Rao", due: "2026-03-20" },
  { id: "K2", title: "Why was the knife hidden behind the plant pot?", kind: "question", status: "todo", priority: "medium", owner: "", due: "" },
  { id: "K3", title: "Get the real upload time of Manoj's Instagram post from the platform", kind: "task", status: "doing", priority: "high", owner: "SI Prakash", due: "2026-03-22" },
  { id: "K4", title: "Match plate KA 01 HJ 4471 against vehicle records", kind: "task", status: "todo", priority: "high", owner: "SI Prakash", due: "" },
  { id: "K5", title: "Record the chain of custody for E2, the kitchen knife", kind: "task", status: "todo", priority: "medium", owner: "Lab liaison", due: "" },
  { id: "K6", title: "Collect the bank statement for Ravi's account", kind: "task", status: "done", priority: "medium", owner: "SI Prakash", due: "" },
];