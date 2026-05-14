import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function getJwtSecret(): Promise<Uint8Array> {
  let secret: string | undefined;
  try {
    const { env } = await getCloudflareContext({ async: true });
    secret = env.JWT_SECRET;
  } catch {
    secret = process.env.JWT_SECRET;
  }
  if (!secret) throw new Error("JWT_SECRET is not configured");
  return new TextEncoder().encode(secret);
}
