import { NextRequest } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { isThumbWidth, variantObjectKey } from "@/lib/thumbnail";

// 익명 커뮤니티 첨부 이미지 GET. /api/admin/upload/[...key] 와 동일 로직.
// 인증 없음 — 공개 첨부물. R2 key prefix `community/` 로 어드민 자산과 격리.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key } = await params;
  if (key.some((segment) => segment.includes("..") || segment === "." || segment === "")) {
    return new Response("Invalid path", { status: 400 });
  }

  const objectKey = key.join("/");
  const { env } = await getCloudflareContext({ async: true });

  // ?w= 변형 우선 조회 → 없으면 원본으로 폴백(404 금지).
  const w = Number(new URL(request.url).searchParams.get("w"));
  const requestedVariant = isThumbWidth(w);
  const variant = requestedVariant
    ? await env.IMAGES_BUCKET.get(variantObjectKey(objectKey, w))
    : null;
  const object = variant ?? (await env.IMAGES_BUCKET.get(objectKey));

  if (!object) {
    return new Response("Not found", { status: 404 });
  }

  const headers = new Headers();
  headers.set(
    "Content-Type",
    variant ? "image/webp" : object.httpMetadata?.contentType || "image/jpeg"
  );
  headers.set(
    "Cache-Control",
    requestedVariant && !variant ? "public, max-age=3600" : "public, max-age=31536000, immutable"
  );
  if (object.httpEtag) headers.set("ETag", object.httpEtag);

  return new Response(object.body, { headers });
}
