// 타입 정의 및 카테고리 상수 (DB 전환 후에도 공유)
// "html"·"url" 은 독립 HTML/URL 페이지 전용 의사 카테고리 — categories 배열엔 넣지 않아 탭이 생성되지 않고,
// "전체" 탭에서만 노출된다(특정 카테고리 탭 필터에 매칭되지 않음).
export type Category = "all" | "strategy" | "column" | "success" | "news" | "exam" | "growth" | "html" | "url";

export interface Article {
  id: string;
  title: string;
  excerpt: string;
  content?: string;
  category: Category;
  categoryLabel: string;
  thumbnail: string;
  date: string;
  slug: string;
  featured?: boolean;
  // 공개 피드(메인·목록·카테고리) 노출 제어. true 면 숨김. 어드민 카드 뱃지/필터에 사용.
  hidden?: boolean;
  // /exam 전용 태그. category="exam" 이 아닌 글에서는 빈 문자열.
  examYear?: string;
  examGrade?: string;
  examSubject?: string;
  // 콘텐츠 종류. 기본 "article"(=/articles/{slug}). "html" 은 독립 HTML 페이지(=/p/{slug}),
  // "url" 은 외부 URL 페이지(=externalUrl 로 새 탭 이동). 피드에 섞여 노출되며 카드 링크 경로 분기에 쓰인다.
  kind?: "article" | "html" | "url";
  // kind="url" 일 때 카드 클릭 시 이동할 외부 URL. 다른 kind 에서는 미사용.
  externalUrl?: string;
}

export interface ExamTagOption {
  id: string;
  tagType: "year" | "grade" | "subject";
  value: string;
  sortOrder: number;
}

export interface Highlight {
  id: string;
  title: string;
  thumbnail: string;
  slug: string;
  // 카드 클릭 시 이동할 링크. 비우면 /highlights/{slug} 상세로 이동.
  linkUrl?: string;
  // 연결된 컨텐츠 참조(어드민 편집 폼이 현재 연결 상태를 읽기 위함). 둘 다 비면 직접입력 모드.
  // 공개 카드는 resolveHighlights() 가 이 참조를 풀어 title/thumbnail/linkUrl 을 채운 뒤 렌더.
  linkedKind?: "article" | "html" | "url" | "";
  linkedId?: string;
}

export interface Teacher {
  id: string;
  name: string;
  subject: string;
  photo: string;
  slug: string;
}

export interface Video {
  id: string;
  title: string;
  youtubeId: string;
  thumbnail: string;
  sortOrder: number;
}

export type SlideRole = "main" | "sub-image" | "sub-text";

export interface HeroSlideItem {
  id: string;
  role: SlideRole;
  article: Article;
}

export interface HeroSlide {
  id: string;
  sortOrder: number;
  items: HeroSlideItem[];
}

export const categories: { value: Category; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "strategy", label: "입시전략" },
  { value: "column", label: "교육칼럼" },
  { value: "success", label: "합격스토리" },
  { value: "news", label: "공지사항" },
  { value: "exam", label: "시험지 분석" },
  { value: "growth", label: "성장스토리" },
];
