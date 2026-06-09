import { NextRequest } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

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

  // favicon 은 안정 키(favicon/favicon-32x32.png)로 로고 변경 시 덮어써지므로
  // 엣지 캐시에서 제외(브라우저 immutable 캐시는 기존과 동일). 그 외 업로드 자산은
  // 매번 유니크 키라 immutable 엣지 캐시가 안전.
  const cacheable = !objectKey.startsWith("favicon/");
  // caches.default 는 Cloudflare Workers 확장(표준 CacheStorage 타입에 없음).
  const cache =
    cacheable && typeof caches !== "undefined"
      ? (caches as unknown as { default: Cache }).default
      : undefined;
  if (cache) {
    const hit = await cache.match(request);
    if (hit) return hit;
  }

  const { env, ctx } = await getCloudflareContext({ async: true });
  const object = await env.IMAGES_BUCKET.get(objectKey);

  if (!object) {
    return new Response("Not found", { status: 404 });
  }

  const headers = new Headers();
  headers.set("Content-Type", object.httpMetadata?.contentType || "image/jpeg");
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  if (object.httpEtag) headers.set("ETag", object.httpEtag);

  const response = new Response(object.body, { headers });

  // 교차 사용자 재요청을 엣지에서 응답 → Worker 호출 + R2 GET 우회.
  if (cache) ctx?.waitUntil(cache.put(request, response.clone()));

  return response;
}
