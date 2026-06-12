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
  hidden?: boolean | null;
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
  hidden?: boolean | null;
};

type DbUrlPage = {
  id: string;
  title: string;
  excerpt?: string | null;
  category?: string | null;
  categoryLabel?: string | null;
  externalUrl: string;
  thumbnail?: string | null;
  date: string;
  hidden?: boolean | null;
};

type DbHighlight = {
  id: string;
  title: string;
  thumbnail: string | null;
  thumbnailOverlays?: string | null;
  slug: string;
  linkUrl?: string | null;
  linkedKind?: string | null;
  linkedId?: string | null;
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
    hidden: row.hidden ?? false,
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
    hidden: row.hidden ?? false,
  };
}

// 독립 URL 페이지를 피드 카드(Article 형태)로 매핑.
// kind="url" + externalUrl 로 표시해 카드가 외부 URL 로 새 탭 이동하도록 한다.
// slug 는 라우트에 쓰이지 않으나 Article.slug 가 필수라 row.id 로 채워 카드 key 용도로만 쓴다.
// category 가 비어 있으면(미지정) "url" 폴백 → 어떤 탭에도 매칭되지 않아 "전체" 탭에서만 노출된다.
export function toUrlPageCard(row: DbUrlPage): Article {
  return {
    id: row.id,
    title: row.title,
    excerpt: row.excerpt ?? "",
    category: (row.category || "url") as Category,
    categoryLabel: row.categoryLabel || "링크",
    thumbnail: row.thumbnail ?? "",
    date: row.date,
    slug: row.id,
    kind: "url",
    externalUrl: row.externalUrl,
    hidden: row.hidden ?? false,
  };
}

export function toHighlight(row: DbHighlight): Highlight {
  return {
    id: row.id,
    title: row.title,
    thumbnail: row.thumbnail ?? "",
    slug: row.slug,
    linkUrl: row.linkUrl ?? "",
    linkedKind: (row.linkedKind ?? "") as Highlight["linkedKind"],
    linkedId: row.linkedId ?? "",
  };
}

// 하이라이트의 연결 참조(linkedKind+linkedId)를 풀어 공개 카드용 Highlight[] 로 평탄화한다.
// 참조가 있으면 연결 컨텐츠의 title/thumbnail/링크로 동기화(원본 수정 시 자동 반영),
// 없으면 직접입력 수동값을 그대로 사용. 연결 컨텐츠를 못 찾으면(삭제·숨김) 수동값 fallback,
// 그것도 비면 깨진 카드를 막기 위해 목록에서 제외한다. resolveSlides 와 동일한 조인 패턴.
// content 의 각 배열은 이미 toArticle/toHtmlPageCard/toUrlPageCard 로 매핑된 Article[].
export function resolveHighlights(
  rawHighlights: DbHighlight[],
  content: { articles: Article[]; htmlPages: Article[]; urlPages: Article[] },
): Highlight[] {
  const maps: Record<"article" | "html" | "url", Map<string, Article>> = {
    article: new Map(content.articles.map((a) => [a.id, a])),
    html: new Map(content.htmlPages.map((a) => [a.id, a])),
    url: new Map(content.urlPages.map((a) => [a.id, a])),
  };

  function linkFor(kind: "article" | "html" | "url", item: Article): string {
    if (kind === "url") return item.externalUrl ?? "";
    if (kind === "html") return `/p/${item.slug}`;
    return `/articles/${item.slug}`;
  }

  return rawHighlights
    .map((row): Highlight | null => {
      const base = toHighlight(row);
      const kind = base.linkedKind;
      const linkedId = base.linkedId ?? "";

      // 참조 없음 → 직접입력 모드(현행과 동일)
      if (!kind || !linkedId) return base;

      const item = maps[kind]?.get(linkedId);
      if (item) {
        // 참조 모드 → 연결 컨텐츠로 동기화
        return {
          ...base,
          title: item.title,
          thumbnail: item.thumbnail,
          linkUrl: linkFor(kind, item),
        };
      }

      // 연결 컨텐츠 없음(삭제·숨김) → 수동값 fallback, 둘 다 없으면 제외
      if (base.title || base.thumbnail || base.linkUrl) return base;
      return null;
    })
    .filter((h): h is Highlight => h !== null);
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
