# 워크트리간 큐 프로토콜

> 트리거: `.queue/` 디렉터리 작업, content 워크트리에서 온 요청 처리, "큐에 등록" 같은 키워드.

## 구조
- 본 워크트리(UI/코드)와 content 워크트리(원고)가 분리되어 있음
- content 워크트리가 `.queue/*.json`으로 작업 요청을 보냄
- JSON 스키마와 작성 규칙은 [`AGENTS.md`](../AGENTS.md) 참조
