# Tracking Code Manager Design

## Overview

`/admin` 페이지에서 마케팅 담당자가 추적 코드(GA, Meta Pixel, 네이버 등)를 자유롭게 추가/삭제할 수 있는 기능.
전체 페이지 공통 삽입. 재배포 없이 즉시 반영.

## Architecture

```
[마케팅 담당자] → /admin (비밀번호 인증)
       ↓
   추적 코드 CRUD UI
       ↓
   API Routes (/api/tracking-codes)
       ↓
   Vercel Blob (JSON 저장)
       ↓
   layout.tsx에서 읽어 <head> / <body> 삽입
```

## Data Model

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

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tracking-codes` | 전체 목록 조회 |
| POST | `/api/tracking-codes` | 새 코드 추가 |
| PUT | `/api/tracking-codes/[id]` | 수정 |
| DELETE | `/api/tracking-codes/[id]` | 삭제 |

- 모든 변경 요청(POST/PUT/DELETE)에 `Authorization` 헤더로 비밀번호 검증
- GET은 layout.tsx 서버 컴포넌트에서도 호출하므로 인증 불필요

## Admin UI (`/admin`)

### Pages

1. **로그인** — 비밀번호 입력 폼. `ADMIN_PASSWORD` 환경변수와 대조. 성공 시 httpOnly 쿠키 발급.
2. **목록** — 등록된 추적 코드 카드 리스트 (이름, 위치 배지, 활성 토글, 수정/삭제 버튼)
3. **추가/수정** — 이름(input), 코드(textarea), 위치(select: head/body-start/body-end), 활성(toggle)
4. **삭제** — 확인 다이얼로그 후 삭제

### UI Stack

기존 프로젝트의 shadcn/ui + Tailwind CSS 사용. 추가 UI 라이브러리 불필요.

## Frontend Script Injection

`layout.tsx`에서 서버 컴포넌트로 Vercel Blob의 활성 코드 목록을 fetch하여 position별로 삽입:

- `head` → `<head>` 안에 `dangerouslySetInnerHTML`
- `body-start` → `<body>` 여는 태그 직후
- `body-end` → `<body>` 닫는 태그 직전

런타임 fetch이므로 재배포 없이 즉시 반영.

## Security

- **인증**: `ADMIN_PASSWORD` 환경변수 기반 단일 비밀번호
- **세션**: httpOnly + secure 쿠키 (만료 시간 설정)
- **XSS**: 관리자가 의도적으로 스크립트를 넣는 기능이므로 별도 sanitize 불필요 (신뢰된 사용자)
- **API 보호**: 변경 API는 쿠키 또는 Authorization 헤더 검증 필수

## Dependencies (추가)

- `@vercel/blob` — 파일 스토리지
- `nanoid` — URL-safe ID 생성

## Scope

- 전체 페이지 공통 삽입만 지원 (페이지별 분기 없음)
- 기존 SEO 메타데이터/JSON-LD와 별도 레이어로 충돌 없음
