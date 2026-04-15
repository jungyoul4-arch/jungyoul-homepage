// 타입 정의 및 카테고리 상수 (DB 전환 후에도 공유)
export type Category = "all" | "strategy" | "column" | "success" | "news";

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
  pinnedOrder?: number | null;
}

export interface Highlight {
  id: string;
  title: string;
  thumbnail: string;
  slug: string;
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
];
