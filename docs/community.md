# 익명 커뮤니티 (`/community`)

> 고등학생 위주 익명 게시판. 가입 절차 없음, 쿠키 발급 닉네임 영속.

## 정체성
- URL: `/community` — `src/app/(community)/community/` 라우트 그룹 (URL 에는 그룹명 비반영)
- 대상: 고등학생 (수능·내신·진로·고민·잡담 태그)
- 익명 모델: 같은 브라우저는 같은 닉네임 유지. 본인 글·댓글 식별/삭제 가능.
- 가입 절차 없음. 첫 진입 시 `anon_session` 쿠키 자동 발급.
- 헤더 링크 버튼으로 새 탭 진입(어드민이 `/admin/header-links` 에서 행 등록). 단, 이 버튼은 `(main)/layout.tsx` 헤더에서만 노출 — `/community` 내부에서는 미니 헤더만 표시됨.

## chrome 분리 (`(community)/layout.tsx`)
`/community/**` 는 메인 사이트와 별도 레이아웃을 사용한다.

### 미니 헤더 구성
- **좌측**: 로고 + "JY 커뮤니티" 타이틀
- **우측**: "글쓰기" CTA 버튼 + "메인 ←" 회귀 링크

### 미노출 항목 (의도적 정책)
- 카테고리 부모 메뉴(입시/칼럼/정율소식 등)
- 메가메뉴 / 모바일 서브메뉴
- 검색 토글 / 추천 검색어
- 헤더 링크 캡슐 버튼(`header_links` 데이터)
- 풀 푸터(카테고리 링크 4종 — "자주 묻는 질문/회사소개/개인정보처리방침/이용약관")

### 축소 푸터
`src/components/community/community-footer-social.tsx` — 회사정보 + Instagram/Naver/Kakao/YouTube SNS 4종만 표시.

## 데이터 모델 (`src/db/schema.ts`)
- `community_sessions` — 익명 세션 영속 닉네임 매핑 (id, nickname, createdAt, lastSeenAt)
- `community_tags` — 어드민이 관리하는 태그 옵션 (수능/내신/논술/진로/고민/잡담 기본 6종 시드)
- `community_posts` — 게시글 (title ≤120, body ≤5000 sanitize-html, imageUrl, tag, likeCount/commentCount 비정규화, isDeleted soft-delete)
- `community_post_likes` — (post_id, session_id) 유니크 좋아요
- `community_comments` — 평면(flat) 댓글 (body ≤1000 sanitize-html, isDeleted soft-delete)

마이그레이션: `drizzle/0008_add_community.sql`.

## 인증 (anon_session)
`src/lib/anon-session.ts` — 어드민(`admin_token`)과 별도 쿠키. 같은 `JWT_SECRET` 공유하지만 페이로드 키로 구분(`{ sid }` vs `{ username }`).

- `ensureAnonSession(request)` — 세션 없으면 발급(닉네임 3회 충돌 retry). 응답에 Set-Cookie 부착.
- `requireAnonSession(request)` — mutate API 가드. 세션 없으면 401 응답.
- `getAnonSession(request)` — 읽기 전용 조회. 세션 없으면 `null`.
- `applySetCookie(response, setCookie)` — Set-Cookie 헤더 부착 헬퍼.

쿠키 옵션: `HttpOnly; SameSite=Lax; Secure; Max-Age=365d`(영속).

## 닉네임 (`src/lib/community-nickname.ts`)
형용사 60개 × 명사 60개 × 3자리 난수 = 3.6M 조합. 예: `조용한코끼리042`. 충돌 시 호출부에서 3회 retry.

## API 라우트
공개:
- `POST /api/community/session` — 쿠키 발급(없으면). `{ nickname }` 반환.
- `GET  /api/community/me` — 현재 닉네임·sessionId. `lastSeenAt` best-effort 업데이트.
- `GET  /api/community/tags` — 공개 태그 목록.
- `GET  /api/community/posts?cursor=&tag=&limit=` — cursor 기반 무한스크롤. `isDeleted=false` 만.
- `POST /api/community/posts` — 글 작성 (anon 세션 필수).
- `GET  /api/community/posts/[id]` — 상세. soft-deleted 면 404.
- `DELETE /api/community/posts/[id]` — 본인 soft-delete.
- `POST /api/community/posts/[id]/like` — 토글. `{ liked, count }` 반환.
- `GET  /api/community/posts/[id]/like` — 현재 세션의 좋아요 여부 + 카운트.
- `GET  /api/community/posts/[id]/comments` — 평면 리스트.
- `POST /api/community/posts/[id]/comments` — 댓글 작성.
- `DELETE /api/community/comments/[id]` — 본인 댓글 soft-delete.
- `POST /api/community/upload` — 이미지 1장 R2 업로드 (anon 세션 필수). R2 키 prefix `community/YYYY/MM/...`.
- `GET  /api/community/upload/[...key]` — R2 fetch + 1년 캐시.

어드민(`requireAdmin`):
- `GET  /api/admin/community/posts` — 전체 게시글 (soft-deleted 포함, 500개 제한).
- `DELETE /api/admin/community/posts/[id]` — 강제 soft-delete.
- `POST /api/admin/community/tags` — 태그 추가.
- `DELETE /api/admin/community/tags/[id]` — 태그 삭제 (기존 글의 태그 값은 보존).

## 페이지
- `/community` — 피드(SSR 초기 20개 + 클라이언트 무한스크롤). 태그필터: PC sticky 사이드바 / Mobile 가로 칩.
- `/community/new` — 글 작성 페이지(모달 X). 익명 닉네임 자동 노출, 이미지 1장 첨부.
- `/community/[id]` — 상세 + 평면 댓글 + 좋아요. 본인 글에 삭제 버튼.

어드민:
- `/admin/community/posts` — 모더레이션 리스트(soft-deleted 표시 + 강제 삭제).
- `/admin/community/tags` — 태그 옵션 CRUD.

## 보안 / sanitize
- 본문(body)·댓글: 저장 직전 `sanitizeContent()` (`src/lib/sanitize.ts`) 통과. `<script>`, `javascript:` href, 비허용 iframe 호스트 모두 제거.
- 제목(title): 평문 — JSON-LD `headline` 에서는 `renderJsonLd()` 가 `<` → `<` 이스케이프 자동 적용.
- 본인 식별: `session_id` 일치만으로 판정. JWT 위조 방지는 `JWT_SECRET` 시그니처.
- soft-delete 통일: like·comment 카운터 정합성 보장.
- zod 검증: `title ≤ 120`, `body ≤ 5000`, `comment.body ≤ 1000`, `imageUrl ≤ 500`, `tag ≤ 50`.

## 디자인 토큰 (러프 스타일링)
v1은 디테일 디자인 최소화. `src/app/globals.css` `@theme inline` 에 4개 시맨틱 토큰 추가:
```css
--color-community-surface: var(--color-media-bg);
--color-community-border:  var(--color-border-light);
--color-community-accent:  var(--color-brand-blue);
--color-community-muted:   var(--color-text-secondary);
```
모든 `src/components/community/*` 코드는 이 4개 토큰만 사용. **디자이너가 색을 바꾸려면 위 4줄만 수정**하면 전체 갱신.

각 컴포넌트 최상단에 `// STYLING: rough v1 — community tokens only (see globals.css @theme)` 주석 — 핫스팟 표시.

## 헤더 링크 버튼 등록 (배포 후)
1. `/admin/header-links` 진입
2. **버튼 추가** → label="커뮤니티", href=`/community`, imageUrl 업로드(40×40 권장) 또는 비워두면 lucide 폴백
3. 저장 → 헤더에 즉시 노출(SSR 캐시 무효화 후), `target="_blank"` 자동 적용

> 이 캡슐 버튼은 **메인 사이트 헤더(`(main)/layout.tsx`)에서만 노출**됨. `/community` 내부에서는 미니 헤더만 보이므로 버튼 등록과 무관하게 캡슐이 나타나지 않는다.

## 운영 점검
- 미배포 마이그레이션 적용:
  - 로컬: `npx wrangler d1 execute DB --local --file=drizzle/0008_add_community.sql`
  - 운영: `npx wrangler d1 migrations apply DB --remote` (또는 `--file` 직접)
- 빈 피드(`/community`): `community_tags` 6종 시드가 0008 마이그레이션에 포함됨.
- 로컬 검증: `npm run dev` + 위 API 시나리오 또는 브라우저 수동 테스트.

## v2 로 미루는 항목
- Cloudflare Turnstile CAPTCHA
- 세션별 분당 작성 카운터(레이트리밋)
- 사용자 신고 기능
- 이미지 다중 첨부 / 본문 인라인 이미지
- 댓글 좋아요
- 검색
- 알림(좋아요·댓글)
