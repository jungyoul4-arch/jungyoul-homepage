import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";

// ISR/SSG 증분 캐시를 R2 에 저장한다. 서버리스 인메모리 캐시는 휘발성이라 ISR 재검증이
// 인스턴스마다 어긋난다. 캐시 객체는 NEXT_INC_CACHE_R2_BUCKET 바인딩 버킷에
// `incremental-cache/` 프리픽스로 저장 — 사용자 업로드 키(articles/·community/ 등)와 분리된다.
export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
});
