#!/usr/bin/env node
//
// scripts/smoke-paste-cleanup.mjs
//
// 빠른편집기 페이스트 정리 + 서버 sanitize 의 end-to-end 회귀 스모크.
// mistake-log 2026-05-15 교훈(4) 권장 패턴 (PUT → GET → 공개 페이지 한 번에 어설션).
//
// 흐름:
//   1. /api/auth/login 으로 admin 로그인 → 쿠키 획득
//   2. /api/admin/articles POST 로 Notion 시그니처가 박힌 본문 저장
//      (sanitize 가 적용되므로 저장본은 깨끗해야 함)
//   3. /api/articles GET 으로 본문 조회 → font-size:0.75rem, lab(, 깊은 중첩 figure 가 모두 0 인지
//   4. /articles/<slug> 공개 페이지 GET → 같은 어설션 (이중 sanitize 통과)
//   5. /api/admin/articles/<id> DELETE 로 클린업
//
// 사용:
//   npm run dev   # 별 터미널에서 dev 서버 기동
//   ADMIN_USERNAME=... ADMIN_PASSWORD=... node scripts/smoke-paste-cleanup.mjs
//
// 환경변수:
//   BASE_URL          (기본 http://localhost:3000)
//   ADMIN_USERNAME    (필수)
//   ADMIN_PASSWORD    (필수)
//
// 종료 코드:
//   0 = 모든 어설션 통과
//   1 = 어설션 실패 또는 네트워크 오류

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const USERNAME = process.env.ADMIN_USERNAME;
const PASSWORD = process.env.ADMIN_PASSWORD;

if (!USERNAME || !PASSWORD) {
  console.error("ERROR: ADMIN_USERNAME 과 ADMIN_PASSWORD 환경변수가 필요합니다.");
  console.error("  ADMIN_USERNAME=foo ADMIN_PASSWORD=bar node scripts/smoke-paste-cleanup.mjs");
  process.exit(1);
}

// Notion 시그니처를 가진 손상 본문 — d3a6632e 패턴 모사.
const DAMAGED_BODY = `
<div>
  <blockquote style="text-align:left"><figure><figure><figure><br/></figure></figure></figure></blockquote>
  <figure style="text-align:left">
    <figure>
      <figure>안녕하세요 — smoke 테스트 본문입니다.</figure>
      <figure><span>두 번째 단락 스팬.</span></figure>
    </figure>
  </figure>
  <figure>
    <figcaption>
      <p><b>[smoke 본문 시작]</b></p>
      <p>난이도 양극화 구조: <span style="font-size:0.75rem">이번 시험의</span> <span style="font-size:0.75rem">핵심 분석.</span></p>
      <p><img src="https://example.com/x.png" style="border:0px solid lab(90.952003 0 -0.000012);width:328px;color:rgb(102, 102, 102);background-color:rgb(255, 255, 255)"/></p>
      <b><p><b>▣ 섹션 헤더 invalid 마크업</b></p></b>
      <p></p>
      <p><br/></p>
    </figcaption>
  </figure>
</div>
`;

const TEST_SLUG = `__smoke_paste_${Date.now()}`;
let cookie = null;
let articleId = null;
let failures = 0;

function assert(label, cond, evidence = "") {
  if (cond) {
    console.log(`  ✓ ${label}`);
  } else {
    console.error(`  ✗ ${label}${evidence ? `\n      ${evidence}` : ""}`);
    failures++;
  }
}

async function login() {
  console.log(`[1/5] login → ${BASE_URL}/api/auth/login`);
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
  });
  if (!res.ok) {
    console.error(`  로그인 실패: ${res.status} ${await res.text()}`);
    process.exit(1);
  }
  cookie = res.headers
    .getSetCookie?.()
    ?.find?.((c) => c.startsWith("admin_token=")) ||
    res.headers.get("set-cookie");
  if (!cookie) {
    console.error("  Set-Cookie 헤더 누락");
    process.exit(1);
  }
  // 쿠키 attribute 잘라내고 name=value 만.
  cookie = cookie.split(";")[0];
  console.log(`  OK (cookie: ${cookie.slice(0, 30)}...)`);
}

async function createArticle() {
  console.log(`[2/5] POST /api/admin/articles (slug=${TEST_SLUG})`);
  const res = await fetch(`${BASE_URL}/api/admin/articles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({
      title: "스모크 페이스트 청소 테스트",
      slug: TEST_SLUG,
      content: DAMAGED_BODY,
      summary: "smoke",
      category: "news",
      subject: "수학",
      author: "smoke-bot",
      published: 1,
    }),
  });
  if (!res.ok) {
    console.error(`  생성 실패: ${res.status} ${await res.text()}`);
    process.exit(1);
  }
  const data = await res.json();
  articleId = data.id;
  console.log(`  OK (id=${articleId})`);
}

async function checkApiBody() {
  console.log(`[3/5] GET /api/articles → ${TEST_SLUG} body 조회`);
  const res = await fetch(`${BASE_URL}/api/articles`, {
    headers: { Cookie: cookie },
  });
  const items = await res.json();
  const article = items.find?.((a) => a.slug === TEST_SLUG);
  if (!article) {
    console.error("  생성한 글이 응답에 없음");
    failures++;
    return;
  }
  const body = article.content || "";
  assertCleanBody("API body", body);
}

async function checkPublicPage() {
  console.log(`[4/5] GET /articles/${TEST_SLUG} 공개 페이지`);
  const res = await fetch(`${BASE_URL}/articles/${TEST_SLUG}`);
  if (!res.ok) {
    console.error(`  공개 페이지 조회 실패: ${res.status}`);
    failures++;
    return;
  }
  const html = await res.text();
  // 공개 페이지는 .article-content div 안에 본문 dangerouslySetInnerHTML.
  const m = html.match(/<div class="article-content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/article>/);
  const body = m ? m[1] : html;
  assertCleanBody("public page", body);
}

function assertCleanBody(label, body) {
  assert(
    `${label}: font-size 인라인 없음`,
    !/font-size\s*:/.test(body),
    `발견: ${(body.match(/font-size[^;"]+/g) || []).slice(0, 2).join(", ")}`,
  );
  assert(`${label}: Notion lab() 색 없음`, !body.includes("lab("));
  assert(`${label}: 강제 width:328px 없음`, !/width\s*:\s*328px/.test(body));
  assert(
    `${label}: 3중 중첩 <figure> 없음`,
    !/<figure[^>]*>\s*<figure[^>]*>\s*<figure/i.test(body),
  );
  // <b\b 의 \b 는 word boundary — <br>, <base> 같은 다른 태그와의 false match 방지.
  assert(`${label}: invalid <b><p> 없음`, !/<b\b[^>]*>\s*<p/i.test(body));
  assert(`${label}: 빈 <p></p> 없음`, !/<p>\s*<\/p>/.test(body));
  assert(`${label}: 핵심 본문 잔존`, body.includes("smoke 테스트 본문"));
}

async function cleanup() {
  console.log(`[5/5] DELETE /api/admin/articles/${articleId}`);
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
    await checkApiBody();
    await checkPublicPage();
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
