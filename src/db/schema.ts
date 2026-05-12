import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";

export const articles = sqliteTable("articles", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull(),
  content: text("content").default(""),
  category: text("category").notNull(),
  categoryLabel: text("category_label").notNull(),
  thumbnail: text("thumbnail").default(""),
  // 썸네일 텍스트 오버레이 메타 (JSON: { version, baseImageUrl, overlays }) — 어드민 편집 전용
  thumbnailOverlays: text("thumbnail_overlays").default(""),
  date: text("date").notNull(),
  slug: text("slug").unique().notNull(),
  featured: integer("featured", { mode: "boolean" }).default(false),
  // /exam 전용 태그 — category="exam" 일 때만 폼에 노출. 다른 카테고리에서는 빈 문자열로 남는 silent metadata.
  examYear: text("exam_year").default(""),
  examGrade: text("exam_grade").default(""),
  examSubject: text("exam_subject").default(""),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()),
});

export const highlights = sqliteTable("highlights", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  thumbnail: text("thumbnail").default(""),
  thumbnailOverlays: text("thumbnail_overlays").default(""),
  slug: text("slug").unique().notNull(),
});

export const teachers = sqliteTable("teachers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  photo: text("photo").default(""),
  // 사진 위 텍스트 오버레이 메타 — 컬럼명은 articles 와 통일하여 thumbnail_overlays 사용
  thumbnailOverlays: text("thumbnail_overlays").default(""),
  slug: text("slug").unique().notNull(),
});

export const videos = sqliteTable("videos", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  youtubeId: text("youtube_id").notNull(),
  thumbnail: text("thumbnail").default(""),
  thumbnailOverlays: text("thumbnail_overlays").default(""),
  sortOrder: integer("sort_order").default(0),
});

export const trackingCodes = sqliteTable("tracking_codes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  position: text("position").notNull(), // "head" | "body-start" | "body-end"
  enabled: integer("enabled", { mode: "boolean" }).default(true),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
});

export const admin = sqliteTable("admin", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
});

export const heroSlides = sqliteTable("hero_slides", {
  id: text("id").primaryKey(),
  sortOrder: integer("sort_order").default(0),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()),
});

export const heroSlideItems = sqliteTable("hero_slide_items", {
  id: text("id").primaryKey(),
  slideId: text("slide_id").notNull(),
  articleId: text("article_id").notNull(),
  role: text("role").notNull(), // "main" | "sub-image" | "sub-text"
  sortOrder: integer("sort_order").default(0),
});

export const pinnedArticles = sqliteTable("pinned_articles", {
  slot: integer("slot").primaryKey(),        // 1~4
  articleId: text("article_id").notNull(),
});

export const navMenus = sqliteTable("nav_menus", {
  id: text("id").primaryKey(),
  parentId: text("parent_id"),           // null = 최상위, 값 있으면 하위 항목
  label: text("label").notNull(),
  href: text("href").notNull(),
  sortOrder: integer("sort_order").default(0),
});

export const siteSettings = sqliteTable("site_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()),
});

export const headerLinks = sqliteTable("header_links", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  href: text("href").notNull(),
  icon: text("icon").default(""),         // 레거시(deprecated): 어드민 신규 입력 받지 않음. 기존 데이터 보존 + image_url 미설정 시 폴백
  imageUrl: text("image_url").default(""), // 사용자 업로드 이미지(/api/admin/upload/...), 헤더 버튼 좌측 아이콘 자리에 노출
  sortOrder: integer("sort_order").default(0),
});

// /exam 페이지 태그 옵션 — 어드민이 추가/삭제/재정렬하는 셀렉트박스 후보값.
// tag_type 으로 차원 구분(year|grade|subject), value 가 노출 라벨이자 articles.exam_* 컬럼에 저장되는 값.
export const examTagOptions = sqliteTable(
  "exam_tag_options",
  {
    id: text("id").primaryKey(),
    tagType: text("tag_type").notNull(),  // "year" | "grade" | "subject"
    value: text("value").notNull(),
    sortOrder: integer("sort_order").default(0),
  },
  (t) => [uniqueIndex("exam_tag_options_type_value_idx").on(t.tagType, t.value)]
);
