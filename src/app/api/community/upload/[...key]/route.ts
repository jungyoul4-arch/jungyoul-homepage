import { NextRequest } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// 익명 커뮤니티 첨부 이미지 GET. /api/admin/upload/[...key] 와 동일 로직.
// 인증 없음 — 공개 첨부물. R2 key prefix `community/` 로 어드민 자산과 격리.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key } = await params;
  if (key.some((segment) => segment.includes("..") || segment === "." || segment === "")) {
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
