# 기술 부채 인벤토리 (Tech Debt Inventory)

> 작성일: 2026-05-14 / 담당: act-team worker-5
> 근거 자료: `graphify-out/GRAPH_REPORT.md`, `docs/mistake-log.md`, `DEPENDENCY_AUDIT.md`, `drizzle/0000~0008`, `seed.sql`, `src/db/schema.ts`, `docs/community.md`(v2 미룬 항목), `docs/categories.md`, `docs/seo-checklist.md`, `docs/editor.md`
>
> 우선순위 표기:
> - **P0** — 데이터 손실/보안/운영 장애 직결. 즉시 처리.
> - **P1** — 사용자가 보는 기능에 회귀 가능, 또는 fresh-seed/배포 깨짐. 1주일 내.
> - **P2** — 유지보수 비용 누적. 다음 스프린트.
> - **P3** — 정리/문서/코드 위생. 시간 날 때.

---

## 0. 한 줄 요약

작은 코드베이스(155 파일, src ≈ 1만 LOC) 치고 **스키마 분기**, **벤더드 PDF.js 잡음**, **수동 .bak 백업**, **반복되는 "어드민 입력 ↔ 코드 변경" 결합** 4 가지가 누적 부채의 80% 를 차지한다. 보안 룰 자체는 헬퍼(`renderJsonLd`, `isUniqueConstraintError`, `sanitizeContent`)로 잘 추상화되어 있으나, 그 룰이 새 코드에 적용되었는지 *자동으로 보증하는 가드(테스트/CI)* 가 없다는 점이 메타 부채로 떠 있다.

---

## 1. 카테고리별 부채 인벤토리

### 1.1 DB 스키마 표류 (seed.sql ↔ drizzle migrations)

| ID | 항목 | 위험도 | 영향 범위 | 근거 | 권장 액션 |
|----|------|--------|-----------|------|-----------|
| DB-01 | `seed.sql` 이 drizzle 마이그레이션 0001 이후 모든 추가 테이블 누락 (`hero_slides`/`hero_slide_items`, `pinned_articles`, `nav_menus`, `site_settings`, `tracking_codes`, `header_links`, `exam_tag_options`, `community_*` 5종) | **P0** | fresh-seed 환경(로컬 검증, CI E2E, 재해복구) — `seed.sql` 로만 부트스트랩 시 RSC 가 즉시 500 (예: `/community` `/admin/header-links`, 이미 `/exam` 에서 동일 사고: mistake-log 2026-05-12) | `seed.sql:5-46` vs `src/db/schema.ts:66-180`. 0001~0008 의 `CREATE TABLE` 들이 seed.sql 에 없음 | (a) `seed.sql` 을 **drizzle 마이그레이션 전체 적용 결과** 와 동기화하거나, (b) 부트스트랩 절차를 `npx wrangler d1 migrations apply` 로 일원화하고 `seed.sql` 을 "샘플 데이터" 로 명시. 권장: (b). README/README 내 "데이터베이스" 섹션 명시 수정 |
| DB-02 | `articles.thumbnail_overlays` 컬럼이 `src/db/schema.ts:12` 에 있으나 `drizzle/0004_add_thumbnail_overlays.sql` 외 seed.sql 에는 없음 | **P1** | fresh-seed → `articles` insert 시 `thumbnail_overlays` 누락 허용(기본 ''). 다만 `highlights/teachers/videos` 동일 컬럼도 동일. `DB-01` 후속 처리에 흡수 | `schema.ts:12,28,38,47` | DB-01 과 함께 묶음 |
| DB-03 | `articles.category` CHECK 제약이 `seed.sql` 에는 있고(과거 검토 시) drizzle 마이그레이션엔 없음 — categories.md 자체가 두 곳을 동기화하라고 명시 | **P2** | 카테고리 enum 확장 시 grep 누락 위험(slides 페이지에서 한 번 발생: mistake-log 2026-05-11) | `docs/categories.md:11-12`, `seed.sql` (CHECK 제약 자체는 현재 파일에 없는 듯하나 docs 가 있다고 단언) | (a) seed.sql 현행 점검 후 docs 와 동기화, (b) drizzle 마이그레이션에 CHECK 추가 또는 docs 에서 CHECK 항목 삭제 |
| DB-04 | 0007 마이그레이션이 DDL + INSERT(시드 8행) 혼합 | **P2** | 시드 데이터를 다시 적용하면 안 되는 상황(운영 D1)에서 마이그레이션 재실행 위험은 `INSERT OR IGNORE` 로 막혀있으나, "마이그레이션 == 스키마 변경" 규약을 깬다 | `drizzle/0007_add_exam_tags.sql:12-20`, 같은 패턴 `0008:47-53` | 향후 마이그레이션은 DDL 만, 시드는 `seed.sql` 또는 별도 `seeds/*.sql` 로 분리 |
| DB-05 | 0006 의 `ALTER TABLE ... ADD image_url text DEFAULT ''` 만으로 어드민 폼·SSR 헤더 단일 소스가 imageUrl 우선으로 동작. 그러나 운영 D1 에 0006 미적용 시 코드가 컬럼을 SELECT 하다 500 (DB-01 류) | **P1** | 0007/0008 미적용 사고가 이미 있었으므로 0006 도 잠재 | `mistake-log.md 2026-05-12` 동일 패턴 | 모든 신규 DB-driven RSC 는 `try/catch + 빈 폴백` 패턴(`safeExamTagOptions` 모델) 의무화. lint 룰 또는 helper(`safeQuery<T>(db, fn, fallback)`) 도입 검토 |

### 1.2 벤더드 자산(PDF.js) 비대화

| ID | 항목 | 위험도 | 영향 범위 | 근거 | 권장 액션 |
|----|------|--------|-----------|------|-----------|
| PDF-01 | `public/pdfjs/pdf.worker.min.mjs` 가 코드그래프 god-node 12 개 중 8 개(`PDFDocument`, `Catalog`, `PartialEvaluator`, `XFAObject`, `ConfigNamespace`, `TemplateNamespace`, `warn`, `shadow` 등)를 차지하고 Community 0(390 노드)·1(72)·2(56)·4(59)·5(47)·8(31)·10~16 을 PDF.js 내부로 채움 | **P2** | 그래프/지식맵을 흐림, 대용량(~3MB) 정적 자산이 Cloudflare Pages 빌드/캐시 비용 가산. 코드는 적게 영향 — `knip.json`/`eslint`/`graphify` 이미 ignore 처리됨 | `GRAPH_REPORT.md:89-100`, `knip.json:3`, `DEPENDENCY_AUDIT.md` | (a) 동적 import + CDN 호스팅(pdf.worker)으로 자산 분리, (b) 그래프 분석에서 pdfjs 디렉터리 추가 무시(graphify config). 단기엔 (b), 장기엔 (a) |
| PDF-02 | `pdfjs-dist` v4 → v5 메이저 업데이트 보류 | **P3** | 보안 패치 누적 가능 | `DEPENDENCY_AUDIT.md:97-103` | v5 호환성 평가 후 다음 분기 업그레이드 |

### 1.3 작업 중 잔여물 (uncommitted / .bak / 진단 로깅)

| ID | 항목 | 위험도 | 영향 범위 | 근거 | 권장 액션 |
|----|------|--------|-----------|------|-----------|
| RES-01 | `.bak` 파일 7 개가 src 트리에 그대로 commit (`src/app/admin/slides/page.tsx.bak`, `(main)/privacy|faq|terms|about/page.tsx.bak`, `(main)/articles/[slug]/page.tsx.bak`, `components/latest-articles.tsx.bak`) | **P2** | (i) Next.js 라우터가 `.bak` 는 무시하지만 IDE/grep/리뷰 시 노이즈, (ii) graphify 그래프가 동일 함수명을 양쪽에서 추출, (iii) 보안 룰(예: JSON-LD escape) 회귀를 `.bak` 가 숨길 수 있음 | `find src -name "*.bak"`; `GRAPH_REPORT.md` Community 41(`AboutPage()`) 등 | `.bak` 전량 삭제 또는 `.gitignore`. 백업은 git 히스토리에 이미 있음 |
| RES-02 | `open-next.config.ts` 가 워킹트리에서 삭제 / `src/components/ui/button.tsx` 도 삭제 / 어드민 페이지 5 개(`exam-tag-options`/`header-links`/`nav-menus` page + 4 개 reorder route) 수정이 미커밋 | **P1** | 본 리포트가 다루는 표면이 현재 워킹트리에 반영된 상태. 다음 PR 묶음과의 충돌 가능 | `git status` (D open-next.config.ts, D src/components/ui/button.tsx, M src/app/admin/* etc.) | **반드시 작업 종료 시점에 의도된 변경인지 확인 후 commit 분리**. `open-next.config.ts` 부재 시 `npm run deploy` 가 OpenNext 기본값으로 동작하는지 검증 필요 |
| RES-03 | `content-editor.tsx` `handlePaste` 의 `console.info("[paste]", ...)` 진단 로깅이 운영 빌드에 포함됨 | **P3** | 프로덕션 콘솔 노이즈, 클라이언트 페이로드 일부가 콘솔에 노출 | `docs/editor.md:21` (스스로 "충분히 데이터 수집되면 별도 PR 로 제거" 라고 명시) | 디버그 종료 후 제거. 또는 `process.env.NODE_ENV !== "production"` 가드 |

### 1.4 보안 룰 가드레일 부재 (정책은 있는데 강제 수단이 없음)

| ID | 항목 | 위험도 | 영향 범위 | 근거 | 권장 액션 |
|----|------|--------|-----------|------|-----------|
| SEC-01 | "JSON-LD 직렬화는 `renderJsonLd()` 만 사용" 룰이 grep 매뉴얼 점검에 의존. 정적 검사 없음 | **P1** | `mistake-log.md 2026-05-11`(location 페이지 escape 누락) 이 재발 가능. 현재 16 페이지가 `renderJsonLd` 사용 중 — 신규 페이지가 인라인 `JSON.stringify` 로 빠지면 보안 누락 | `docs/seo-checklist.md:29-35`, mistake-log 동일 일자 | (a) ESLint custom rule: `dangerouslySetInnerHTML` 안에 `JSON.stringify` 사용 금지, (b) vitest snapshot 으로 모든 JSON-LD 출력이 `\\u003c` 포함하는지 단위 테스트. 권장: (a) — 작성 즉시 IDE 에서 보임 |
| SEC-02 | `isUniqueConstraintError` 가 5 개 API 라우트(`community/tags`, `exam-tag-options`, `highlights/[id]`, `teachers/[id]`, `articles/[id]`)에만 적용. 나머지 `INSERT` 가능 라우트는 여전히 `instanceof Error && message.includes("UNIQUE")` 패턴이거나 그조차 없음 | **P1** | Miniflare D1 의 비-`Error` throw 가 다른 라우트에서 500 으로 표출 가능 | mistake-log 2026-05-12, `grep -r isUniqueConstraintError src/app/api` 결과 | `src/app/api/admin/**/route.ts` 의 모든 INSERT 핸들러 일괄 점검 후 적용. `videos`, `pinned-articles`, `nav-menus`, `header-links`, `slides`, `tracking-codes` 라우트 확인 |
| SEC-03 | `JWT_SECRET` 공유 + 페이로드 키(`sid` vs `username`)로 토큰 종류 구분. 만약 한쪽 키가 다른 페이로드 형태로 발급되면 권한 혼동 가능 | **P2** | 이론적 — 현재 발급 측 코드가 분리되어 있어 실사고 가능성 낮음. 다만 안전한 도메인 분리 부족 | `docs/community.md:39` | 페이로드에 `aud` 또는 `kind: "admin"/"anon"` 클레임 추가하고 verify 측에서 일치 검사 |
| SEC-04 | `DEPENDENCY_AUDIT.md` 의 4 건 transitive vuln (esbuild ≤ 0.24.2 / fast-uri / fast-xml-builder / fast-xml-parser) 미해소 | **P3** | dev/빌드 도구 영역, 운영 사용자 영향 없음 | `DEPENDENCY_AUDIT.md:122-145, 221-227` | `npm audit fix` 시도 + drizzle-kit 다음 메이저로 |

### 1.5 단일 소스(SSOT) 통합 미완

| ID | 항목 | 위험도 | 영향 범위 | 근거 | 권장 액션 |
|----|------|--------|-----------|------|-----------|
| SSOT-01 | catch-all `[slug]/page.tsx` 내부의 `FALLBACK_PARENTS` 와 `src/lib/default-nav.ts` 가 부분 분기 — categories.md 가 "단일 소스 통합은 별도 작업" 으로 명시 | **P2** | DB 비어있는 dev/fresh-seed 환경에서 두 폴백이 다른 화면을 보여줄 수 있음 | `docs/categories.md:29` | `FALLBACK_PARENTS` 를 `getDefaultParentBySlug()` 로 흡수. 폴백을 한 곳에서만 수정하도록 |
| SSOT-02 | 도메인 표기 분기 — `news.jung-youl.com` vs `www.jungyoul.net` 가 `layout.tsx` metadata vs sitemap/robots/페이지 JSON-LD 사이에서 갈림 | **P1** | OG 미리보기/검색 노출 URL 혼란, canonical 일관성 손상 | `docs/seo-checklist.md:43-44` | 한 도메인으로 통일. 변경 PR 에서 grep `news.jung-youl.com` `www.jungyoul.net` 둘 다 0/1 분포 점검 |
| SSOT-03 | `header_links.icon` (lucide 이름) deprecated 컬럼이 schema/14개 화이트리스트(`src/lib/header-link-icons.ts`)에 남아있고 폴백 경로도 활성 | **P3** | 데이터 호환을 위해 유지 — 모든 운영 row 가 `imageUrl` 로 마이그레이션된 시점에 제거 가능 | `src/db/schema.ts:104`, `header-link-icons.ts:20-36` | 어드민 UI 입력은 이미 제거됨. 운영 row 마이그레이션 스크립트 작성 후 컬럼/화이트리스트 삭제. 마이그레이션 기준 데이터 `SELECT id, icon, image_url FROM header_links WHERE image_url = ''` |
| SSOT-04 | `categoryOptions` 단일 소스 통합 끝났지만 — `/admin/slides` 가 `exam` 만 추가 제외(slides 메인에 시험지분석 미노출 정책). 정책이 코드에 박혀있어 운영자가 변경하려면 코드 수정 | **P3** | 운영 정책 변경 시마다 PR | `docs/categories.md:81` | 운영자 노출 정책을 `site_settings` 키-밸류로 옮길지 검토 — 단, ROI 낮음. 보류 가능 |
| SSOT-05 | 카테고리 enum 확장 시 `src/lib/data.ts` + `seed.sql` CHECK 두 곳 동기화 절차가 문서에만 의존 | **P2** | `mistake-log 2026-05-08` 패턴 재발 위험 | `docs/categories.md:35-36` | vitest 로 `data.ts` `categories` 와 `seed.sql` 의 CHECK 문자열을 비교하는 가드 테스트 |

### 1.6 어드민 자유 입력 ↔ 코드 결합 (메타 부채)

| ID | 항목 | 위험도 | 영향 범위 | 근거 | 권장 액션 |
|----|------|--------|-----------|------|-----------|
| ADM-01 | `nav_menus.href` 자유 입력 — `trim()` 외 검증 없음. 잘못된 href 로 자식 메뉴 404 (`mistake-log 2026-05-11`) | **P1** | 사용자가 헤더 메뉴 클릭 시 404. 부모는 catch-all 이 흡수했지만 자식은 여전히 명시 라우트나 카테고리 쿼리에 의존 | `mistake-log.md 2026-05-11 (회귀 진단 c)` | 어드민 폼에 href 화이트리스트 검증 (`/`, `/articles?category=…`, `http(s)://` 또는 알려진 명시 라우트 enum 매칭) |
| ADM-02 | `header_links.href` 검증은 `hrefRefine` 으로 `/` 또는 `http(s)://` 만 허용 — 잘 되어있음 | — | (기준점 비교용) | `CLAUDE.md:헤더 링크 버튼` | 변경 없음 — ADM-01 의 모범 사례로 참조 |
| ADM-03 | 어드민 페이지의 reorder API(`/api/admin/{exam-tag-options,header-links,nav-menus,slides,videos}/reorder`)가 모두 별도 라우트로 구현. 5 곳 패턴 중복 | **P2** | reorder 로직 변경 시 5 곳 일괄 수정. 패턴은 `parseReorderIds` 헬퍼로 한 부분 통합되었지만 핸들러 본체는 분기 | `git status` 의 reorder route 5 곳 동시 수정 흔적, `src/lib/validation.ts:212` | 제네릭 `reorderHandler<TTable>(table)` factory 또는 단일 `/api/admin/reorder?resource=…` 디스패처로 통합 |
| ADM-04 | 어드민 토큰(`admin_token`) 만료/회전 정책 없음 — 페이로드 `{ username }` 만, exp 검사 여부 확인 필요 | **P2** | 토큰 탈취 시 영구 유효 가능 | `src/lib/auth.ts` (직접 확인 권장) | `requireAdmin` 검증 측에 `exp` 강제 + 발급 시 30d max-age. 별도 review 필요 |

### 1.7 테스트/CI 커버리지

| ID | 항목 | 위험도 | 영향 범위 | 근거 | 권장 액션 |
|----|------|--------|-----------|------|-----------|
| TEST-01 | 단위 테스트 9 개만(`src/lib/__tests__/`) — community-cursor, community-nickname, header-link-icons, json-ld, mappers, sanitize, thumbnail, utils, validation-helpers | **P2** | 헬퍼는 보호되지만 라우트/RSC/페이지 회귀가 잡히지 않음. mistake-log 의 회귀 7건은 모두 라우트/페이지 레벨 | `ls src/lib/__tests__` | 어드민 mutate API 라우트 단위로 `vitest` + `next/server` request 모킹 추가. `/community/posts` `/admin/articles` 우선 |
| TEST-02 | CI 파이프라인 명시 없음 — `package.json:scripts` 에 `test` 가 있으나 GitHub Actions 등 자동 실행 미확인 | **P2** | pre-commit(`lint-staged`) 이 eslint + tsc 만 실행 → 테스트 회귀가 머지 전 잡히지 않음 | `package.json:48-53` | `.github/workflows/ci.yml` 추가 (`npm test` + `npm run build`). 또는 husky `pre-push` 에 `npm test` |
| TEST-03 | E2E/시각 회귀 없음 — Playwright/Cypress 미사용. 디자인 토큰 마이그레이션 같은 광범위 변경 시 검증이 수동 | **P3** | mistake-log 2026-05-13 회귀(`text-[#666]` 잔재) 가 자동 검출 안 됨 | `mistake-log.md 2026-05-13` | 핵심 페이지(/, /articles, /community, /admin 로그인) 스모크 E2E. 디자인 토큰 잔재 ESLint 룰로도 가능 |

### 1.8 `/community` v2 백로그 (이미 docs/community.md 에 명시)

| ID | 항목 | 위험도 | 영향 범위 | 근거 | 권장 액션 |
|----|------|--------|-----------|------|-----------|
| CM-01 | Cloudflare Turnstile CAPTCHA 미적용 | **P1** | 봇 글쓰기/도배 공격 노출 | `docs/community.md:117` | 글쓰기 폼/세션 발급 API 양쪽에 Turnstile 검증 |
| CM-02 | 세션별 분당 작성 카운터(레이트리밋) 없음 | **P1** | 도배·DoS-light 가능 | `docs/community.md:118` | Cloudflare Durable Object 또는 D1 카운터 테이블(작성·댓글 분당 N건) |
| CM-03 | 사용자 신고 기능 없음 | **P2** | 모더레이션 부담 — 어드민이 전체 피드 수동 점검 | `docs/community.md:119`, `/admin/community/posts` | `community_reports` 테이블 + `/api/community/posts/[id]/report`, 어드민 알림 |
| CM-04 | 이미지 다중 첨부 / 본문 인라인 이미지 미지원 | **P3** | UX 제약 | `docs/community.md:120` | `community_posts.image_url` 단일 컬럼을 별 테이블(`community_post_images`)로 |
| CM-05 | 댓글 좋아요 미지원 | **P3** | UX 제약 | `docs/community.md:121` | `community_comment_likes` 추가 |
| CM-06 | 검색 미지원 | **P3** | UX 제약 | `docs/community.md:122` | D1 FTS5 가상 테이블 |
| CM-07 | 알림(좋아요·댓글) 미지원 | **P3** | UX 제약 | `docs/community.md:123` | 별도 PR. 익명 모델이라 발송 채널이 없음 — 페이지 내 뱃지로 시작 |

### 1.9 디자인 토큰/스타일 위생

| ID | 항목 | 위험도 | 영향 범위 | 근거 | 권장 액션 |
|----|------|--------|-----------|------|-----------|
| STY-01 | 디자인 토큰 grep 매뉴얼 — 신규 hex 잔재 검출이 수작업 | **P2** | `mistake-log 2026-05-13`(`text-[#666]` shorthand 잔재) 재발 가능 | `mistake-log 2026-05-13` | ESLint custom rule: Tailwind arbitrary class 안에 `#1A1A1A`/`#666(?:666)?`/`#1E64FA`/`#0E41AD`/`#E0E0E0` 정규식 매치 차단 |
| STY-02 | `globals.css @theme inline` 의 `@custom-variant dark` 가드는 의도적 inert. 코드 리뷰어가 모르고 제거할 위험 | **P3** | 다크모드 회귀 가능 | `CLAUDE.md:디자인 토큰` | `globals.css` 내 가드 위에 `/* DO NOT REMOVE: ... */` 코멘트 — 이미 CLAUDE.md 에 있으나 css 파일 자체에도 표기 |

### 1.10 빌드/배포 흔적

| ID | 항목 | 위험도 | 영향 범위 | 근거 | 권장 액션 |
|----|------|--------|-----------|------|-----------|
| OPS-01 | `.next` 캐시 stale 이슈가 `2026-04-08`, `2026-05-11` 두 번 재발 | **P3** | dev 단계만 — 운영 영향 X | `mistake-log 2026-04-08`, `2026-05-11(catch-all)` | dev 시작 스크립트에 `--turbo` 모드 + 변경 감지 강화 또는 README 에 "catch-all/dynamic 변경 시 .next 청소" 명문화 |
| OPS-02 | `open-next.config.ts` 가 워킹트리 삭제 상태 — 의도 미확인 | **P0(검증 필요)** | Cloudflare Pages 배포 환경의 `npm run deploy`/`npm run preview` 가 OpenNext 기본 동작으로 떨어짐. 의도라면 정상, 아니면 빌드 깨짐 | `git status: D open-next.config.ts` | 본 PR 묶음 commit 전에 의도 확인. 의도 삭제면 `package.json:scripts.preview/deploy` 도 정리 |

---

## 2. 다른 worker 의 발견 사항 통합 슬롯

> 본 리포트는 act-team 의 5개 sub-task 중 worker-5(인벤토리·우선순위)가 담당. worker-1~4 가 각각의 영역을 깊게 파면서 발견한 부채는 아래 슬롯에 동일 형식(ID/항목/위험도/영향/근거/권장)으로 추가 기입한다.

### 2.1 (slot for worker-1 영역)
> 발견 사항을 받아서 `1.x` 또는 신규 섹션으로 흡수.

| ID | 항목 | 위험도 | 영향 범위 | 근거 | 권장 액션 |
|----|------|--------|-----------|------|-----------|
| _TBD_ | _기재 대기_ | — | — | — | — |

### 2.2 (slot for worker-2 영역)

| ID | 항목 | 위험도 | 영향 범위 | 근거 | 권장 액션 |
|----|------|--------|-----------|------|-----------|
| _TBD_ | _기재 대기_ | — | — | — | — |

### 2.3 (slot for worker-3 영역)

| ID | 항목 | 위험도 | 영향 범위 | 근거 | 권장 액션 |
|----|------|--------|-----------|------|-----------|
| _TBD_ | _기재 대기_ | — | — | — | — |

### 2.4 (slot for worker-4 영역)

| ID | 항목 | 위험도 | 영향 범위 | 근거 | 권장 액션 |
|----|------|--------|-----------|------|-----------|
| _TBD_ | _기재 대기_ | — | — | — | — |

---

## 3. 우선순위 요약 (즉시 처리 큐)

| 순위 | ID | 1줄 요약 | 예상 작업량 |
|------|-----|----------|-------------|
| 1 | OPS-02 | `open-next.config.ts` 삭제 의도 확정·복원 또는 정리 | 30 분 |
| 2 | DB-01 | seed.sql 을 drizzle 마이그레이션 결과와 동기화하거나 부트스트랩 절차를 `wrangler d1 migrations apply` 로 일원화 | 2~4 시간 |
| 3 | SEC-01 | JSON-LD 인라인 stringify 차단 ESLint 룰 | 1~2 시간 |
| 4 | SEC-02 | 모든 `INSERT` 라우트에 `isUniqueConstraintError` 적용 | 2~3 시간 |
| 5 | SSOT-02 | 도메인 표기 통일(news vs www) | 1~2 시간 |
| 6 | ADM-01 | `nav_menus.href` 검증 강화 | 1~2 시간 |
| 7 | CM-01, CM-02 | Turnstile + 레이트리밋 | 1~2 일 |
| 8 | RES-01 | `.bak` 7 파일 삭제 + .gitignore | 15 분 |
| 9 | DB-05 | 신규 RSC 의 DB 조회 try/catch + 빈 폴백 헬퍼 의무화 | 1~2 시간 |
| 10 | TEST-02 | CI 워크플로(npm test + npm run build) | 1 시간 |

---

## 4. 통계

- 총 부채 항목: **38** (DB 5 + PDF 2 + RES 3 + SEC 4 + SSOT 5 + ADM 4 + TEST 3 + CM 7 + STY 2 + OPS 2 + slot 4)
- 위험도 분포 (slot 제외 34건 기준):
  - P0: 2 (DB-01, OPS-02)
  - P1: 9 (DB-02, DB-05, RES-02, SEC-01, SEC-02, SSOT-02, ADM-01, CM-01, CM-02)
  - P2: 12
  - P3: 11
- 회귀 발생 이력 있는 패턴: SEC-01, SEC-02, SSOT-05, ADM-01, OPS-01 (mistake-log 교차 참조)

## 5. 운영 룰 제안

1. **마이그레이션 == 스키마**, **시드 == 데이터** — 0007/0008 패턴 금지 (DB-04)
2. **신규 DB-driven RSC = try/catch + 빈 폴백** 의무 (DB-05)
3. **신규 JSON-LD = `renderJsonLd()`** — ESLint 룰로 강제 (SEC-01)
4. **신규 INSERT 라우트 = `isUniqueConstraintError`** (SEC-02)
5. **신규 부채 발견 시 즉시 본 인벤토리에 기록** — 추적되지 않는 부채는 다음 회기에 재발

---

_본 문서는 라이브 인벤토리이다. 항목이 해소되면 해당 행을 삭제하지 말고 "해소 일자 / 해결 커밋" 컬럼을 우측에 추가해 회고용으로 보존할 것._
