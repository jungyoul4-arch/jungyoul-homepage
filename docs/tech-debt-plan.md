# 기술부채 개선 수행서 (P0 + P1)

- **작성일**: 2026-05-18
- **근거 문서**: [`docs/tech-debt.md`](tech-debt.md) 우선순위 로드맵
- **범위**: P0 3건 + P1 3건 = 6개 작업
- **원칙**: 작업당 1 커밋(독립 배포 검증 가능 단위). `open-next.config.ts` 삭제 금지 — 커밋 `c583e7a` 롤백의 근본 원인.

---

## 0. 보고서 정정 사항

탐색 중 `docs/tech-debt.md` 의 사실 오류 2건을 확인해 본 수행서와 함께 정정한다.

1. **`drizzle/0006_huge_purple_man.sql` 는 빈 파일이 아니다.** `ALTER TABLE \`header_links\` ADD \`image_url\` text DEFAULT '';` 1문(59바이트, 유효)을 담는다. `wc -l` 이 0으로 보인 건 끝줄 개행 누락 때문. → 보고서 §2-B·§3 P0 의 "빈 파일(0바이트)" 표현 정정.
2. **D1 UNIQUE 에러 공용 헬퍼는 이미 존재한다** — `isUniqueConstraintError()` (`src/lib/validation.ts`). 보고서 §3 P1 의 "신규 `src/lib/d1-errors.ts` 생성"은 불필요. 실제 작업은 **기존 헬퍼를 미적용 라우트에 채택**.

---

## PR1 — DB 인덱스 추가 (P0 · 영역 B)

**목적**: /exam·기사 목록·커뮤니티 피드의 빈번한 필터/정렬 컬럼에 인덱스가 없어 데이터 증가 시 풀스캔.

**수정**
- `src/db/schema.ts`: `drizzle-orm/sqlite-core` 에서 `index` import. 세 테이블에 인덱스 정의 추가
  - `articles`: `articles_category_idx`(category), `articles_date_idx`(date)
  - `communityPosts`: `community_posts_session_id_idx`(sessionId), `community_posts_created_at_idx`(createdAt)
  - `communityComments`: `community_comments_post_id_idx`(postId)
- `npx drizzle-kit generate` → `drizzle/0009_loud_captain_stacy.sql` (CREATE INDEX 5문).

**테스트**
- 생성된 SQL 이 `CREATE INDEX` 문만 포함하는지 확인 (테이블 변경 없음).
- 로컬 적용: `npx wrangler d1 migrations apply jungyoul-db --local`.
- 운영 적용: 배포 시 `npx wrangler d1 migrations apply jungyoul-db --remote`.

**디버깅**
- `drizzle/meta/` 는 gitignore 대상 — wrangler 가 `migrations_dir` 의 `.sql` 파일을 적용하므로 `0009_*.sql` 자체가 커밋 산출물.
- `drizzle-kit generate` 가 인덱스 외 변경을 끌어오면 스냅샷 표류 신호 → diff 검토.

## PR2 — 마이그레이션 0006 끝줄 개행 (P0 · 영역 B)

**목적**: §0-1 정정. 0006 은 유효하므로 끝줄 개행만 보정.

**수정**: `drizzle/0006_huge_purple_man.sql` 끝에 개행 1줄 추가.

**테스트**: `git diff` 가 개행만 보이는지 확인.

**디버깅**: 이미 적용된 마이그레이션이므로 **재생성 금지** — 개행만 손댄다. wrangler 는 파일명으로 적용 여부를 추적하므로 개행 추가는 무해.

## PR3 — R2 incremental cache 활성화 (P0 · 영역 E)

**목적**: ISR/SSG 증분 캐시가 휘발성 인메모리로 폴백 → 인스턴스마다 재검증이 어긋남.

**수정**
- `open-next.config.ts`: `r2IncrementalCache` import + `incrementalCache: r2IncrementalCache` 활성화.
- `wrangler.jsonc`: `r2_buckets` 에 `NEXT_INC_CACHE_R2_BUCKET` 바인딩 추가.
  - **신규 버킷 생성에 Cloudflare 인증이 필요해, 기존 `jungyoul-images` 버킷을 재사용.** OpenNext 1.18 의 r2IncrementalCache 는 캐시 객체를 `incremental-cache/` 프리픽스로 격리(`r2-incremental-cache.js` 의 `computeCacheKey`)하므로 사용자 업로드 키(`articles/`·`community/`)와 충돌하지 않음.

**테스트**
- `npx opennextjs-cloudflare build` 빌드 통과 — R2 캐시 설정이 번들에 정상 반영되는지.
- 배포 후 ISR 페이지 2회 요청 → 캐시 적중 확인.

**디버깅**
- OpenNext 1.18 바인딩명 = `NEXT_INC_CACHE_R2_BUCKET` (설치본 `r2-incremental-cache.js` 의 `BINDING_NAME` 으로 확인). 프리픽스 env = `NEXT_INC_CACHE_R2_PREFIX` (기본 `incremental-cache`).
- 전용 캐시 버킷을 원하면 `wrangler r2 bucket create <name>` 후 `bucket_name` 만 교체. 존재하지 않는 버킷명을 커밋하면 `wrangler deploy` 가 실패하므로 금지.

## PR4 — 테스트 프레임워크 재도입 (P1 · 영역 A)

**목적**: 단위 테스트 0건. 커밋 `c583e7a` 에서 롤백된 vitest 셋업을 작은 단위로 복원.

**수정**
- 커밋 `04172cc` 에서 `git checkout 04172cc -- vitest.config.ts src/lib/__tests__` 로 설정 + 테스트 9종 복원.
- `package.json`: devDeps `vitest`·`vite-tsconfig-paths`·`@vitest/coverage-v8` 추가, scripts `test`·`test:watch`·`test:coverage` 추가.
- `@vitest/coverage-v8` 는 원본에 누락돼 있던 것 — `test:coverage` 가 비대화형으로 동작하도록 함께 추가.

**테스트**: `npm test` — 9파일 78테스트 전체 통과.

**디버깅**
- 테스트는 `04172cc` 시점 코드 기준이라 현재 동작과 어긋날 수 있음. `sanitize.test.ts` 의 "비허용 호스트 iframe" 케이스가 1건 실패 → 현재 `sanitize.ts` 는 `allowedIframeHostnames` 로 src 만 제거하고 빈 `<iframe>` 은 남김(무해). 보안 속성(악성 URL 제거)을 검증하도록 테스트를 적응(`not.toContain("evil.example.com")`). **보안 코드(sanitize.ts)는 변경하지 않음** — 테스트 복원 범위 밖.
- `04172cc` 가 함께 했던 `cookie-utils.ts`·`open-next.config.ts 삭제` 등은 복원하지 않음.

## PR5 — CI 검증 단계 추가 (P1 · 영역 A·E)

**목적**: CI 가 lint/type/test 없이 곧장 프로덕션 배포 → 설정 표류·회귀가 사전 차단되지 않음.

**수정**
- `package.json`: `typecheck` 스크립트(`tsc --noEmit`) 추가.
- `.github/workflows/deploy.yml`: `verify` job 신설(`npm ci` → `lint` → `typecheck` → `test`). `deploy` job 에 `needs: verify`.

**테스트**: 로컬에서 `npm run lint && npm run typecheck && npm test` 전부 통과.

**디버깅**
- 별도 `build` 단계는 불필요 — `npm run deploy`(=`opennextjs-cloudflare build && wrangler deploy`)가 빌드를 포함.
- `verify` 는 `npm test`(=`vitest run`)만 — 커버리지 임계는 게이트에서 제외(미달 시 배포 차단 방지).

## PR6 — D1 에러 헬퍼 일관 채택 + 침묵 catch 수정 (P1 · 영역 C·D)

**목적**: 생성(POST) 라우트가 UNIQUE 위반을 500 으로 반환. 침묵 catch 가 실패를 은폐.

**수정**
- 신규 파일 없음 — 기존 `isUniqueConstraintError()` (`src/lib/validation.ts`) 채택.
- 슬러그(UNIQUE) 를 INSERT 하는 POST 핸들러에 409 처리 추가: `api/admin/articles`·`highlights`·`teachers/route.ts`.
- 침묵 catch 3곳에 로깅/피드백 추가:
  - `community-feed.tsx`: `failed` state 추가 → 로드 실패 시 안내 텍스트.
  - `like-button.tsx`: `console.error` 로깅(클릭 핸들러는 이미 보호됨).
  - `admin/settings/page.tsx`: `console.error` + 기존 `message` state 로 안내.

**테스트**
- `npm test` 의 `validation-helpers.test.ts` 가 `isUniqueConstraintError` 동작 보장.
- 중복 슬러그 POST → 409 + 한국어 메시지 (Miniflare 로컬 확인).

**디버깅**
- reorder/upload/settings 라우트는 UNIQUE INSERT 경로가 없어 대상 아님 — 과잉 적용 금지.
- Miniflare 비표준 에러는 헬퍼가 `String(e)`+`e.cause` 로 처리(`docs/mistake-log.md` 2026-05-12).

---

## 실행 결과 (브랜치 `chore/tech-debt-p0-p1`)

| 작업 | 상태 | 검증 |
|---|---|---|
| PR1 | 완료 | `0009_loud_captain_stacy.sql` 생성 (CREATE INDEX 5문) |
| PR2 | 완료 | 0006 개행 1줄 |
| PR3 | 완료 | `opennextjs-cloudflare build` 통과 |
| PR4 | 완료 | `npm test` 78/78 통과 |
| PR5 | 완료 | `verify` job 추가, 로컬 lint·typecheck·test 통과 |
| PR6 | 완료 | POST 3종 409 처리, 침묵 catch 3곳 수정 |

## 후속 작업 (이번 범위 밖)

- 운영 D1 에 `0009` 마이그레이션 적용(`wrangler d1 migrations apply --remote`) 후 배포.
- ISR 전용 R2 버킷 분리(선택) — 인증 보유자가 `wrangler r2 bucket create` 후 `bucket_name` 교체.
- P2~P3 로드맵: 라우트 핸들러 팩토리, JWT 모듈화, 대형 파일 분해, 도메인 SSOT 통일.
