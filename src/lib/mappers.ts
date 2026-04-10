import type { Article, Highlight, Teacher, Video, Category, SlideRole, HeroSlideItem, HeroSlide } from "./data";

type DbArticle = {
  id: string;
  title: string;
  excerpt: string;
  content: string | null;
  category: string;
  categoryLabel: string;
  thumbnail: string | null;
  date: string;
  slug: string;
  featured: boolean | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type DbHighlight = {
  id: string;
  title: string;
  thumbnail: string | null;
  slug: string;
};

type DbTeacher = {
  id: string;
  name: string;
  subject: string;
  photo: string | null;
  slug: string;
};

type DbVideo = {
  id: string;
  title: string;
  youtubeId: string;
  thumbnail: string | null;
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
