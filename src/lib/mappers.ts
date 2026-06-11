import type { Article, Highlight, Teacher, Video, Category, SlideRole, HeroSlideItem, HeroSlide } from "./data";

// thumbnailOverlays 는 어드민 편집기 전용. 공개 페이지(toArticle 등) 에서는 노출하지 않음.
type DbArticle = {
  id: string;
  title: string;
  excerpt: string;
  content: string | null;
  category: string;
  categoryLabel: string;
  thumbnail: string | null;
  thumbnailOverlays?: string | null;
  date: string;
  slug: string;
  featured: boolean | null;
  examYear?: string | null;
  examGrade?: string | null;
  examSubject?: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type DbHtmlPage = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  category?: string | null;
  categoryLabel?: string | null;
  thumbnail?: string | null;
  date: string;
};

type DbHighlight = {
  id: string;
  title: string;
  thumbnail: string | null;
  thumbnailOverlays?: string | null;
  slug: string;
};

type DbTeacher = {
  id: string;
  name: string;
  subject: string;
  photo: string | null;
  thumbnailOverlays?: string | null;
  slug: string;
};

type DbVideo = {
  id: string;
  title: string;
  youtubeId: string;
  thumbnail: string | null;
  thumbnailOverlays?: string | null;
  sortOrder: number | null;
};

export function toArticle(row: DbArticle): Article {
  return {
    id: row.id,
    title: row.title,
    excerpt: row.excerpt,
    content: row.content ?? undefined,
    category: row.category as Category,
    categoryLabel: row.categoryLabel,
    thumbnail: row.thumbnail ?? "",
    date: row.date,
    slug: row.slug,
    featured: row.featured ?? false,
    examYear: row.examYear ?? "",
    examGrade: row.examGrade ?? "",
    examSubject: row.examSubject ?? "",
  };
}

// 독립 HTML 페이지를 "최신 교육정보" 피드 카드(Article 형태)로 매핑.
// kind="html" 로 표시해 카드가 /p/{slug} 로 링크하도록 한다.
// category 가 지정돼 있으면 해당 카테고리 탭 + "전체" 탭에 노출되고,
// 비어 있으면(레거시·미지정) "html" 폴백 → 어떤 탭에도 매칭되지 않아 "전체" 탭에서만 노출된다.
export function toHtmlPageCard(row: DbHtmlPage): Article {
  return {
    id: row.id,
    title: row.title,
    excerpt: row.excerpt ?? "",
    category: (row.category || "html") as Category,
    categoryLabel: row.categoryLabel || "페이지",
    thumbnail: row.thumbnail ?? "",
    date: row.date,
    slug: row.slug,
    kind: "html",
  };
}

export function toHighlight(row: DbHighlight): Highlight {
  return {
    id: row.id,
    title: row.title,
    thumbnail: row.thumbnail ?? "",
    slug: row.slug,
  };
}

export function toTeacher(row: DbTeacher): Teacher {
  return {
    id: row.id,
    name: row.name,
    subject: row.subject,
    photo: row.photo ?? "",
    slug: row.slug,
  };
}

type DbHeroSlide = {
  id: string;
  sortOrder: number | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type DbHeroSlideItem = {
  id: string;
  slideId: string;
  articleId: string;
  role: string;
  sortOrder: number | null;
};

export function resolveSlides(
  rawSlides: DbHeroSlide[],
  rawItems: DbHeroSlideItem[],
  allArticles: Article[],
): HeroSlide[] {
  const articleMap = new Map(allArticles.map((a) => [a.id, a]));

  return rawSlides
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((slide) => {
      const items = rawItems
        .filter((item) => item.slideId === slide.id)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((item) => {
          const article = articleMap.get(item.articleId);
          if (!article) return null;
          return {
            id: item.id,
            role: item.role as SlideRole,
            article,
          };
        })
        .filter((item): item is HeroSlideItem => item !== null);

      if (!items.some((item) => item.role === "main")) return null;

      return {
        id: slide.id,
        sortOrder: slide.sortOrder ?? 0,
        items,
      };
    })
    .filter((s): s is HeroSlide => s !== null);
}

export function toVideo(row: DbVideo): Video {
  return {
    id: row.id,
    title: row.title,
    youtubeId: row.youtubeId,
    thumbnail: row.thumbnail ?? "",
    sortOrder: row.sortOrder ?? 0,
  };
}
