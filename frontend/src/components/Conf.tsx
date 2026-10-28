import type { Confidence } from "../types";
export default function Conf({ level, abs }: { level: Confidence; abs?: boolean }) {
  return <span className={`conf ${level}${abs ? " abs" : ""}`} title={`Confidence: ${level}`}><i /><i /><i /></span>;
}