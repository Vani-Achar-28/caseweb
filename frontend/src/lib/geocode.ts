export interface Hit { name: string; lat: number; lng: number }
const get = (k: string, d: string) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };

/** Searches real places with OpenStreetMap, inside the state chosen on the Map tab (Karnataka by default). */
export async function searchPlaces(q: string): Promise<Hit[]> {
  const state = get("caseweb.state", "Karnataka"), area = get("caseweb.area", "");
  const st = state === "All India" ? "" : state;
  const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=20&countrycodes=in&q=${encodeURIComponent([q, area, st].filter(Boolean).join(", "))}`);
  const j: { lat: string; lon: string; display_name: string; address?: { state?: string } }[] = await r.json();
  return j.filter((x) => !st || (x.address?.state ?? "").toLowerCase() === st.toLowerCase()).slice(0, 6).map((x) => ({ name: x.display_name, lat: +x.lat, lng: +x.lon }));
}