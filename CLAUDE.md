# 정율 교육정보 홈페이지

## 프로젝트 정체성
- 포지셔닝: "교육 정보 미디어" — 학원 홍보 아님
- 레이아웃 기준: https://news.samsung.com/kr/ (구조/계층 재현 대상)
- 배포: Cloudflare Pages + OpenNext (https://www.jungyoul.net)
- 라이트 모드 전용 (다크 미지원)

## 항상 적용 (보안 필수)
- JSON-LD 출력 시 `.replace(/</g, "\\u003c")` XSS escape — 누락 금지
- 어드민 API는 `requireAdmin()` (`src/lib/auth.ts`) 게이트 통과
- 사용자 입력 콘텐츠는 `sanitize-html` 통과 후 저장

## 코드베이스 탐색 규칙
- 모든 코드 질문/작업 전: `graphify-out/GRAPH_REPORT.md` 먼저 읽기
- `graphify-out/wiki/index.md` 있으면 raw 파일 대신 그쪽 우선
- 코드 변경 후 `graphify update .` 실행 (AST 전용, 무료)

## 작업별 참조 문서 (필요 시 열람)
- 페이지/링크/메타데이터/sitemap 추가 → [`docs/seo-checklist.md`](docs/seo-checklist.md)
- 카테고리·네비게이션 추가 절차(단일 소스, /exam 같은 별도 라우트) → [`docs/categories.md`](docs/categories.md)
- 빠른편집 에디터(페이스트 파이프라인·HWPX·sanitize·썸네일 오버레이) → [`docs/editor.md`](docs/editor.md)
- 사업자 정보(JSON-LD Organization·푸터·연락처) → [`docs/business-info.md`](docs/business-info.md)
- 빌드/타입 에러 디버깅 회고 → [`docs/mistake-log.md`](docs/mistake-log.md)
- 워크트리간 큐 프로토콜(content ↔ UI) → [`docs/worktree-protocol.md`](docs/worktree-protocol.md)
- 콘텐츠(원고) 작성 규칙·카테고리·frontmatter → [`AGENTS.md`](AGENTS.md)
