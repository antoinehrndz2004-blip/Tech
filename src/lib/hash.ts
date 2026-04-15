/**
 * SHA-256 of a Blob, returned as a lowercase hex string. Uses the Web Crypto
 * API which is available in all modern browsers and in Deno — no deps.
 */
export async function sha256Hex(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
