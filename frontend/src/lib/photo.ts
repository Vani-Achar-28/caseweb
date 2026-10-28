export interface Photo { url: string; hash: string; name: string; at: string }

const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");

/** Shrinks the picture so it fits in browser storage. The fingerprint is made from the ORIGINAL file. */
async function shrink(blob: Blob, max = 600): Promise<string> {
  const bmp = await createImageBitmap(blob);
  const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.85);
}
export async function blobToPhoto(blob: Blob, name: string): Promise<Photo> {
  const hash = crypto.subtle ? hex(await crypto.subtle.digest("SHA-256", await blob.arrayBuffer())) : "";
  return { url: await shrink(blob), hash, name, at: new Date().toISOString() };
}
export const fileToPhoto = (f: File) => blobToPhoto(f, f.name);