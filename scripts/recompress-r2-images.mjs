#!/usr/bin/env node
/**
 * 기존 R2(jungyoul-images) 대용량 이미지 1회성 재압축 스크립트.
 *
 * 배경: 업로드 라우트가 과거에 원본을 압축 없이 저장해 16.5MB / 27MB 같은 카메라 원본
 * 썸네일이 그대로 서빙되어 사이트가 느려졌다(성능 진단 보고서 참조). 클라이언트 업로드
 * 리사이즈(src/lib/image-resize.ts)는 "앞으로의" 업로드만 막으므로, 이미 올라간 자산은
 * 이 스크립트로 한 번 정리한다.
 *
 * 동작:
 *  - R2 버킷의 객체를 나열 → 임계치(기본 300KB) 초과 이미지(jpeg/png/webp)만 대상
 *  - sharp 로 긴 변 maxEdge(기본 1920)까지 축소 + webp(q80) 재인코딩
 *  - 결과가 더 작으면 "동일 key" 로 덮어쓰기 + contentType=image/webp 갱신
 *    (key 불변이라 DB 참조 무수정. 서빙 라우트가 저장된 contentType 으로 응답하고
 *     응답에 X-Content-Type-Options: nosniff 가 있어 .jpg key + webp 본문도 정상 표시)
 *  - favicon/ 프리픽스는 next/og 가 png 로 재생성하므로 건드리지 않음
 *  - 기본은 DRY-RUN(절감량만 출력). 실제 적용은 `--apply` 필요.
 *
 * 사용:
 *   npm install            # sharp, @aws-sdk/client-s3 (devDependencies) 설치
 *   # R2 S3 API 자격증명(읽기/쓰기 권한 토큰) 환경변수로 주입
 *   export R2_ACCOUNT_ID=...           # Cloudflare 계정 ID
 *   export R2_ACCESS_KEY_ID=...        # R2 API 토큰 access key
 *   export R2_SECRET_ACCESS_KEY=...    # R2 API 토큰 secret
 *   node scripts/recompress-r2-images.mjs            # dry-run
 *   node scripts/recompress-r2-images.mjs --apply    # 실제 덮어쓰기
 *
 * 옵션: --bucket=<name>(기본 jungyoul-images) --max-edge=<px>(1920) --min-bytes=<n>(307200) --quality=<1-100>(80)
 */

import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import sharp from "sharp";

function arg(name, def) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=")[1] : def;
}
const APPLY = process.argv.includes("--apply");
const BUCKET = arg("bucket", "jungyoul-images");
const MAX_EDGE = Number(arg("max-edge", "1920"));
const MIN_BYTES = Number(arg("min-bytes", String(300 * 1024)));
const QUALITY = Number(arg("quality", "80"));

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.error(
    "환경변수 R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY 가 필요합니다.",
  );
  process.exit(1);
}

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;
const fmt = (n) => `${(n / 1024 / 1024).toFixed(2)}MB`;

async function bodyToBuffer(body) {
  const chunks = [];
  for await (const chunk of body) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function main() {
  console.log(
    `[recompress] bucket=${BUCKET} maxEdge=${MAX_EDGE} minBytes=${MIN_BYTES} quality=${QUALITY} mode=${APPLY ? "APPLY" : "DRY-RUN"}`,
  );

  let token;
  let scanned = 0;
  let candidates = 0;
  let rewritten = 0;
  let savedBytes = 0;

  do {
    const list = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        ContinuationToken: token,
      }),
    );
    token = list.IsTruncated ? list.NextContinuationToken : undefined;

    for (const obj of list.Contents ?? []) {
      const key = obj.Key;
      scanned++;
      if (!key || !IMAGE_EXT.test(key)) continue;
      if (key.startsWith("favicon/")) continue;
      if ((obj.Size ?? 0) <= MIN_BYTES) continue;
      candidates++;

      try {
        const got = await s3.send(
          new GetObjectCommand({ Bucket: BUCKET, Key: key }),
        );
        const input = await bodyToBuffer(got.Body);
        const meta = await sharp(input).metadata();
        const longest = Math.max(meta.width ?? 0, meta.height ?? 0);

        const pipeline = sharp(input).rotate(); // EXIF 회전 반영
        if (longest > MAX_EDGE) {
          pipeline.resize({
            width: meta.width >= meta.height ? MAX_EDGE : undefined,
            height: meta.height > meta.width ? MAX_EDGE : undefined,
            withoutEnlargement: true,
          });
        }
        const output = await pipeline.webp({ quality: QUALITY }).toBuffer();

        if (output.length >= input.length) {
          console.log(`  skip  ${key} (${fmt(input.length)} → webp ${fmt(output.length)}, 이득 없음)`);
          continue;
        }

        savedBytes += input.length - output.length;
        rewritten++;
        console.log(
          `  ${APPLY ? "rewrite" : "would"} ${key}  ${fmt(input.length)} → ${fmt(output.length)}  (-${fmt(input.length - output.length)})`,
        );

        if (APPLY) {
          await s3.send(
            new PutObjectCommand({
              Bucket: BUCKET,
              Key: key, // 동일 key 덮어쓰기 → DB 참조 유지
              Body: output,
              ContentType: "image/webp",
              CacheControl: "public, max-age=31536000, immutable",
            }),
          );
        }
      } catch (e) {
        console.warn(`  error ${key}: ${e instanceof Error ? e.message : e}`);
      }
    }
  } while (token);

  console.log(
    `\n[done] scanned=${scanned} candidates=${candidates} ${APPLY ? "rewritten" : "to-rewrite"}=${rewritten} saved=${fmt(savedBytes)}`,
  );
  if (!APPLY && rewritten > 0) {
    console.log("실제 적용하려면 --apply 플래그로 다시 실행하세요.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
