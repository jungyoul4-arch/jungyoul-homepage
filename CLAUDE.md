# 정율 교육정보 홈페이지

## 프로젝트 개요
- 프로젝트명: 정율 교육정보 (jungyoul-homepage)
- 기술 스택: Next.js 16, TypeScript, Tailwind CSS, shadcn/ui
- 배포 환경: Cloudflare Pages (OpenNext)
- 참고 사이트: https://news.samsung.com/kr/ (삼성 뉴스룸 한국어)
- 현재 사이트: https://www.jungyoul.net/

## 핵심 목표
1. 삼성 뉴스룸 레이아웃/구조를 최대한 동일하게 구현
2. 구글/네이버 SEO + AI 검색(AEO) 최적화
3. 학원 홍보가 아닌 "교육 정보 미디어" 포지셔닝

## 사업자 정보
- 사업자: 주식회사정율 (대표: 곽정율)
- 주소: 경기도 부천시 원미구 길주로91 601호(비잔티움 6층)
- 사업자등록번호: 392-88-00208
- 학원등록번호: 제5042호
- 고객센터: 032-321-9937
- 이메일: jungyoul3@naver.com
- SNS: Instagram(@jysk_official), 네이버블로그, 카카오톡, 정율TV(YouTube)

## 핵심 규칙
- 삼성 뉴스룸 구조를 최대한 그대로 재현할 것
- SEO 관련: 모든 페이지에 JSON-LD, Open Graph, 시맨틱 HTML 적용
- 다크 모드가 아닌 라이트 모드 기본 (교육 사이트 특성)
- 한국어 폰트: Noto Sans KR 사용

## SEO 최적화 체크리스트
- 모든 JSON-LD에 `.replace(/</g, "\\u003c")` XSS 방지 패턴 적용 필수
- 새 페이지 추가 시 반드시 sitemap.ts에도 추가할 것
- 새 링크 추가 시 대상 페이지 존재 여부 확인 (데드링크 방지)
- OG 이미지: /og-image.png (1200x630), 로고: /logo.png (최소 112x112) 필요
- Google/Naver 인증 코드: layout.tsx에서 REPLACE_WITH_ 접두사로 검색하여 교체

## ⚠️ 실수 노트 (Mistake Log)

### 2026-04-08 — .next 캐시로 인한 거짓 타입 에러
- **현상**: tsc --noEmit 실행 시 .next/types/routes.d 2.ts에서 중복 선언 에러 발생
- **원인**: 이전 빌드의 .next 캐시가 현재 코드와 불일치
- **해결**: rm -rf .next 후 재실행으로 해결
- **교훈**: 대규모 파일 변경 후에는 .next 캐시 삭제 후 타입 체크 실행

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)
