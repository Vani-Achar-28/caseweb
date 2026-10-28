import type { NodeData, LinkData, NodeType, Status, Confidence, Grade } from "../types";

export const NODES: NodeData[] = [
 {id:"P1",confidence:"high",grade:"A",type:"person",x:700,y:340,r:-1,w:130,h:168,title:"Ravi Shetty",role:"VICTIM",status:"verified",
  rows:[["Alias","Ravi bhai"],["Role in case","Victim, shop owner"],["Age","44"],["Phone","98450 11122"],["Last seen","14 Mar 2026, 8:30 pm"],["Known associates","Suresh Rao, Manoj Kumar, Anita Shetty"],["Background","Runs an electronics shop on 100 Feet Road. Business dispute with partner."]]},
 {id:"P2",confidence:"medium",grade:"B",type:"person",x:360,y:130,r:-3,w:118,h:150,title:"Suresh Rao",role:"SUSPECT",status:"pending",
  rows:[["Alias","Sures"],["Role in case","Business partner"],["Phone","98450 33344"],["Known associates","Ravi Shetty, Deepak Naik"],["Background","Rs 12 lakh stock payment dispute with Ravi."]]},
 {id:"P3",confidence:"medium",grade:"B",type:"person",x:1130,y:130,r:2,w:118,h:150,title:"Manoj Kumar",role:"SUSPECT",status:"pending",
  rows:[["Alias","Manu"],["Role in case","Borrower (Rs 4 lakh)"],["Phone","98450 55566"],["Statement","Says he stayed home in Koramangala all evening."],["Known associates","Ravi Shetty, Deepak Naik"]]},
 {id:"P4",confidence:"low",grade:"C",type:"person",x:1050,y:560,r:3,w:118,h:150,title:"Deepak Naik",role:"UNKNOWN",status:"unverified",
  rows:[["Alias","Deepu"],["Role in case","Not yet named in any statement"],["Vehicle","White bike KA 01 HJ 4471"],["Known associates","Suresh Rao (brother)"]]},
 {id:"P5",confidence:"medium",grade:"B",type:"person",x:1000,y:340,r:-2,w:112,h:146,title:"Kiran Gowda",role:"WITNESS",status:"verified",
  rows:[["Role in case","Neighbour"],["Statement","Heard two men shouting around 10 pm. One voice sounded like Manoj."],["Reliability","Heard through a wall, treat as a pointer only."]]},
 {id:"P6",confidence:"high",grade:"A",type:"person",x:330,y:430,r:2,w:112,h:146,title:"Anita Shetty",role:"FAMILY",status:"verified",
  rows:[["Role in case","Wife of victim"],["Phone","98450 77788"],["Statement","Ravi left the house at 8:30 pm to close the shop."]]},
 {id:"M1",confidence:"medium",grade:"B",type:"media",x:1230,y:360,r:3,w:158,h:128,title:"CCTV still, 1st Main",
  rows:[["Source","Municipal CCTV CAM-03"],["Captured","14 Mar 2026, 9:48 pm"],["Uploaded","15 Mar 2026, 11:10 am"],["Identified","White bike, plate KA 01 ?? 4471"],["Verified","Pending vehicle records match"]],status:"pending",art:"cctv"},
 {id:"M2",confidence:"low",grade:"C",type:"media",x:830,y:110,r:-2,w:150,h:150,title:"Instagram: @manoj_k_official",
  rows:[["Source","Public Instagram post"],["Captured","14 Mar 2026, 9:40 pm (tag)"],["Uploaded","16 Mar 2026"],["Identified","Tag: Indiranagar"],["Verified","Upload time not confirmed with platform"]],status:"unverified",art:"post"},
 {id:"L1",confidence:"high",grade:"A",type:"location",x:640,y:90,r:1.5,w:150,h:96,title:"Ravi's electronics shop",
  rows:[["Address","100 Feet Road, Indiranagar"],["Coordinates","12.9784, 77.6408"],["Why it matters","Scene of the murder"],["Cell tower","TWR-IND-02"]],status:"verified"},
 {id:"L2",confidence:"high",grade:"A",type:"location",x:1280,y:600,r:-2,w:130,h:90,title:"1st Main Road",
  rows:[["Address","1st Main, Indiranagar"],["Why it matters","CCTV camera location, 200 m from shop"]],status:"verified"},
 {id:"EV1",confidence:"high",grade:"A",type:"evidence",x:500,y:560,r:-2,w:140,h:108,title:"E1 Blood stain",
  rows:[["Found at","Shop floor, near body"],["Collected by","SI Prakash, 15 Mar"],["Custody","Lab FSL Bengaluru"],["DNA result","Matches victim"]],status:"verified"},
 {id:"EV2",confidence:"medium",grade:"B",type:"evidence",x:180,y:260,r:3,w:140,h:108,title:"E2 Kitchen knife",
  rows:[["Found at","Behind plant pot, shop back door"],["Collected by","SI Prakash, 15 Mar"],["Custody","No handover recorded"],["DNA result","Full match: Manoj Kumar"]],status:"pending"},
 {id:"EV3",confidence:"high",grade:"A",type:"evidence",x:800,y:600,r:2,w:140,h:108,title:"E3 Hair strand",
  rows:[["Found at","Victim's right hand"],["Custody","Lab FSL Bengaluru"],["DNA result","Match: Deepak Naik, partial: Suresh Rao"]],status:"verified"},
 {id:"EV4",confidence:"high",grade:"A",type:"event",x:540,y:330,r:-2,w:150,h:96,title:"Murder, 9:30 to 11 pm",
  rows:[["When","14 Mar 2026, 9:30 to 11:00 pm"],["Where","Ravi's shop"],["Cause","3 stab wounds, defensive cut on left palm"]],status:"verified"},
 {id:"EV5",confidence:"high",grade:"B",type:"event",x:170,y:90,r:-3,w:150,h:96,title:"Partners' dispute reported",
  rows:[["When","2 Feb 2026"],["Source","The Deccan Courier"],["Summary","Ravi and Suresh accuse each other over Rs 12 lakh of stock payments."]],status:"verified"},
 {id:"D1",confidence:"high",grade:"A",type:"doc",x:1300,y:150,r:3,w:140,h:104,title:"Bank statement, Ravi",
  rows:[["Document","A/c ending 4417"],["Key entry","12 Jan: UPI to Manoj Kumar, Rs 4,00,000"],["Note","No repayment seen"]],status:"verified"},
 {id:"D2",confidence:"high",grade:"B",type:"doc",x:150,y:480,r:-2,w:140,h:104,title:"Letter: Ravi to Manoj",
  rows:[["Found","Drawer of Ravi's shop"],["Text","Rs 4,00,000 by the 10th or I tell your father."],["Why it matters","Possible motive. Not proof."]],status:"verified"},
 {id:"N1",type:"note",x:220,y:640,r:-4,w:128,h:100,title:"Why was the knife hidden behind the plant pot?",c:"#e8d98a",rows:[]},
 {id:"N2",type:"note",x:640,y:700,r:3,w:128,h:100,title:"Who is Deepak? Not in any statement.",c:"#e5b7c4",rows:[]},
 {id:"N3",type:"note",x:1200,y:250,r:-3,w:120,h:92,title:"Manoj says home all evening. CHECK!",c:"#b8d9ea",rows:[]},
];

export const LINKS: LinkData[] = [
 ["EV4","P1","cause of death"],["L1","EV4","scene"],["EV1","P1","blood is the victim's"],
 ["EV2","P3","DNA full match"],["EV3","P4","DNA full match"],["EV3","P2","DNA partial, brother",1],
 ["P2","P1","business dispute"],["EV5","P2","dispute reported"],["EV5","P1","dispute reported"],
 ["D1","P1","Ravi's account"],["D1","P3","Rs 4 lakh sent"],["D2","P1","written by Ravi"],["D2","P3","addressed to Manoj"],
 ["M2","P3","post tagged Indiranagar",1],["M1","P4","plate matches?",1],["M1","L2","camera location"],
 ["P5","P1","neighbour"],["P5","P3","voice like Manoj?",1],["P6","P1","wife"],["P2","P4","brothers"],["P3","P4","called each other"],
 ["N1","EV2","?",1],["N2","P4","?",1],["N3","P3","check",1],
];

export const TABS: Record<string, NodeType[] | null> = {CASE:null,EVIDENCE:["evidence","media"],STATEMENTS:["note","person"],DOCUMENTS:["doc"],MAP:["location","event"]};
export const TYPE_LABEL: Record<NodeType, string> = {person:"PERSON",media:"PHOTO / MEDIA",location:"LOCATION",event:"EVENT",evidence:"EVIDENCE",doc:"DOCUMENT",note:"INVESTIGATOR NOTE"};
export const STATUS_TXT: Record<Status, string> = {verified:"Verified",pending:"Pending",unverified:"Unverified"};
export const CONF_TXT: Record<Confidence, string> = { high: "High", medium: "Medium", low: "Low" };
export const GRADE_TXT: Record<Grade, string> = { A: "A, reliable source", B: "B, usually reliable", C: "C, unproven source" };