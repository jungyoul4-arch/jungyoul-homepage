#!/usr/bin/env node
//
// scripts/debug-paste.mjs
//
// 임의 HTML 파일을 normalizePastedHtml 에 통과시켜 출력·진단 정보를 보여주는 ad-hoc 디버그 도구.
// vitest 의 합성 fixture 가 잡지 못하는 운영 데이터 회귀를 발견할 때 사용한다 (mistake-log 2026-05-19 교훈(6)).
//
// 사용:
//   # 운영 기사 본문 다운로드
//   curl -sL --globoff 'https://news.jung-youl.com/articles/[…]-xxxx' \
//     | node -e "let s=''; process.stdin.on('data',c=>s+=c).on('end',()=>{ \
//         const m = s.match(/<div class=\"article-content[^\"]*\"[^>]*>([\\s\\S]*?)<\\/article>/); \
//         process.stdout.write(m ? m[1] : '') })" > /tmp/body.html
//
//   # 정리 + 진단
//   node scripts/debug-paste.mjs /tmp/body.html
//
//   # 출력 저장 후 비교
//   node scripts/debug-paste.mjs /tmp/body.html > /tmp/body.after.html
//   diff <(cat /tmp/body.html) /tmp/body.after.html | head -40
//
// 종료 코드:
//   0 = 모든 진단 어설션 통과
//   1 = 하나 이상 실패 또는 파일 미존재

import { Window } from "happy-dom";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");

const inputPath = process.argv[2];
const outPath = process.argv[3] || null;

if (!inputPath) {
  console.error("usage: node scripts/debug-paste.mjs <input.html> [<output.html>]");
  console.error("  input.html  - 원본 HTML (운영 기사 본문 등)");
  console.error("  output.html - (선택) normalize 결과를 저장할 경로. 미지정 시 stdout.");
  process.exit(1);
}

// happy-dom 전역 주입
const window = new Window({ settings: { disableIframePageLoading: true } });
globalThis.DOMParser = window.DOMParser;
globalThis.document = window.document;
globalThis.Node = window.Node;
globalThis.File = window.File;
globalThis.atob = (s) => Buffer.from(s, "base64").toString("binary");

const { normalizePastedHtml } = await import(
  resolve(ROOT, "src/lib/normalize-paste.ts")
);

const input = readFileSync(inputPath, "utf8");
const out = await normalizePastedHtml(`<html><body>${input}</body></html>`);

console.error("=== STATS ===");
console.error(`input bytes:  ${input.length}`);
console.error(`output bytes: ${out.length}  (${((1 - out.length / input.length) * 100).toFixed(1)}% 감소)`);
console.error("");

console.error("=== ASSERTIONS ===");
let failures = 0;
const check = (label, cond, info = "") => {
  const sym = cond ? "✓" : "✗";
  console.error(`  ${sym} ${label}${info ? " — " + info : ""}`);
  if (!cond) failures++;
};

check("font-size 인라인 0개", !/font-size\s*:/.test(out));
check("lab() 색 0개", !out.includes("lab("));
check("색 인라인 (color:rgb/#…) 0개", !/(?<![a-z-])color\s*:\s*(rgb|#)/i.test(out));
check("background-color 인라인 0개", !/background-color/.test(out));
check("font-weight 인라인 0개", !/font-weight/.test(out));
check("3중 중첩 <figure> 0개", !/<figure[^>]*>\s*<figure[^>]*>\s*<figure/i.test(out));
check("<b><p> invalid 0개 (word boundary)", !/<b\b[^>]*>\s*<p/i.test(out));
check("빈 <p></p> 0개", !/<p>\s*<\/p>/.test(out));
check("빈 <p><br></p> 0개", !/<p>\s*<br\s*\/?\s*>\s*<\/p>/.test(out));

const figcaptions = (out.match(/<figcaption[^>]*>/g) || []).length;
const figures = (out.match(/<figure[^>]*>/g) || []).length;
console.error(`  figure 수: ${figures}`);
console.error(`  figcaption 수: ${figcaptions}`);
console.error("");

if (outPath) {
  writeFileSync(outPath, out);
  console.error(`output → ${outPath}`);
} else {
  process.stdout.write(out);
}

process.exit(failures > 0 ? 1 : 0);
