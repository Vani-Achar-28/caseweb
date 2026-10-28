const M = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "2026-03-14T21:40" becomes "9:40 pm". */
export const clock = (iso: string) => { const h = +iso.slice(11, 13); return `${h % 12 || 12}:${iso.slice(14, 16)} ${h < 12 ? "am" : "pm"}`; };
/** "2026-03-14" becomes "14 Mar 2026". */
export const day = (iso: string) => `${+iso.slice(8, 10)} ${M[+iso.slice(5, 7) - 1]} ${iso.slice(0, 4)}`;
export const whenText = (e: { when: string; until?: string }) =>
  e.when.length > 10 ? `${day(e.when)}, ${clock(e.when)}${e.until ? ` to ${clock(e.until)}` : ""}` : day(e.when);