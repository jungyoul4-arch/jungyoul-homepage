import { describe, it, expect } from "vitest";
import { toArticle, toHighlight, toTeacher, toVideo, resolveSlides, resolveHighlights } from "../mappers";
import type { Article } from "../data";

const baseArticleRow = {
  id: "1",
  title: "Test Article",
  excerpt: "Short excerpt",
  content: "<p>Body</p>",
  category: "news",
  categoryLabel: "뉴스",
  thumbnail: "/img/thumb.jpg",
  date: "2024-01-15",
  slug: "test-article-abc12345",
  featured: true,
  createdAt: "2024-01-15T00:00:00.000Z",
  updatedAt: "2024-01-15T00:00:00.000Z",
};

describe("toArticle", () => {
  it("maps all fields correctly", () => {
    const article = toArticle(baseArticleRow);
    expect(article.id).toBe("1");
    expect(article.title).toBe("Test Article");
    expect(article.excerpt).toBe("Short excerpt");
    expect(article.content).toBe("<p>Body</p>");
    expect(article.category).toBe("news");
    expect(article.thumbnail).toBe("/img/thumb.jpg");
    expect(article.featured).toBe(true);
  });

  it("falls back to empty string when thumbnail is null", () => {
    const article = toArticle({ ...baseArticleRow, thumbnail: null });
    expect(article.thumbnail).toBe("");
  });

  it("falls back to undefined when content is null", () => {
    const article = toArticle({ ...baseArticleRow, content: null });
    expect(article.content).toBeUndefined();
  });

  it("falls back to false when featured is null", () => {
    const article = toArticle({ ...baseArticleRow, featured: null });
    expect(article.featured).toBe(false);
  });

  it("falls back to empty string for null exam fields", () => {
    const article = toArticle({ ...baseArticleRow, examYear: null, examGrade: null, examSubject: null });
    expect(article.examYear).toBe("");
    expect(article.examGrade).toBe("");
    expect(article.examSubject).toBe("");
  });

  it("preserves exam tag values when present", () => {
    const article = toArticle({ ...baseArticleRow, examYear: "2024", examGrade: "고3", examSubject: "국어" });
    expect(article.examYear).toBe("2024");
    expect(article.examGrade).toBe("고3");
    expect(article.examSubject).toBe("국어");
  });
});

describe("toHighlight", () => {
  it("maps all fields", () => {
    const h = toHighlight({ id: "2", title: "하이라이트", thumbnail: "/img/h.jpg", slug: "highlight-xyz" });
    expect(h).toEqual({ id: "2", title: "하이라이트", thumbnail: "/img/h.jpg", slug: "highlight-xyz", linkUrl: "", linkedKind: "", linkedId: "" });
  });

  it("falls back to empty string when thumbnail is null", () => {
    const h = toHighlight({ id: "3", title: "no thumb", thumbnail: null, slug: "no-thumb" });
    expect(h.thumbnail).toBe("");
  });

  it("preserves linkUrl(연결 링크) when present", () => {
    const h = toHighlight({ id: "4", title: "연결", thumbnail: "", slug: "linked", linkUrl: "/articles/x" });
    expect(h.linkUrl).toBe("/articles/x");
  });
});

describe("toTeacher", () => {
  it("maps all fields", () => {
    const t = toTeacher({ id: "5", name: "김선생", subject: "수학", photo: "/img/t.jpg", slug: "kim" });
    expect(t).toEqual({ id: "5", name: "김선생", subject: "수학", photo: "/img/t.jpg", slug: "kim" });
  });

  it("falls back to empty string when photo is null", () => {
    const t = toTeacher({ id: "6", name: "이선생", subject: "영어", photo: null, slug: "lee" });
    expect(t.photo).toBe("");
  });
});

describe("toVideo", () => {
  it("maps all fields", () => {
    const v = toVideo({ id: "10", title: "영상", youtubeId: "abc123", thumbnail: "/img/v.jpg", sortOrder: 3 });
    expect(v).toEqual({ id: "10", title: "영상", youtubeId: "abc123", thumbnail: "/img/v.jpg", sortOrder: 3 });
  });

  it("falls back to empty string for null thumbnail", () => {
    const v = toVideo({ id: "11", title: "v", youtubeId: "yt123", thumbnail: null, sortOrder: null });
    expect(v.thumbnail).toBe("");
    expect(v.sortOrder).toBe(0);
  });
});

describe("resolveSlides", () => {
  const articles: Article[] = [
    { id: "a1", title: "A1", excerpt: "e", category: "news", categoryLabel: "뉴스", thumbnail: "", date: "2024-01-01", slug: "a1", featured: false },
    { id: "a2", title: "A2", excerpt: "e", category: "news", categoryLabel: "뉴스", thumbnail: "", date: "2024-01-01", slug: "a2", featured: false },
  ];

  it("resolves a valid slide with main role", () => {
    const slides = resolveSlides(
      [{ id: "s1", sortOrder: 1, createdAt: null, updatedAt: null }],
      [{ id: "i1", slideId: "s1", articleId: "a1", role: "main", sortOrder: 0 }],
      articles
    );
    expect(slides).toHaveLength(1);
    expect(slides[0].id).toBe("s1");
    expect(slides[0].items[0].role).toBe("main");
  });

  it("filters out slides without a main role item", () => {
    const slides = resolveSlides(
      [{ id: "s2", sortOrder: 1, createdAt: null, updatedAt: null }],
      [{ id: "i2", slideId: "s2", articleId: "a1", role: "sub", sortOrder: 0 }],
      articles
    );
    expect(slides).toHaveLength(0);
  });

  it("filters out items with missing articles", () => {
    const slides = resolveSlides(
      [{ id: "s3", sortOrder: 1, createdAt: null, updatedAt: null }],
      [
        { id: "i3", slideId: "s3", articleId: "a1", role: "main", sortOrder: 0 },
        { id: "i4", slideId: "s3", articleId: "missing-id", role: "sub", sortOrder: 1 },
      ],
      articles
    );
    expect(slides[0].items).toHaveLength(1);
    expect(slides[0].items[0].article.id).toBe("a1");
  });

  it("sorts slides by sortOrder", () => {
    const slides = resolveSlides(
      [
        { id: "sB", sortOrder: 2, createdAt: null, updatedAt: null },
        { id: "sA", sortOrder: 1, createdAt: null, updatedAt: null },
      ],
      [
        { id: "iB", slideId: "sB", articleId: "a1", role: "main", sortOrder: 0 },
        { id: "iA", slideId: "sA", articleId: "a2", role: "main", sortOrder: 0 },
      ],
      articles
    );
    expect(slides[0].id).toBe("sA");
    expect(slides[1].id).toBe("sB");
  });

  it("returns empty array when given no slides", () => {
    expect(resolveSlides([], [], articles)).toEqual([]);
  });
});

describe("resolveHighlights", () => {
  const content = {
    articles: [
      { id: "art1", title: "기사제목", excerpt: "", category: "news" as const, categoryLabel: "뉴스", thumbnail: "/art.jpg", date: "2024-01-01", slug: "art-slug", featured: false },
    ],
    htmlPages: [
      { id: "html1", title: "HTML제목", excerpt: "", category: "html" as const, categoryLabel: "페이지", thumbnail: "/html.jpg", date: "2024-01-01", slug: "html-slug", kind: "html" as const },
    ],
    urlPages: [
      { id: "url1", title: "URL제목", excerpt: "", category: "url" as const, categoryLabel: "링크", thumbnail: "/url.jpg", date: "2024-01-01", slug: "url1", kind: "url" as const, externalUrl: "https://example.com" },
    ],
  };

  it("syncs title/thumbnail/link from a linked article", () => {
    const [h] = resolveHighlights(
      [{ id: "h1", title: "old", thumbnail: "/old.jpg", slug: "h1", linkedKind: "article", linkedId: "art1" }],
      content,
    );
    expect(h.title).toBe("기사제목");
    expect(h.thumbnail).toBe("/art.jpg");
    expect(h.linkUrl).toBe("/articles/art-slug");
  });

  it("links an html page to /p/{slug}", () => {
    const [h] = resolveHighlights(
      [{ id: "h2", title: "", thumbnail: "", slug: "h2", linkedKind: "html", linkedId: "html1" }],
      content,
    );
    expect(h.title).toBe("HTML제목");
    expect(h.linkUrl).toBe("/p/html-slug");
  });

  it("links a url page to its externalUrl", () => {
    const [h] = resolveHighlights(
      [{ id: "h3", title: "", thumbnail: "", slug: "h3", linkedKind: "url", linkedId: "url1" }],
      content,
    );
    expect(h.title).toBe("URL제목");
    expect(h.linkUrl).toBe("https://example.com");
  });

  it("uses manual values when there is no link reference", () => {
    const [h] = resolveHighlights(
      [{ id: "h4", title: "수동", thumbnail: "/manual.jpg", slug: "h4", linkUrl: "https://manual.test", linkedKind: "", linkedId: "" }],
      content,
    );
    expect(h.title).toBe("수동");
    expect(h.thumbnail).toBe("/manual.jpg");
    expect(h.linkUrl).toBe("https://manual.test");
  });

  it("falls back to snapshot when linked content is missing but manual values exist", () => {
    const [h] = resolveHighlights(
      [{ id: "h5", title: "스냅샷", thumbnail: "/snap.jpg", slug: "h5", linkedKind: "article", linkedId: "deleted" }],
      content,
    );
    expect(h.title).toBe("스냅샷");
    expect(h.thumbnail).toBe("/snap.jpg");
  });

  it("excludes a highlight when linked content is missing and no manual values", () => {
    const result = resolveHighlights(
      [{ id: "h6", title: "", thumbnail: "", slug: "h6", linkUrl: "", linkedKind: "article", linkedId: "deleted" }],
      content,
    );
    expect(result).toHaveLength(0);
  });

  it("returns empty array for no highlights", () => {
    expect(resolveHighlights([], content)).toEqual([]);
  });
});
