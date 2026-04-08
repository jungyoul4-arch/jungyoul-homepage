# Admin Dashboard Design — Tracking Codes + OG/Hero Improvements

## Overview

기존 관리자 대시보드(`/admin`)에 **추적 코드 관리** 기능을 추가하고,
**고정 페이지 hero 이미지 + OG 태그**를 개선한다.

## Existing Infrastructure (활용)

- **DB**: Cloudflare D1 (SQLite) + Drizzle ORM
- **Storage**: Cloudflare R2 (이미지 업로드 — `/api/admin/upload`)
- **Auth**: JWT + bcrypt + httpOnly 쿠키 (`requireAdmin()`)
- **Admin**: `/admin` 대시보드 — 기사/선생님/영상/하이라이트 CRUD 존재
- **Articles**: DB에 `content` 필드 이미 존재 (HTML 본문)

## Feature 1: Tracking Code Manager (신규)

### Data Model

DB 테이블 추가 (`src/db/schema.ts`):

```typescript
export const trackingCodes = sqliteTable("tracking_codes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  position: text("position").notNull(),          // "head" | "body-start" | "body-end"
  enabled: integer("enabled", { mode: "boolean" }).default(true),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
});
```

### API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tracking-codes` | 전체 목록 조회 (인증 불필요) |
| POST | `/api/admin/tracking-codes` | 새 코드 추가 |
| PUT | `/api/admin/tracking-codes/[id]` | 수정 |
| DELETE | `/api/admin/tracking-codes/[id]` | 삭제 |

기존 `requireAdmin()` 미들웨어 재사용.

### Admin UI

`/admin` 대시보드에 "추적 코드" 카드 추가 → `/admin/tracking-codes` 페이지:
- 카드 리스트: 이름, 위치 배지, 활성 토글, 수정/삭제
- 추가/수정 폼: 이름(input), 코드(textarea), 위치(select), 활성(toggle)
- async/defer 권장 안내 표시
- 삭제 시 확인 다이얼로그

### Frontend Injection

`layout.tsx`에서 서버 사이드로 DB에서 활성 코드 fetch → position별 삽입:
- `head` → `<head>` 안에 `dangerouslySetInnerHTML`
- `body-start` → `<body>` 여는 태그 직후
- `body-end` → `<body>` 닫는 태그 직전

## Feature 2: OG Tag / Hero Image Improvements

### 기사 OG 이미지 개선

`articles/[slug]/page.tsx`의 `generateMetadata()`에서:
- `og:image` = 기사 `thumbnail` (현재 `/og-image.png` 고정 → 기사별 대표 이미지로 변경)
- `og:title` = meta title (이미 동일)
- `og:description` = meta description (이미 동일)
- thumbnail이 비어있으면 fallback으로 `/og-image.png`

### 고정 페이지 hero 이미지 + OG

6개 고정 페이지(about, articles, contact, faq, location, teachers)에:
1. 상단 hero/banner 이미지 섹션 추가
2. metadata의 `og:image`를 해당 hero 이미지로 설정

| 페이지 | hero 이미지 | OG image |
|--------|------------|----------|
| 회사소개 | `/images/hero-about.jpg` | 동일 |
| 교육정보 | `/images/hero-articles.jpg` | 동일 |
| 상담신청 | `/images/hero-contact.jpg` | 동일 |
| FAQ | `/images/hero-faq.jpg` | 동일 |
| 찾아오는 길 | `/images/hero-location.jpg` | 동일 |
| 선생님 소개 | `/images/hero-teachers.jpg` | 동일 |

hero 이미지는 `/public/images/`에 정적 배치. placeholder 이미지로 시작, 실제 사진은 나중에 교체.

## Potential Issues & Mitigations

### 치명적

| # | 문제 | 대응 |
|---|------|------|
| 1 | sitemap Blob→DB 전환 시 fetch 실패 → 빈 사이트맵 | sitemap.ts는 이미 DB 기반. 변경 불필요 |
| 2 | 기사 필수 필드 미검증 → JSON-LD 불완전 | 기존 `insertArticleSchema` (drizzle-zod) 활용. 이미 검증 중 |
| 3 | 추적 코드 삽입으로 렌더링 블로킹 | admin UI에 async/defer 안내 표시 |

### 중요

| # | 문제 | 대응 |
|---|------|------|
| 4 | 추적 코드 DB fetch → TTFB 증가 | `unstable_cache` 또는 revalidate 적용 |
| 5 | hero 이미지 미제공 시 OG 깨짐 | placeholder 이미지 기본 제공 + fallback `/og-image.png` |
| 6 | 추적 코드 5개 이상 → 성능 저하 | 개수 경고 UI |

### 권장

| # | 문제 | 대응 |
|---|------|------|
| 7 | GTM + 개별 GA 이중 삽입 | 안내 문구 표시 |
| 8 | 관리자 계정 탈취 → 악성 스크립트 삽입 | 기존 JWT + bcrypt 인증으로 보호 |

## Scope

- 추적 코드: DB 테이블 + CRUD API + 관리자 UI + layout.tsx 삽입
- OG 태그: 기사별 thumbnail → og:image, 고정 페이지 hero → og:image
- 고정 페이지: hero 이미지 섹션 추가 (placeholder로 시작)
- 기존 기사 관리 기능: 변경 없음 (이미 완성됨)
