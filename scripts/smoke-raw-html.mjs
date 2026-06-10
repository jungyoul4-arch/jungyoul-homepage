#!/usr/bin/env node
//
// scripts/smoke-raw-html.mjs
//
// "HTML 소스 삽입" 원본 보존 모드의 end-to-end 회귀 스모크.
// processArticleHtml 의 영역 분기를 실서버 라운드트립으로 검증한다:
//   바깥(표준 영역)은 뉴스룸 정화, 안쪽(raw 영역)은 원형 보존 + <style> 스코프 강제.
//
// 흐름:
//   1. /api/auth/login 으로 admin 로그인 → 쿠키 획득
//   2. /api/admin/articles POST — 손상 표준 본문 + raw 영역(비스코프 <style> 포함) 동시 저장
//   3. /api/articles GET — 바깥 정화 / 안쪽 보존 / CSS 스코프 어설션
//   4. /articles/<slug> 공개 페이지 GET — 같은 어설션 (렌더 경로 processArticleHtml)
//   5. PUT 으로 저장본 재저장 → GET — 멱등(바이트 안정) 확인
//   6. DELETE 클린업
//
// 사용:
//   npm run dev   # 별 터미널에서 dev 서버 기동
//   ADMIN_USERNAME=... ADMIN_PASSWORD=... node scripts/smoke-raw-html.mjs
//
// 환경변수: BASE_URL (기본 http://localhost:3000), ADMIN_USERNAME/ADMIN_PASSWORD (필수)
// 종료 코드: 0 = 전부 통과, 1 = 실패

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const USERNAME = process.env.ADMIN_USERNAME;
const PASSWORD = process.env.ADMIN_PASSWORD;

if (!USERNAME || !PASSWORD) {
  console.error("ERROR: ADMIN_USERNAME 과 ADMIN_PASSWORD 환경변수가 필요합니다.");
  process.exit(1);
}

const RAW_ID = "feed0001";
// 비스코프 <style>(body 전역 규칙 + @media 포함) — 서버가 스코프해야 함.
// 인라인 font-size:11px / <h5> 는 뉴스룸 파이프라인이라면 제거됐을 시그니처.
const BODY = `
<p style="font-size:0.75rem;color:rgb(102,102,102)">바깥 손상 단락 — 정화 대상</p>
<div data-raw-html="${RAW_ID}" contenteditable="false">
  <style>body{background:#fafafa}.raw-hero{padding:40px;color:#123456}@media (max-width:600px){.raw-hero{padding:8px}}</style>
  <div class="raw-hero"><h5>raw 영역 h5 제목</h5><p style="font-size:11px;letter-spacing:2px">raw 원본 보존 단락</p></div>
</div>
<p>꼬리 표준 단락</p>
`;

const TEST_SLUG = `__smoke_raw_${Date.now()}`;
let cookie = null;
let articleId = null;
let failures = 0;

function assert(label, cond, evidence = "") {
  if (cond) console.log(`  ✓ ${label}`);
  else {
    console.error(`  ✗ ${label}${evidence ? `\n      ${evidence}` : ""}`);
    failures++;
  }
}

async function login() {
  console.log(`[1/6] login → ${BASE_URL}/api/auth/login`);
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
  });
  if (!res.ok) {
    console.error(`  로그인 실패: ${res.status} ${await res.text()}`);
    process.exit(1);
  }
  cookie =
    res.headers.getSetCookie?.()?.find?.((c) => c.startsWith("admin_token=")) ||
    res.headers.get("set-cookie");
  if (!cookie) {
    console.error("  Set-Cookie 헤더 누락");
    process.exit(1);
  }
  cookie = cookie.split(";")[0];
  console.log("  OK");
}

async function createArticle() {
  console.log(`[2/6] POST /api/admin/articles (slug=${TEST_SLUG})`);
  const res = await fetch(`${BASE_URL}/api/admin/articles`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      title: "스모크 raw HTML 보존 테스트",
      slug: TEST_SLUG,
      content: BODY,
      excerpt: "smoke raw 요약",
      category: "news",
      categoryLabel: "뉴스",
      date: "2026/06/10",
      author: "smoke-bot",
    }),
  });
  if (!res.ok) {
    console.error(`  생성 실패: ${res.status} ${await res.text()}`);
    process.exit(1);
  }
  articleId = (await res.json()).id;
  console.log(`  OK (id=${articleId})`);
}

async function fetchApiBody() {
  const res = await fetch(`${BASE_URL}/api/articles`, { headers: { Cookie: cookie } });
  const items = await res.json();
  const article = items.find?.((a) => a.slug === TEST_SLUG);
  return article?.content || "";
}

function splitRegions(body) {
  const idx = body.indexOf("data-raw-html");
  const start = body.lastIndexOf("<div", idx);
  const end = body.indexOf("꼬리 표준 단락");
  return {
    outside: body.slice(0, start) + body.slice(end),
    raw: body.slice(start, end),
  };
}

function assertBody(label, body) {
  const { outside, raw } = splitRegions(body);
  // 바깥(표준 영역): 뉴스룸 정화 유지
  assert(`${label}: 바깥 font-size 인라인 제거`, !/font-size\s*:/.test(outside));
  assert(`${label}: 바깥 color 인라인 제거`, !/color\s*:\s*rgb/.test(outside));
  assert(`${label}: 바깥 본문 잔존`, body.includes("바깥 손상 단락") && body.includes("꼬리 표준 단락"));
  // 안쪽(raw 영역): 원형 보존
  assert(`${label}: raw 래퍼 생존`, raw.includes(`data-raw-html="${RAW_ID}"`));
  assert(`${label}: raw 인라인 스타일 보존`, raw.includes("font-size:11px") && raw.includes("letter-spacing:2px"));
  assert(`${label}: raw <h5> 보존`, raw.includes("<h5>raw 영역 h5 제목</h5>"));
  assert(`${label}: raw class 보존`, raw.includes('class="raw-hero"'));
  // <style> 스코프 강제
  assert(`${label}: style 스코프 prefix 존재`, raw.includes(`[data-raw-html="${RAW_ID}"][data-raw-html][data-raw-html]`));
  assert(`${label}: data-raw-scoped 마킹`, raw.includes('data-raw-scoped="1"'));
  assert(`${label}: 비스코프 body{ 전역 규칙 없음`, !/[>{};\s]body\{/.test(raw));
  assert(`${label}: @media 보존`, raw.includes("@media (max-width:600px)"));
}

async function checkApi() {
  console.log(`[3/6] GET /api/articles → 영역 분기 어설션`);
  const body = await fetchApiBody();
  if (!body) {
    console.error("  생성한 글이 응답에 없음");
    failures++;
    return "";
  }
  assertBody("API body", body);
  return body;
}

async function checkPublicPage() {
  console.log(`[4/6] GET /articles/${TEST_SLUG} 공개 페이지`);
  const res = await fetch(`${BASE_URL}/articles/${TEST_SLUG}`);
  if (!res.ok) {
    console.error(`  공개 페이지 조회 실패: ${res.status}`);
    failures++;
    return;
  }
  const html = await res.text();
  // article-content div ~ 첫 </article> 사이만 검사 — 닫힘 체인이 </div></section></article> 라
  // 정규식(</div>\s*</article>) 매칭이 불가하고, </article> 뒤에는 본문 사본이 이스케이프로 박힌
  // Next.js RSC flight payload 가 있어 전체 HTML 검사 시 오탐이 난다.
  const start = html.indexOf('class="article-content');
  const end = html.indexOf("</article>", start);
  if (start < 0 || end < 0) {
    console.error("  article-content 세그먼트 추출 실패");
    failures++;
    return;
  }
  assertBody("public page", html.slice(start, end));
}

async function checkIdempotency(savedBody) {
  console.log(`[5/6] PUT 재저장 → 멱등(바이트 안정) 확인`);
  if (!savedBody) {
    console.error("  저장본 없음 — 건너뜀");
    failures++;
    return;
  }
  const res = await fetch(`${BASE_URL}/api/admin/articles/${articleId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ title: "스모크 raw HTML 보존 테스트", content: savedBody }),
  });
  if (!res.ok) {
    console.error(`  PUT 실패: ${res.status} ${await res.text()}`);
    failures++;
    return;
  }
  const after = await fetchApiBody();
  assert("멱등: 재저장 후 본문 바이트 동일", after === savedBody, `len ${savedBody.length} → ${after.length}`);
}

async function cleanup() {
  console.log(`[6/6] DELETE /api/admin/articles/${articleId}`);
  if (!articleId) return;
  const res = await fetch(`${BASE_URL}/api/admin/articles/${articleId}`, {
    method: "DELETE",
    headers: { Cookie: cookie },
  });
  console.log(`  ${res.ok ? "OK" : "WARN — 수동 정리 필요"} (status ${res.status})`);
}

async function main() {
  try {
    await login();
    await createArticle();
    const saved = await checkApi();
    await checkPublicPage();
    await checkIdempotency(saved);
  } catch (e) {
    console.error("스모크 중 예외:", e);
    failures++;
  } finally {
    await cleanup().catch(() => {});
  }
  console.log("");
  if (failures > 0) {
    console.error(`FAIL — ${failures} 어설션 실패`);
    process.exit(1);
  }
  console.log("PASS — 모든 어설션 통과");
  process.exit(0);
}

main();
