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

## Potential Issues & Mitigations

### 치명적 — 반드시 구현에 반영

| # | 문제 | 대응 |
|---|------|------|
| 1 | sitemap.ts Blob fetch 실패 시 빈 사이트맵 → 구글 인덱스 삭제 위험 | fetch 실패 시 에러 throw (빈 배열 반환 금지) |
| 2 | 기사 필수 필드 미검증 → JSON-LD 불완전 → 리치 결과 탈락 | API에서 title, excerpt, date, slug 필수 유효성 검증 |
| 3 | 기사 삭제 → 404 누적 → 사이트 신뢰도 하락 | 삭제 시 카테고리 목록으로 301 리다이렉트 옵션 |
| 4 | 기존 12개 기사 slug 변경 → 인덱싱된 URL 404 | 시드 스크립트에서 기존 slug 100% 보존 |
| 5 | 기사 슬러그 충돌 → URL 중복/404 | 저장 시 슬러그 중복 체크, 중복이면 거부 |

### 중요 — 구현 시 반영

| # | 문제 | 대응 |
|---|------|------|
| 6 | Blob 런타임 fetch → TTFB 증가 → Core Web Vitals 감점 | layout.tsx, articles 페이지에 ISR `revalidate: 60` 적용 |
| 7 | HTML 본문에 시맨틱 태그 없이 작성 → AEO 효과 없음 | 관리자 UI에 시맨틱 HTML 템플릿 제공 (`<h2>`, `<p>`, `<ul>`) |
| 8 | 추적 코드 렌더링 블로킹 → FCP/LCP 저하 | 삽입 시 `async`/`defer` 권장 안내 표시 |
| 9 | 모든 기사 OG 이미지 동일 → SNS/AI 인용 시 구분 불가 | `thumbnail` 필드를 `og:image`로 활용 |
| 10 | HTML 본문 깨짐 (닫히지 않은 태그) → 페이지 레이아웃 파괴 | 미리보기 기능 + 본문을 격리된 `<div>`로 감싸기 |
| 11 | articles.json 비대화 (수백 개 기사) | 초기엔 단일 파일, 50개 이상 시 목록/상세 분리 저장 |
| 12 | JSON 데이터 백업 부재 → Blob 장애 시 복구 불가 | 관리자 UI에 JSON 내보내기/가져오기 버튼 |
| 13 | 로그인 브루트포스 공격 | 5회 실패 시 1분 대기 + 쿠키 서명(위조 방지) |

### 권장 — 운영 단계 개선

| # | 문제 | 대응 |
|---|------|------|
| 14 | 동시 편집 race condition → 데이터 덮어쓰기 | `updatedAt` 타임스탬프 비교로 충돌 감지 |
| 15 | 추적 코드 5개 이상 → 성능 저하 | 개수 경고 UI |
| 16 | GTM + 개별 GA 이중 삽입 → 데이터 왜곡 | "GTM 사용 시 개별 코드는 GTM에서 관리" 안내 |
| 17 | 관리자 계정 탈취 → 악성 스크립트 전체 삽입 | 비밀번호 강도 가이드 + 변경 시 이메일 알림 (향후) |
| 18 | AI 봇 크롤링 빈도 낮음 → 새 기사 AI 검색 반영 지연 | `revalidate` 300초 이내 유지 |
| 19 | 본문 내 이미지가 `<img>` → LCP 최적화 누락 | 향후 이미지 업로드 + next/image 변환 고려 |

## Scope

- 추적 코드: 전체 페이지 공통 삽입만
- 콘텐츠: 기사(articles)만 관리. highlights, videos, teachers는 현재 scope 외
- 이미지 업로드: 현재 scope 외 (URL 직접 입력)
- sitemap.ts: Blob 기반으로 업데이트 (scope 내)
