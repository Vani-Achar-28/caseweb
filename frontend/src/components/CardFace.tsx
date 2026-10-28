import type { NodeData } from "../types";
import { TYPE_LABEL } from "../data/caseData";
import { ART, SIL } from "../data/art";
import Conf from "./Conf";

const PAPER: Partial<Record<NodeData["type"], string>> = { evidence: "evd", location: "loc", event: "evt" };

export default function CardFace({ n }: { n: NodeData }) {
  if (n.type === "person") {
    return (<>
      <div className="pol">
        <div className="ph">{n.photo ? <img src={n.photo} alt="" /> : <span dangerouslySetInnerHTML={{ __html: SIL }} />}</div>
        <div className="cap">{n.title}</div>
      </div>
      <div className="role">{n.role}</div>
      <i className={`vd ${n.status}`} />{n.confidence && <Conf level={n.confidence} abs />}
    </>);
  }
  if (n.type === "media") {
    return (<>
      <div className="pol">
        <div className="ph">{n.thumb ? <img src={n.thumb} alt="" /> : n.art ? <span dangerouslySetInnerHTML={{ __html: ART[n.art] }} /> : <div className="nophoto">NO PHOTO</div>}</div>
        <div className="cap" style={{ fontSize: 11 }}>{n.title}</div>
      </div>
      <i className={`vd ${n.status}`} />{n.confidence && <Conf level={n.confidence} abs />}
    </>);
  }
  if (n.type === "note") return <div className="sticky" style={{ ["--c" as string]: n.c }}>{n.title}</div>;
  const sub = (n.rows[1] ?? n.rows[0] ?? ["", ""])[1].slice(0, 60);
  return (<>
    <div className={`paper ${PAPER[n.type] ?? ""}`}>
      <div className="k">{TYPE_LABEL[n.type]}</div><b>{n.title}</b>{sub}
    </div>
    <i className={`vd ${n.status}`} />{n.confidence && <Conf level={n.confidence} abs />}
  </>);
}