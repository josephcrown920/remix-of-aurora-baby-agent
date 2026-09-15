/** Persists generated media into Lovable Cloud storage so renders survive a reload. */

const BUCKET = "renders";
const SIGNED_TTL = 60 * 60 * 24 * 7;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function storeMedia(bytes: ArrayBuffer, path: string, contentType: string): Promise<string> {
  const db = await admin();
  const { error } = await db.storage.from(BUCKET).upload(path, bytes, { contentType, upsert: true });
  if (error) throw new Error(`Could not save the render: ${error.message}`);
  return path;
}

export async function signMedia(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  if (/^https?:|^data:/.test(path)) return path;
  const db = await admin();
  const { data, error } = await db.storage.from(BUCKET).createSignedUrl(path, SIGNED_TTL);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function storeDataUrl(dataUrl: string, path: string): Promise<string> {
  const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
  if (!match) throw new Error("Unexpected image payload.");
  const contentType = match[1]!;
  const binary = atob(match[2]!);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return storeMedia(bytes.buffer, path, contentType);
}

export async function storeRemote(url: string, path: string, contentType: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not download the render (${response.status}).`);
  return storeMedia(await response.arrayBuffer(), path, contentType);
}
