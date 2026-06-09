import { NextRequest } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { isThumbWidth, variantObjectKey } from "@/lib/thumbnail";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key } = await params;

  // Path traversal 차단
  if (key.some((segment) => segment.includes("..") || segment === "." || segment === "")) {
    return new Response("Invalid path", { status: 400 });
  }

  const objectKey = key.join("/");
  const { env } = await getCloudflareContext({ async: true });

  // ?w= 변형 우선 조회 → 없으면 원본으로 폴백(404 금지, 변형 생성 전에도 안전).
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
  // 변형을 실제로 서빙했거나 ?w 없는 원본 요청이면 1년 immutable.
  // 변형이 아직 없어 원본으로 폴백한 ?w 요청은 짧게 캐시 → 추후 변형 생성 시 반영.
  headers.set(
    "Cache-Control",
    requestedVariant && !variant ? "public, max-age=3600" : "public, max-age=31536000, immutable"
  );
  if (object.httpEtag) headers.set("ETag", object.httpEtag);

  return new Response(object.body, { headers });
}
