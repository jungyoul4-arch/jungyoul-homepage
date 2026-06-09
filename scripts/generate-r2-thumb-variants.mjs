#!/usr/bin/env node
/**
 * 기존 R2(jungyoul-images) 업로드 원본에 대한 카드용 썸네일 변형(`@640.webp`/`@1280.webp`)
 * 1회성 백필 스크립트.
 *
 * 배경: 서빙 라우트(/api/{admin,community}/upload/[...key])가 `?w=` 로 사전 생성된 webp 변형을
 * 우선 서빙하고 없으면 원본으로 폴백한다. 신규 업로드는 업로드 라우트가 Cloudflare Images
 * 바인딩으로 변형을 생성하지만, 이미 올라간 레거시 자산은 변형이 없어 항상 원본 폴백 중이다.
 * 이 스크립트가 레거시 자산의 변형을 한 번 채운다(Node + sharp, 로컬 실행 → transformation 과금 없음).
 *
 * 동작:
 *  - R2 객체 나열 → 업로드 원본 이미지(jpeg/png/webp)만 대상. favicon/·incremental-cache/·
 *    이미 변형(`@` 포함)인 키는 제외.
 *  - 각 원본 × [640,1280]: 변형 키가 이미 있으면 skip(멱등). 원본 폭 ≤ w 면 skip(업스케일 금지).
 *    아니면 sharp 로 width 까지 축소 + webp(q80) → 변형 키로 PutObject.
 *  - 기본은 DRY-RUN(생성 예정만 출력). 실제 적용은 `--apply` 필요.
 *
 * 변형 키 규약은 src/lib/thumbnail.ts(THUMB_WIDTHS / variantObjectKey)가 SSOT — 아래는 .mjs 라
 * import 불가하여 동일 규약을 소량 복제했다(recompress-r2-images.mjs 와 같은 패턴).
 *
 * 사용:
 *   export R2_ACCOUNT_ID=...           # 또는 R2_ENDPOINT 직접 지정
 *   export R2_ACCESS_KEY_ID=...
 *   export R2_SECRET_ACCESS_KEY=...
 *   node scripts/generate-r2-thumb-variants.mjs            # dry-run
 *   node scripts/generate-r2-thumb-variants.mjs --apply    # 실제 생성
 *
 * 옵션: --bucket=<name>(기본 jungyoul-images) --quality=<1-100>(80)
 */

import {
  S3Client,
  ListObjectsV2Command,
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

// ── src/lib/thumbnail.ts 규약 복제(SSOT=thumbnail.ts) ──
const THUMB_WIDTHS = [640, 1280];
function variantObjectKey(objectKey, w) {
  const slash = objectKey.lastIndexOf("/");
  const dot = objectKey.lastIndexOf(".");
  const base = dot > slash ? objectKey.slice(0, dot) : objectKey;
  return `${base}@${w}.webp`;
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
console.log(`[variants] endpoint=${ENDPOINT}`);

const s3 = new S3Client({
  region: "auto",
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
});

const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;
const fmt = (n) => `${(n / 1024).toFixed(0)}KB`;

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
  console.log(
    `[variants] bucket=${BUCKET} widths=${THUMB_WIDTHS.join(",")} quality=${QUALITY} mode=${APPLY ? "APPLY" : "DRY-RUN"}`,
  );

  let token;
  let scanned = 0;
  let originals = 0;
  let created = 0;
  let skipped = 0;

  do {
    const list = await s3.send(
      new ListObjectsV2Command({ Bucket: BUCKET, ContinuationToken: token }),
    );
    token = list.IsTruncated ? list.NextContinuationToken : undefined;

    for (const obj of list.Contents ?? []) {
      const key = obj.Key;
      scanned++;
      if (!key || !IMAGE_EXT.test(key)) continue;
      if (key.startsWith("favicon/")) continue;
      if (key.startsWith("incremental-cache/")) continue;
      if (key.includes("@")) continue; // 이미 변형
      originals++;

      let input;
      let srcWidth;
      for (const w of THUMB_WIDTHS) {
        const vKey = variantObjectKey(key, w);
        try {
          if (await exists(vKey)) {
            skipped++;
            continue; // 멱등
          }
          // 원본/메타데이터는 첫 필요 시점에 1회만 로드.
          if (!input) {
            const got = await s3.send(
              new GetObjectCommand({ Bucket: BUCKET, Key: key }),
            );
            input = await bodyToBuffer(got.Body);
            srcWidth = (await sharp(input).metadata()).width ?? 0;
          }
          if (srcWidth && srcWidth <= w) {
            skipped++;
            continue; // 업스케일 금지 — 폴백이 원본 서빙
          }

          const output = await sharp(input)
            .rotate() // EXIF 회전 반영
            .resize({ width: w, withoutEnlargement: true })
            .webp({ quality: QUALITY })
            .toBuffer();

          created++;
          console.log(
            `  ${APPLY ? "create" : "would"} ${vKey}  (${fmt(output.length)})`,
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
  } while (token);

  console.log(
    `\n[done] scanned=${scanned} originals=${originals} ${APPLY ? "created" : "to-create"}=${created} skipped=${skipped}`,
  );
  if (!APPLY && created > 0) {
    console.log("실제 생성하려면 --apply 플래그로 다시 실행하세요.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
