# SEO/AEO 체크리스트

## 페이지 추가 시
- [ ] `<head>` metadata 작성 (title/description/keywords/openGraph)
- [ ] JSON-LD 구조화 데이터 삽입 (Article/Organization/BreadcrumbList 등)
- [ ] `src/app/sitemap.ts`에 새 경로 추가
- [ ] `src/app/robots.ts` 정책 확인

## 링크 추가 시
- [ ] 대상 페이지 존재 여부 확인 — 데드링크 금지

## XSS 방지
- 모든 JSON-LD 직렬화: `.replace(/</g, "\\u003c")` 적용 필수

## 자산 규격
- OG 이미지: `/public/og-image.png` (1200×630)
- 로고: `/public/logo.png` (최소 112×112)

## 인증 코드 교체
- `src/app/layout.tsx`에서 `REPLACE_WITH_` 접두사 검색 → Google/Naver 인증 코드로 교체
