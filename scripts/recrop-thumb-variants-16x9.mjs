#!/usr/bin/env node
/**
 * 레거시 기사/하이라이트 썸네일의 카드 서빙용 변형(`@640.webp`/`@1280.webp`)을
 * 16:9 센터 크롭으로 "재생성(덮어쓰기)"하는 1회성 백필 스크립트.
 *
 * 배경: 업로드 시점 16:9 센터 크롭(클라이언트 resizeImageFile + 서버 thumbAspect)이
 * 도입되면서 신규 썸네일은 카드(16:9)를 여백 없이 채운다. 이미 올라간 레거시 자산은
 * 비-16:9 변형이 남아 있어 카드에 레터박스 여백이 보인다. 이 스크립트가 레거시
 * 썸네일의 변형만 16:9 로 다시 굽는다(Node + sharp, 로컬 실행 → transformation 과금 없음).
 * **R2 원본 키는 절대 수정하지 않는다** — 기사 상세 페이지는 계속 원본(풀 이미지)을 서빙.
 *
 * generate-r2-thumb-variants.mjs(없는 변형만 채움·덮어쓰기 없음)와 계약이 달라
 * 형제 스크립트로 분리했다(recompress-r2-images.mjs 와 같은 패턴).
 *
 * 동작:
 *  - `--keys=<file>` 필수: 한 줄에 하나씩 대상 키(또는 /api/admin/upload/... URL).
 *    전체 버킷 모드는 없다 — 커뮤니티 UGC·로고·favicon 을 16:9 로 잘라버리는 사고 방지.
 *    안전 가드: favicon/·incremental-cache/·community/ 프리픽스, `@` 포함(변형),
 *    이미지 확장자 불일치 키는 무조건 skip.
 *  - 각 원본 × [640,1280]: EXIF 방향 반영 치수 기준
 *      · 원본 비율이 이미 16:9(±1%) 이고 변형이 존재하면 skip (기존 변형도 ~16:9)
 *      · 아니면 sharp 센터 크롭(fit:cover) + webp(q80) → 변형 키 덮어쓰기
 *    업스케일 금지: 크롭 가능 폭(cropW = min(srcW, srcH·16/9)) 까지만 출력.
 *    주의: `withoutEnlargement: true` + 명시 width/height 는 작은 원본에서 리사이즈
 *    자체를 건너뛰어 비율 강제가 풀리므로 사용 금지 — 수동 클램프로 처리.
 *  - 기본은 DRY-RUN(생성 예정만 출력). 실제 적용은 `--apply` 필요.
 *
 * 변형 키/크롭 수학 규약은 src/lib/thumbnail.ts(variantObjectKey)·src/lib/image-crop.ts
 * (coverCropRect)가 SSOT — 아래는 .mjs 라 import 불가하여 동일 규약을 소량 복제했다.
 *
 * 사용 (1) 대상 키 추출 — D1 에서 기사/하이라이트 썸네일만:
 *   npx wrangler d1 execute jungyoul-db --remote --json --command \
 *     "SELECT thumbnail FROM articles WHERE thumbnail LIKE '/api/admin/upload/%' \
 *      UNION SELECT thumbnail FROM highlights WHERE thumbnail LIKE '/api/admin/upload/%';" \
 *     > /tmp/thumbs.json
 *   jq -r '.[0].results[].thumbnail' /tmp/thumbs.json > /tmp/thumb-keys.txt
 *   (URL 프리픽스/쿼리스트링은 스크립트가 알아서 정규화)
 *
 * 사용 (2) 실행:
 *   export R2_ACCOUNT_ID=...           # 또는 R2_ENDPOINT 직접 지정
 *   export R2_ACCESS_KEY_ID=...
 *   export R2_SECRET_ACCESS_KEY=...
 *   node scripts/recrop-thumb-variants-16x9.mjs --keys=/tmp/thumb-keys.txt           # dry-run
 *   node scripts/recrop-thumb-variants-16x9.mjs --keys=/tmp/thumb-keys.txt --apply   # 실제 적용
 *
 * 옵션: --bucket=<name>(기본 jungyoul-images) --quality=<1-100>(80)
 *
 * 적용 후 캐시 주의: 변형 URL(`?w=`)이 그대로라 1년 immutable 엣지 캐시가 남을 수 있다.
 * Cloudflare 대시보드에서 `/api/admin/upload/*` 경로 캐시 퍼지를 권장(또는 자연 만료 대기).
 */

import { readFileSync } from "node:fs";
import {
  S3Client,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import sharp from "sharp";

function arg(name, def) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=")[1] : def;
}
const APPLY = process.argv.includes("--apply");
const BUCKET = arg("bucket", "jungyoul-images");
const QUALITY = Number(arg("quality", "80"));
const KEYS_FILE = arg("keys", "");

// ── src/lib/thumbnail.ts · image-crop.ts 규약 복제(SSOT=src/lib) ──
const THUMB_WIDTHS = [640, 1280];
const RATIO = 16 / 9;
const EPSILON = 0.01; // 비율 상대 오차 1% 이내면 "이미 16:9" 로 간주
function variantObjectKey(objectKey, w) {
  const slash = objectKey.lastIndexOf("/");
  const dot = objectKey.lastIndexOf(".");
  const base = dot > slash ? objectKey.slice(0, dot) : objectKey;
  return `${base}@${w}.webp`;
}

if (!KEYS_FILE) {
  console.error(
    "--keys=<file> 가 필요합니다 (한 줄에 하나씩 R2 키 또는 /api/admin/upload/... URL).\n" +
      "전체 버킷 모드는 지원하지 않습니다 — 헤더의 D1 추출 절차를 참고하세요.",
  );
  process.exit(1);
}

// 복붙 시 끼어드는 공백/줄바꿈 제거(호스트명에 들어가면 TLS SNI 무효 → handshake 실패).
const ACCOUNT_ID = (process.env.R2_ACCOUNT_ID ?? "").trim();
const ACCESS_KEY_ID = (process.env.R2_ACCESS_KEY_ID ?? "").trim();
const SECRET_ACCESS_KEY = (process.env.R2_SECRET_ACCESS_KEY ?? "").trim();
const ENDPOINT =
  (process.env.R2_ENDPOINT ?? "").trim() ||
  (ACCOUNT_ID ? `https://${ACCOUNT_ID}.r2.cloudflarestorage.com` : "");

if (!ACCESS_KEY_ID || !SECRET_ACCESS_KEY || !ENDPOINT) {
  console.error(
    "환경변수 R2_ACCOUNT_ID(또는 R2_ENDPOINT) / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY 가 필요합니다.",
  );
  process.exit(1);
}
console.log(`[recrop] endpoint=${ENDPOINT}`);

const s3 = new S3Client({
  region: "auto",
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
});

const IMAGE_EXT = /\.(jpe?g|png|webp|gif)$/i;
const fmt = (n) => `${(n / 1024).toFixed(0)}KB`;

// URL/키 입력을 R2 키로 정규화: /api/admin/upload/ 프리픽스·쿼리스트링 제거.
function normalizeKey(line) {
  let k = line.trim();
  if (!k) return null;
  k = k.replace(/^\/api\/admin\/upload\//, "");
  k = k.replace(/\?.*$/, "");
  return k || null;
}

// 16:9 대상 외 자산 보호 가드 — keys 파일에 잘못 섞여 들어와도 절대 건드리지 않는다.
function isSafeTarget(key) {
  if (key.startsWith("favicon/")) return false;
  if (key.startsWith("incremental-cache/")) return false;
  if (key.startsWith("community/")) return false; // UGC — 16:9 크롭 금지
  if (key.includes("@")) return false; // 이미 변형 키
  if (key.startsWith("/api/")) return false; // 비-admin 업로드 URL 잔여물
  if (!IMAGE_EXT.test(key)) return false;
  return true;
}

async function bodyToBuffer(body) {
  const chunks = [];
  for await (const chunk of body) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function exists(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch (e) {
    if (e?.$metadata?.httpStatusCode === 404 || e?.name === "NotFound") return false;
    throw e;
  }
}

async function main() {
  const lines = readFileSync(KEYS_FILE, "utf8").split(/\r?\n/);
  const keys = [...new Set(lines.map(normalizeKey).filter(Boolean))];
  console.log(
    `[recrop] bucket=${BUCKET} widths=${THUMB_WIDTHS.join(",")} quality=${QUALITY} keys=${keys.length} mode=${APPLY ? "APPLY" : "DRY-RUN"}`,
  );

  let processed = 0;
  let created = 0;
  let skipped = 0;
  let guarded = 0;

  for (const key of keys) {
    if (!isSafeTarget(key)) {
      guarded++;
      console.warn(`  guard-skip ${key}`);
      continue;
    }
    processed++;

    let input;
    let srcW;
    let srcH;
    try {
      const got = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
      input = await bodyToBuffer(got.Body);
      const m = await sharp(input).metadata();
      // EXIF 방향(5~8)은 가로/세로가 뒤집힌 표시 방향 — 크롭 판단은 표시 기준으로.
      const swapped = (m.orientation ?? 1) >= 5;
      srcW = (swapped ? m.height : m.width) ?? 0;
      srcH = (swapped ? m.width : m.height) ?? 0;
      if (!srcW || !srcH) throw new Error("이미지 치수를 읽을 수 없음");
    } catch (e) {
      console.warn(`  error ${key}: ${e instanceof Error ? e.message : e}`);
      continue;
    }

    const alreadyTarget = Math.abs(srcW / srcH - RATIO) / RATIO <= EPSILON;
    // 업스케일 금지: 16:9 센터 크롭 후 사용 가능한 최대 폭.
    const cropW = Math.min(srcW, Math.round(srcH * RATIO));

    for (const w of THUMB_WIDTHS) {
      const vKey = variantObjectKey(key, w);
      try {
        // 원본이 이미 16:9 면 기존(폭 기준) 변형도 ~16:9 — 존재 시 재생성 불필요.
        if (alreadyTarget && (await exists(vKey))) {
          skipped++;
          continue;
        }

        const effW = Math.min(w, cropW);
        const effH = Math.max(1, Math.round(effW / RATIO));
        const output = await sharp(input, { animated: true }) // gif 대비; 정적 포맷 무영향
          .rotate() // EXIF 회전 반영
          .resize({ width: effW, height: effH, fit: "cover", position: "centre" })
          .webp({ quality: QUALITY })
          .toBuffer();

        created++;
        console.log(
          `  ${APPLY ? "recrop" : "would"} ${vKey}  ${srcW}x${srcH} -> ${effW}x${effH} (${fmt(output.length)})`,
        );
        if (APPLY) {
          await s3.send(
            new PutObjectCommand({
              Bucket: BUCKET,
              Key: vKey,
              Body: output,
              ContentType: "image/webp",
              CacheControl: "public, max-age=31536000, immutable",
            }),
          );
        }
      } catch (e) {
        console.warn(`  error ${vKey}: ${e instanceof Error ? e.message : e}`);
      }
    }
  }

  console.log(
    `\n[done] keys=${keys.length} processed=${processed} guard-skipped=${guarded} ${APPLY ? "recropped" : "to-recrop"}=${created} skipped=${skipped}`,
  );
  if (!APPLY && created > 0) {
    console.log("실제 적용하려면 --apply 플래그로 다시 실행하세요.");
    console.log("적용 후 Cloudflare 캐시 퍼지(/api/admin/upload/*)를 권장합니다.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
