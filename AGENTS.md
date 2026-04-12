<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Content 워크트리 — 콘텐츠 제작 전용

## 이 워크트리의 역할
교육 기사 원고를 마크다운으로 작성하는 워크트리.
코드 수정은 하지 않는다. 오직 콘텐츠 작성에만 집중한다.

## 글 작성 규칙

### 톤 & 스타일
- 삼성 뉴스룸 기사 스타일: 객관적이고 전문적인 교육 미디어 어조
- "~합니다" 체 (경어체)
- 학원 홍보 금지 — "교육 정보 미디어" 포지셔닝
- 키워드 자연 삽입 (SEO 고려)

### 카테고리
| 코드 | 라벨 | 용도 |
|------|------|------|
| `strategy` | 입시전략 | 대입 분석, 입시 전략 |
| `column` | 교육칼럼 | 교육 트렌드, 학습법 |
| `success` | 합격스토리 | 합격 사례, 후기 |
| `news` | 공지사항 | 학원 소식, 일정 |

### 원고 작성 위치
- `content/drafts/` 폴더에 마크다운 파일 생성
- `content/drafts/_template.md`를 복사해서 사용
- 파일명 = slug (예: `2025-suneung-strategy.md`)

### frontmatter 필수 필드
```yaml
---
title: "제목"
category: strategy
excerpt: "1~2문장 요약"
thumbnail_prompt: "썸네일 이미지 설명"
date: 2026-04-12
slug: "url-slug"
featured: false
---
```

## 글 완성 후 → UI 워크트리로 전달

사용자가 "이 글 완성이야" 또는 "UI로 보내줘"라고 하면:

1. frontmatter가 모두 채워져 있는지 확인
2. `.queue/`에 작업 요청 JSON 생성:

```bash
cat > .queue/$(date +%s)-{slug}.json << 'EOF'
{
  "status": "pending",
  "source": "content",
  "target": "ui",
  "action": "create-article",
  "slug": "해당-slug",
  "draft_path": "/Users/jungyoulkwak/Desktop/jungyoul-content/content/drafts/해당파일.md",
  "created_at": "ISO-8601 타임스탬프"
}
EOF
```

3. 사용자에게 "큐에 등록 완료. ui 워크트리에서 처리하면 됩니다." 안내
