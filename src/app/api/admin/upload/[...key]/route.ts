import { NextRequest } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key } = await params;

  // Path traversal 차단
  if (key.some((segment) => segment === ".." || segment === ".")) {
    return new Response("Invalid path", { status: 400 });
  }

  const objectKey = key.join("/");
  const { env } = await getCloudflareContext({ async: true });
  const object = await env.IMAGES_BUCKET.get(objectKey);

  if (!object) {
    return new Response("Not found", { status: 404 });
  }

  const headers = new Headers();
  headers.set("Content-Type", object.httpMetadata?.contentType || "image/jpeg");
  headers.set("Cache-Control", "public, max-age=31536000, immutable");

  return new Response(object.body, { headers });
}
