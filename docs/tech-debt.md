# 기술부채 보고서 (Technical Debt Report)

- **최초 작성**: 2026-05-18 · **최종 재진단**: 2026-06-10 (→ 최상단 [§0 2026-06-10 재진단](#0-2026-06-10-재진단))
- **대상**: 정율 교육정보 홈페이지 (Next.js 16 + Cloudflare Pages/OpenNext + Drizzle/D1)
- **조사 범위**: graphify 그래프(152파일·316노드) + git 이력 + 코드 grep + 스키마/마이그레이션 점검
- **전체 등급**: **B — 코드 품질은 양호하나 검증 안전망(테스트·CI)이 부재**

> 배경: 커밋 `c583e7a` "revert: roll back tech-debt over-fixes" 에서 과거 `docs/tech-debt.md`,
> vitest 테스트 8종, `knip.json`, `DEPENDENCY_AUDIT.md` 가 한꺼번에 삭제됐다. 대규모 기술부채
> 정리를 한 번 시도했다가 CI 깨짐으로 통째 롤백된 이력이 있다. 본 보고서는 코드를 수정하지 않고
> 현황을 다시 문서화하고 우선순위 로드맵을 제시한다.

> **진행 현황 (2026-05-18)**: 아래 **P0·P1 6개 항목**은 브랜치 `chore/tech-debt-p0-p1` 에서 처리됨.
> 항목별 수정/테스트/디버깅 절차는 [`docs/tech-debt-plan.md`](tech-debt-plan.md) 참조.

---

## 0. 2026-06-10 재진단

> **범위**: graphify 그래프(491노드·669엣지) + 보안/성능/부채 3영역 병렬 탐색 + 핵심 파일 직접 확인.
> 아래 [§1~§4](#1-종합-진단)(2026-05-18)는 이력으로 보존하며, **본 §0 이 최신 현황**이다.
> 이 갱신은 **문서 only** — 코드 수정은 별도 승인 후 진행(실행 순서는 §0.5).

### 0.1 한눈에 — 위험도 로드맵

| 위험도 | ID | 항목 | 영역 | 증거 | 공수 |
|---|---|---|---|---|---|
| 🔴 P0 | SEC-1 | 어드민 토큰 페이로드 미검증 → 익명 토큰으로 권한 상승 | 보안 | `auth.ts:35-43` | 0.5h |
| 🔴 P0 | PERF-1 | 기사 상세가 전체 articles 풀스캔(관련기사) | 성능 | `articles/[slug]/page.tsx:73-77` | 0.5h |
| 🟡 P1 | SEC-2 | CSP 헤더 부재 | 보안 | `next.config.ts:14-30` | 0.5h |
| 🟡 P1 | SEC-3 | 업로드 MIME 클라이언트 신뢰(매직넘버 미검사) | 보안 | `upload/route.ts` admin:22·community:23 | 1h |
| 🟡 P1 | PERF-2 | 기사 상세 generateMetadata↔page 이중 조회 | 성능 | `articles/[slug]/page.tsx:26,64` | 0.5h |
| 🟡 P1 | PERF-3 | 커뮤니티 피드 복합/tag 인덱스 부재 | 성능 | `schema.ts`·`posts/route.ts:42,60` | 0.5h |
| 🟡 P1 | ERR-1 | 공개 GET 침묵 catch(로깅 부재) | 오류처리 | `api/settings`·`api/picture-frames` | 0.5h |
| 🟡 P1 | SEO-1 | 도메인 SSOT 불일치 → **news.jung-youl.com** 통일 | SEO | `sitemap.ts:26`·`robots.ts:15-16`·`layout.tsx:52` | 0.5d |
| 🟢 P2 | DEBT-1~4 | JWT 모듈화·validation 분할·라우트 팩토리·트래킹코드 방어 | 구조 | — | 각 0.5~2d |
| 🟢 P3 | DEBT-5~7 | 대형 파일 분해·신규기능 통합테스트·soft FK | 유지보수 | — | 점진 |

### 0.2 P0 — 높음 / 즉시

**SEC-1. 어드민 토큰 페이로드 미검증 → 익명 토큰으로 권한 상승 (인증 우회)** 🔴
- **증거**: `src/lib/auth.ts:35-43` `verifyToken()` 이 서명만 검증하고 `return payload as { username: string }`
  로 형태 확인 없이 캐스팅. `src/lib/admin-auth.ts:9-13` `requireAdmin()` 은 `if (!payload)` 만 검사 →
  객체가 truthy 면 통과.
- **공격 경로**: 익명 커뮤니티 세션(`src/lib/anon-session.ts:28-35`)은 **동일한 `JWT_SECRET`** 으로
  `{ sid }` 토큰을 발급한다. 방문자가 이 토큰값을 `admin_token` 쿠키에 넣으면 `jwtVerify` 통과 →
  `{ sid, iat, exp }` 가 truthy → `requireAdmin()` 성공 → 전체 `/api/admin/*` 접근. 특별 지식 불필요.
- **수정 방향**: `verifyToken` 에 `if (typeof payload.username !== "string") return null;` 가드 추가
  (이미 `verifyAnonToken`(`anon-session.ts:41`)이 `sid` 에 적용 중인 **대칭 패턴**). 단독 보안 커밋 +
  신규 `src/lib/__tests__/auth.test.ts`(정상 통과 / `{sid}` 거부 / 변조서명 거부).

**PERF-1. 기사 상세 페이지가 전체 articles 테이블을 메모리 로드** 🔴
- **증거**: `src/app/(main)/articles/[slug]/page.tsx:73-77` — 관련기사 4건을 위해
  `const allRaw = await db.select().from(articlesTable)` 로 **모든 기사**를 가져와 메모리에서 필터.
  기사 수 증가 시 매 조회 O(n) — Cloudflare Workers CPU ms / D1 왕복 압박.
- **수정 방향**: WHERE 위임 — `where(and(eq(category, …), ne(id, …))).orderBy(desc(date)).limit(4)`.
  인덱스 `articles_category_idx`(마이그 `0009`)가 기존재해 추가 마이그레이션 불필요.

### 0.3 P1 — 중간 / 단기

- **SEC-2 CSP 부재**: `next.config.ts:14-30` 에 보안헤더 5종(nosniff·X-Frame·HSTS·Referrer·Permissions)은
  있으나 `Content-Security-Policy` 없음. baseline(`frame-ancestors 'none'`·`object-src 'none'`·
  `base-uri 'self'`·`frame-src https://www.youtube.com`) 추가. 인라인 스크립트(JSON-LD·트래킹코드)
  때문에 `script-src 'unsafe-inline'` 유지, **CSP-Report-Only 선배포**로 위반 수집 권장.
- **SEC-3 업로드 MIME 위조**: `api/admin/upload/route.ts:22`·`api/community/upload/route.ts:23` 이
  클라이언트 `file.type` 만 신뢰(확장자 화이트리스트는 있으나 매직넘버 미검사), 저장 `contentType` 도
  그대로 사용. 전역 `nosniff` 로 폴리글랏 위험은 일부 완화되나 **익명 업로드 경로**가 노출면.
  → 매직넘버 검사 공용 헬퍼 도입, 저장 contentType 도 감지값 사용. (admin·community 공유)
- **PERF-2 기사 상세 이중조회**: `articles/[slug]/page.tsx` 의 `generateMetadata`(:26-30)와
  page 컴포넌트(:64-68)가 같은 slug 를 각각 D1 조회(`force-dynamic` 이라 요청 캐시 밖). `React.cache()`
  래퍼로 단일 조회 공유. PERF-1 과 같은 파일이라 동반 처리.
- **PERF-3 커뮤니티 피드 인덱스**: `community_posts` 에 `created_at` 단일 인덱스만(`schema.ts`).
  커서 쿼리는 `(createdAt DESC, id DESC)` 정렬(`posts/route.ts:60`), `tag` 필터(:42)는 무인덱스.
  → drizzle `0012` 로 `community_posts_created_id_idx(createdAt,id)` + `…_tag_created_idx(tag,createdAt)`.
- **ERR-1 침묵 catch**: 공개 GET(`api/settings/route.ts`·`api/picture-frames/route.ts`)의 catch 가
  `console.error` 없이 폴백 반환 → 운영 장애 추적 불가. (어드민 POST/PUT 은 `errorResponse()` 가 이미
  로깅하므로 대상 아님.) → 각 공개 GET catch 에 로깅 1줄 추가, 폴백 응답 유지.
- **SEO-1 도메인 SSOT → news.jung-youl.com**: `src/app/layout.tsx:52` `metadataBase` 는
  `news.jung-youl.com`(라이브)인데 `src/app/sitemap.ts:26`·`src/app/robots.ts:15-16`·
  `articles/[slug]/page.tsx`(JSON-LD 8곳)·`(main)/page.tsx:45`·`community/page.tsx:90`·
  about/exam/story/teachers/contact·`README.md:3` 등 **13개 파일**은 `www.jungyoul.net`(별개 레거시).
  현재 집계 **www.jungyoul.net 28건 vs news.jung-youl.com 9건** — 검색엔진에 잘못된 canonical/
  sitemap/구조화데이터 송출. → 공용 상수 `SITE_URL`(`src/lib/site.ts` 신설)로 전 출력처를
  **news.jung-youl.com** 단일 소스 치환. 단 `terms/page.tsx:32`(약관 본문)·
  `api/admin/upload/route.ts:64`(주석 예시)·테스트 픽스처는 성격이 달라 개별 판단(자동 치환 제외).
  검증: `grep -rn "www.jungyoul.net" src/ README.md` 잔여 0.

### 0.4 P2·P3 — 구조 개선 / 이연

> 원칙: 커밋 `c583e7a`(대규모 일괄 정리 → CI 깨짐 → 통째 롤백) 교훈에 따라 **작은 PR 단위**로.

**P2 (구조)**
- **DEBT-1** JWT 공용화: `auth.ts`(59) ↔ `anon-session.ts`(128) 가 `getSecret`·sign/verify·쿠키헤더를
  ~35% 중복. 공용 `jwt-core.ts` 로 추출(페이로드 타입만 제네릭). **SEC-1 과 결합** — 공용 verify 에
  페이로드 가드를 한 번만 두면 양쪽 대칭 보장.
- **DEBT-2** `validation.ts` 분할: 257줄(2026-05-18 225 → picture-frame +32). 도메인별
  (`validation/{articles,community,picture-frames,helpers}.ts`) + 배럴 `index.ts` 로 import 호환.
- **DEBT-3** 어드민 라우트 팩토리: 36개 라우트의 `requireAdmin→json→zod→getDb→insert/update→
  errorResponse`(~360줄 보일러플레이트)를 `createAdminRoute()` 고차함수로. 대표 3개부터 점진.
- **DEBT-4** 트래킹코드 방어심화: `tracking-code-injector.tsx:33,48,61` 이
  `dangerouslySetInnerHTML` 로 admin 입력을 주입(설계상 의도, `requireAdmin` 보호). 어드민 계정 탈취
  대비 `<iframe>` 차단·벤더 도메인 화이트리스트를 `validation` refine 으로 추가(저위험·방어심화).

**P3 (이연/문서)**
- **DEBT-5** 대형 파일: `content-editor.tsx`(906, 페이스트 분리 후 재증가), 신규
  `pdf-extractor-modal.tsx`(667), `slides/page.tsx`(681), `thumbnail-overlay-editor.tsx`(682),
  `hero-carousel.tsx`(611). pdf-extractor·content-editor 우선 분해, 신규 컴포넌트 400줄 상한 가이드.
- **DEBT-6** 신규 기능 통합테스트 공백: picture-frame 라우트/오버레이, HTML 소스 모달, pdf-extractor.
  (단위 테스트는 `youtube`·`raw-html` 신규 커버됨 — 좋은 신호.)
- **DEBT-7** soft FK 잔존: `communityPosts↔communitySessions` 등 모두 soft FK — 세션 삭제 시
  고아 레코드 가능. D1 + soft-delete 패턴이라 저위험, 문서화만.

### 0.5 재측정 요약 & 실행 순서

**이전 보고서 대비 변화**
- ✅ **해소 유지**: vitest 14파일·1609줄, CI `verify` job, DB 인덱스(마이그 `0009`/`0010`/`0011`).
- ⚠️ **악화**: 대형 파일 전반 증가(`hero-carousel` +4, `thumbnail-overlay` +3) + 신규
  `pdf-extractor-modal`(667). `validation.ts` 225→257.
- 🆕 **신규 위험**: SEC-1(인증 우회), PERF-1·PERF-2(기사 상세).

**코드 실행 순서 (별도 승인 후)**
1. SEC-1 단독 + `auth.test.ts` → 2. PERF-1·PERF-2 동반(같은 파일) → 3. PERF-3(drizzle `0012`) →
4. SEC-2·SEC-3·ERR-1 각 소PR → 5. SEO-1 `SITE_URL`(news.jung-youl.com) 상수화 → 6. P2·P3 점진.
각 변경 후 `npm run lint && npm run typecheck && npm test` 통과, `graphify update .` 실행.

---

## 1. 종합 진단

### 강점
- **의존성 최신**: Next 16.2.1 / React 19.2.4 / Drizzle 0.45 / zod 4 / OpenNext 1.18 — 버전 부채 없음
- **타입 규율**: `tsconfig.json` `strict: true`, `@ts-ignore`·`as any` 사실상 없음
- **보안 하드닝**: JSON-LD `<` XSS escape, `sanitize-html`, `requireAdmin()` 게이트, 로그인 rate limit, CSP 헤더
- **구조**: `(main)`/`(community)` 라우트 그룹 분리, `src/lib` 관심사 분리 깔끔

### 약점
- ~~테스트 커버리지 **0%**, CI 검증 단계 부재~~ → **해소 (P1)**: vitest 재도입(`src/lib` 단위테스트), CI `verify` job(lint→typecheck→test) 추가
- ~~DB 인덱스 누락~~ → **해소 (P0)**: `0009` 마이그레이션으로 인덱스 5종 추가 / FK 제약 전무는 잔존
- ~~R2 incremental cache 비활성 (ISR 캐시 휘발)~~ → **해소 (P0)**: `open-next.config.ts` 에서 활성화
- 에러 처리 산발적 — 침묵 catch, 제네릭 500 → 침묵 catch 3곳은 P1 에서 수정, 제네릭 500 은 잔존

---

## 2. 부채 인벤토리

### A. 테스트 / 검증 안전망 — 대부분 해소 (P1)

> 2026-05-18 시점 스냅샷. 아래 4 항목은 P1 작업으로 해소됨 — 현황은 우측 열 참조.

| 항목 (당시) | 현황 |
|---|---|
| 단위/통합/E2E 테스트 0건 | **해소**: `src/lib/__tests__/*.test.ts` 11종(sanitize·json-ld·mappers·validation-helpers·thumbnail·utils·community-cursor/nickname·header-link-icons·normalize-paste·normalize-server) 재도입. API/컴포넌트 통합 테스트는 여전히 미작성 |
| 스모크 인프라 없음 | **해소**: `scripts/smoke-paste-cleanup.mjs`(POST→GET→공개 페이지 라운드트립), `scripts/debug-paste.mjs` 추가 |
| 테스트 셋업 롤백 이력 | (이력) `c583e7a` 에서 vitest 셋업 삭제됐던 것을 P1 에서 작은 단위로 복원 |
| CI 검증 부재 | **해소**: `.github/workflows/deploy.yml` 에 `verify` job(lint→typecheck→test) 신설, `deploy` 가 `needs: verify` |
| pre-commit 제한적 | `.husky/pre-commit` 은 lint-staged(eslint --fix + tsc --noEmit)만 — 빌드/테스트는 CI `verify` 가 담당 |

### B. 데이터베이스 — 높음

- ~~**인덱스 누락**~~ → **해소 (P0)**: `0009_loud_captain_stacy.sql` 마이그레이션으로 인덱스 5종 추가 — `articles_category_idx`, `articles_date_idx`, `community_posts_session_id_idx`, `community_posts_created_at_idx`, `community_comments_post_id_idx`. (운영 D1 적용은 배포 시 `wrangler d1 migrations apply --remote`)
- **마이그레이션 위생**: `drizzle/0006_huge_purple_man.sql` 는 유효한 `ALTER TABLE`(header_links.image_url 추가) 1문이지만 끝줄 개행이 누락돼 `wc -l` 이 0으로 표시됐다 — **빈 파일이 아님(정정)**.
- **FK 제약 전무**: heroSlideItems↔heroSlides·articles, communityPosts↔communitySessions 등 모두 soft FK. 세션 삭제 시 고아 게시물 발생 가능.
- **SSOT 분리**: `seed.sql` 에 CREATE TABLE/CHECK 제약이 중복 정의되어 drizzle 마이그레이션과 별도 관리 — 표류 위험.
- **DB 클라이언트**: `src/db/index.ts` `getDb()` 가 요청마다 drizzle 인스턴스를 신규 생성, 캐싱·에러 처리 없음.

### C. 코드 구조 / 중복 — 중간

- **대형 파일** (>400줄): `src/components/content-editor.tsx`(733 — 2026-05-19 페이스트 정리 로직을 `src/lib/normalize-paste.ts`(552) 로 분리해 924→733 감소), `src/app/admin/slides/page.tsx`(681), `src/components/thumbnail-overlay-editor.tsx`(679), `src/components/hero-carousel.tsx`(607) 외 4개.
- **어드민 라우트 보일러플레이트**: 50+ 라우트에서 `requireAdmin → json parse → zod parse → getDb → insert/update → errorResponse` 패턴 반복.
- **JWT/쿠키 중복**: `src/lib/auth.ts`(59줄) ↔ `src/lib/anon-session.ts`(128줄) 가 `getSecret`·토큰 생성/검증·쿠키 헤더 로직을 ~35% 중복.
- **`validation.ts` 비대**: 225줄 단일 파일에 전 도메인 zod 스키마 집중.
- ~~**Miniflare D1 에러 헬퍼 미적용**~~ → **해소 (P1)**: 공용 헬퍼 `isUniqueConstraintError()` (`src/lib/validation.ts`) 를 슬러그 INSERT POST 라우트(`articles`/`highlights`/`teachers`)에 채택 — UNIQUE 위반이 409 로 일관 반환.

### D. 에러 처리 — 중간

- ~~**침묵 catch**~~ → **해소 (P1)**: `community-feed.tsx`(실패 state + 안내), `like-button.tsx`(`console.error`), `admin/settings/page.tsx`(`console.error` + 안내 메시지) 3곳에 로깅/피드백 추가.
- **제네릭 500**: API 라우트 다수가 `errorResponse` 로 검증 에러와 DB 에러를 구분 없이 500 처리 — 로깅·구조화 부재, 프로덕션 스택트레이스 유실. (잔존)

### E. 배포 / 캐싱 — 대부분 해소 (P0)

- ~~`open-next.config.ts` 의 R2 incremental cache 가 주석 처리됨~~ → **해소 (P0)**: `r2IncrementalCache` 활성화 (커밋 `f9b46ed`). 기존 `jungyoul-images` 버킷을 재사용하되 OpenNext 가 `incremental-cache/` 프리픽스로 격리.
- CI 에 프리뷰/스테이징 환경 없음 — main push = 즉시 프로덕션. D1 마이그레이션 카나리 절차 없음. (잔존 — `verify` job 은 추가됐으나 스테이징 환경은 없음)

### F. 문서화된 미뤄둔 작업 — 낮음~중간

- **/community v2 이연 7종** (`docs/community.md`): Turnstile, 레이트리밋, 신고, 이미지 다중 첨부, 댓글 좋아요, 검색, 알림.
- **러프 v1 스타일링**: 커뮤니티 8개 컴포넌트에 `// STYLING: rough v1` 마커 — 디자인 미완 상태.
- **도메인 SSOT 불일치**: `src/app/layout.tsx` 메타데이터는 `news.jung-youl.com`, sitemap/robots/JSON-LD 는 `www.jungyoul.net` (`docs/seo-checklist.md` 에서 인지·이연됨).
- **레거시 필드**: `header_links.icon` (lucide 이름) deprecated 잔존 — 신규 입력은 `image_url` 만 사용.
- **워크어라운드**: catch-all `src/app/(main)/[slug]/page.tsx` 시그니처 변경 시 `.next` 캐시 수동 삭제 필요 (`docs/mistake-log.md`).

### G. 이력 신호 — 참고

- `docs/mistake-log.md` 에 20여 건 회귀 기록. sanitize 화이트리스트 2단계 동기화 누락, hex 토큰 마이그레이션 누락, 페이스트 분기 우선순위 등 **"수동 규율 의존"** 패턴이 반복적으로 회귀를 유발.
- 동일 영역 반복 fix 커밋 churn: "fast editor error" ×2, 카테고리/하이퍼링크 ×3, 썸네일 오버레이 ×3.

---

## 3. 우선순위 개선 로드맵

> **P0·P1 6개 항목 완료** (브랜치 `chore/tech-debt-p0-p1`, 수행 절차 [`docs/tech-debt-plan.md`](tech-debt-plan.md)). 아래 표는 ✅ 로 표기. P2·P3 는 미착수.

| 우선순위 | 항목 | 영역 | 예상 공수 | 근거 |
|---|---|---|---|---|
| ✅ P0 | DB 인덱스 5종 추가 (마이그레이션 `0009`) | B | 2~3h | 데이터 증가 시 성능 급락, 저비용 고효율 |
| ✅ P0 | 마이그레이션 `0006` 끝줄 개행 정정 | B | 5m | 파일 위생 (빈 파일 아님 — 정정) |
| ✅ P0 | R2 incremental cache 활성화 | E | 0.5h | ISR 안정성, 한 줄 수정 |
| ✅ P1 | 테스트 프레임워크 재도입 (vitest, `src/lib` 단위테스트 11종) | A | 3~5d | 안전망 부재가 최대 리스크 |
| ✅ P1 | CI 에 `verify` job(lint + typecheck + test) 추가 | A,E | 0.5d | 설정 표류·빌드 깨짐 사전 차단 |
| ✅ P1 | 기존 `isUniqueConstraintError()` 헬퍼를 미적용 POST 라우트에 채택 | C | 0.5d | 생성 라우트 UNIQUE → 409 일관화 |
| **P2** | 어드민 라우트 핸들러 팩토리 추출 | C | 1~2d | 보일러플레이트 ~1500줄 감축 |
| **P2** | `auth.ts`/`anon-session.ts` JWT 공용 모듈화 | C | 1d | 35% 중복 제거 |
| **P2** | 침묵 catch 3곳에 로깅/사용자 피드백 추가 | D | 2h | 디버깅성 향상 |
| **P2** | `validation.ts` 도메인별 분할 | C | 1d | 가독성·테스트 용이 |
| **P3** | `content-editor.tsx`(924) 등 대형 파일 분해 | C | 2~3d | 유지보수성 |
| **P3** | 도메인 SSOT 통일 (메타데이터 vs sitemap) | F | 0.5d | SEO 일관성 |
| **P3** | /community v2 기능 범위 문서화 | F | 0.5d | 스코프 캡처 |

---

## 4. 권고 운영 규칙

- **보안 규칙은 구조화**: "수동 규율" 대신 코드/체크리스트로 강제. 예) sanitize 태그 추가 시 `allowedAttributes` 동기화 항목을 리뷰 체크리스트에 명시 — `docs/mistake-log.md` 의 반복 회귀 교훈.
- **부채 정리는 작은 단위로**: 대규모 일괄 정리 PR 은 `c583e7a` 롤백처럼 CI 깨짐 위험. 작은 PR + 배포 검증 후 머지.
- **코드 변경 후 `graphify update .` 실행** (CLAUDE.md 규칙).
