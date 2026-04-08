# Admin Dashboard Design — Tracking Codes + Content Manager

## Overview

`/admin` 대시보드에서 마케팅 담당자가 두 가지를 자유롭게 관리:
1. **추적 코드** — GA, Meta Pixel, 네이버 등 스크립트 추가/삭제
2. **콘텐츠(기사)** — HTML 에디터로 기사 작성/수정/삭제

모두 Vercel Blob에 저장. 재배포 없이 즉시 반영.

## Architecture

```
[마케팅 담당자] → /admin (비밀번호 인증)
       ↓
   탭 1: 추적 코드 관리    탭 2: 콘텐츠 관리
       ↓                       ↓
   /api/tracking-codes     /api/articles
       ↓                       ↓
   Vercel Blob             Vercel Blob
   (tracking-codes.json)   (articles.json)
       ↓                       ↓
   layout.tsx 삽입          articles 페이지에서 렌더링
```

## Authentication

- **방식**: `ADMIN_PASSWORD` 환경변수 기반 단일 비밀번호
- **세션**: httpOnly + secure 쿠키 (24시간 만료)
- **적용 범위**: `/admin` 페이지 + 모든 변경 API (POST/PUT/DELETE)

---

## Feature 1: Tracking Code Manager

### Data Model

```typescript
interface TrackingCode {
  id: string;                                    // nanoid
  name: string;                                  // "Google Analytics", "카카오 픽셀" 등
  code: string;                                  // 실제 스크립트 코드
  position: "head" | "body-start" | "body-end";  // 삽입 위치
  enabled: boolean;                              // 활성/비활성 토글
  createdAt: string;                             // ISO 8601
}
```

Vercel Blob에 `tracking-codes.json`으로 저장. 배열 형태: `TrackingCode[]`.

### API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tracking-codes` | 전체 목록 조회 |
| POST | `/api/tracking-codes` | 새 코드 추가 |
| PUT | `/api/tracking-codes/[id]` | 수정 |
| DELETE | `/api/tracking-codes/[id]` | 삭제 |

### Admin UI (탭 1)

- 카드 리스트: 이름, 위치 배지, 활성 토글, 수정/삭제 버튼
- 추가/수정 폼: 이름(input), 코드(textarea), 위치(select), 활성(toggle)
- 삭제 시 확인 다이얼로그

### Frontend Injection

`layout.tsx`에서 서버 컴포넌트로 Blob fetch → position별 삽입:
- `head` → `<head>` 안에 `dangerouslySetInnerHTML`
- `body-start` → `<body>` 여는 태그 직후
- `body-end` → `<body>` 닫는 태그 직전

전체 페이지 공통 삽입 (페이지별 분기 없음).

---

## Feature 2: Content Manager (Articles)

### Data Model

기존 Article 인터페이스를 확장하여 HTML 본문 추가:

```typescript
interface Article {
  id: string;                  // nanoid
  title: string;               // 기사 제목
  excerpt: string;             // 요약 (목록/SEO용)
  content: string;             // HTML 본문 (신규 필드)
  category: Category;          // "strategy" | "column" | "success" | "news"
  categoryLabel: string;       // "입시전략" | "교육칼럼" | "합격스토리" | "공지사항"
  thumbnail: string;           // 썸네일 이미지 경로
  date: string;                // "2026/03/27" 형식
  slug: string;                // URL slug
  featured?: boolean;          // 홈 featured 여부
  createdAt: string;           // ISO 8601
  updatedAt: string;           // ISO 8601
}
```

Vercel Blob에 `articles.json`으로 저장. 기존 `data.ts`의 12개 기사를 초기 시드 데이터로 마이그레이션.

### API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/articles` | 전체 목록 조회 |
| GET | `/api/articles/[slug]` | 단건 조회 |
| POST | `/api/articles` | 새 기사 추가 |
| PUT | `/api/articles/[slug]` | 수정 |
| DELETE | `/api/articles/[slug]` | 삭제 |

### Admin UI (탭 2)

- **목록**: 기사 테이블 (제목, 카테고리, 날짜, featured 배지, 수정/삭제)
- **작성/수정 폼**:
  - 제목 (input)
  - 요약 (textarea, SEO description용)
  - 본문 (HTML textarea — raw HTML 입력)
  - 카테고리 (select)
  - 슬러그 (input, 자동 생성 + 수동 편집 가능)
  - 썸네일 URL (input)
  - Featured 토글
  - 날짜 (date picker)
- **미리보기**: 본문 HTML을 실시간 렌더링하여 확인
- **삭제**: 확인 다이얼로그

### Frontend Changes

- `data.ts`에서 하드코딩된 articles 배열 제거 → Blob에서 런타임 fetch
- `articles/page.tsx`: Blob에서 기사 목록 fetch
- `articles/[slug]/page.tsx`: Blob에서 개별 기사 fetch, `content` 필드를 `dangerouslySetInnerHTML`로 본문 렌더링
- `generateStaticParams` → 동적 렌더링으로 전환 (Blob 기반)
- 홈페이지의 hero, latest articles 등도 Blob에서 fetch
- `data.ts`의 highlights, videos, teachers 데이터는 현재 scope에서 그대로 유지

### Migration (초기 시드)

기존 `data.ts`의 12개 기사에 `content` 필드(기존 placeholder 본문)를 추가하여 Blob에 업로드하는 시드 스크립트 작성.

---

## Security

- **인증**: `ADMIN_PASSWORD` 환경변수 기반
- **세션**: httpOnly + secure 쿠키
- **추적 코드 XSS**: 관리자 신뢰 — sanitize 불필요
- **기사 HTML XSS**: 관리자 신뢰 — `dangerouslySetInnerHTML` 사용
- **API 보호**: 변경 API는 쿠키 검증 필수, GET은 인증 불필요

## Dependencies (추가)

- `@vercel/blob` — 파일 스토리지
- `nanoid` — URL-safe ID 생성

## Scope

- 추적 코드: 전체 페이지 공통 삽입만
- 콘텐츠: 기사(articles)만 관리. highlights, videos, teachers는 현재 scope 외
- 이미지 업로드: 현재 scope 외 (URL 직접 입력)
