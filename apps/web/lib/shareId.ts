/** Encode/decode share data into a URL-safe ID (no DB needed).
 *  Uses URL-safe base64 encoding that works with any Unicode name. */

export interface ShareData {
  element: string;
  name: string;
}

const MAX_NAME_LENGTH = 50;

/** Encode share data to a URL-safe base64 string */
export function encodeShareId(data: ShareData): string {
  const safeName = data.name.slice(0, MAX_NAME_LENGTH);
  const json = JSON.stringify({ e: data.element, n: safeName });
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  const b64 = btoa(binary);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Decode a share ID back to share data. Returns null on invalid input. */
export function decodeShareId(id: string): ShareData | null {
  try {
    const b64 = id.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json);
    if (typeof parsed.e !== "string" || typeof parsed.n !== "string") return null;
    return { element: parsed.e, name: parsed.n.slice(0, MAX_NAME_LENGTH) };
  } catch {
    return null;
  }
}
