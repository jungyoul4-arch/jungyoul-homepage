import { THUMB_WIDTHS, variantObjectKey } from "@/lib/thumbnail";
import { THUMB_ASPECTS, type ThumbAspect } from "@/lib/image-crop";

/**
 * 업로드 원본에서 카드용 webp 변형(THUMB_WIDTHS = 640/1280)을 Cloudflare Images
 * 바인딩(`env.IMAGES`)으로 생성해 같은 R2 버킷의 변형 키(`{base}@{w}.webp`)에 저장한다.
 *
 * - best-effort: 실패한 폭은 건너뛰며, 서빙 라우트(`[...key]`)가 변형 부재 시 원본으로 폴백한다.
 * - 기본(폭만 지정) → scale-down 이라 업스케일하지 않는다(원본보다 좁은 폭이면 원본 폭 webp).
 * - `opts.aspect` 지정 시 fit:cover 센터 크롭으로 비율을 강제한다(16:9 → 640×360/1280×720).
 *   클라이언트 크롭(resizeImageFile)이 실패(fail-open)하거나 gif 처럼 클라이언트가
 *   재인코딩하지 않는 포맷에서도 카드 변형의 비율을 보장하는 유일한 보강선.
 *   주의: cover + 명시 높이는 작은 원본을 업스케일할 수 있다(비율 균일성을 위해 허용).
 * - 카드 업로드당 변형 폭 수만큼(현재 2개) Cloudflare Images transformation 을 소비한다.
 *   (무료 5,000/월) — 카드 대상 업로드에서만 호출할 것(`thumbVariants=1` 옵트인).
 */
export async function generateThumbVariants(
  env: CloudflareEnv,
  key: string,
  buf: ArrayBuffer,
  opts: { aspect?: ThumbAspect } = {},
): Promise<void> {
  const ratio = opts.aspect ? THUMB_ASPECTS[opts.aspect] : null;
  for (const w of THUMB_WIDTHS) {
    try {
      const transform = ratio
        ? { width: w, height: Math.round(w / ratio), fit: "cover" as const }
        : { width: w };
      const result = await env.IMAGES.input(new Blob([buf]).stream())
        .transform(transform)
        .output({ format: "image/webp", quality: 80 });
      const body = await result.response().arrayBuffer();
      await env.IMAGES_BUCKET.put(variantObjectKey(key, w), body, {
        httpMetadata: { contentType: "image/webp" },
      });
    } catch {
      // 변형 실패(미지원 포맷·일시 오류 등)는 무시 — 서빙이 원본 폴백.
    }
  }
}
