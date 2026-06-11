import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";

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
}, (t) => [
  // /exam·기사 목록의 카테고리 필터 / 날짜 정렬 경로 — 데이터 증가 시 풀스캔 방지
  index("articles_category_idx").on(t.category),
  index("articles_date_idx").on(t.date),
]);

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

// 독립 HTML 페이지 — 어드민이 원본 HTML 을 통째로 등록하면 /p/{slug} 에서
// sandbox iframe 으로 풀스크린 렌더(사이트 헤더/푸터 없음). 본문 에디터의 raw 블록과 별개 엔티티.
// content 는 정화 없이 verbatim 저장(iframe sandbox 가 격리). 메인 "최신 교육정보" 피드에 date 순으로 섞임.
export const htmlPages = sqliteTable(
  "html_pages",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").unique().notNull(),
    excerpt: text("excerpt").default(""),
    categoryLabel: text("category_label").default("페이지"),
    content: text("content").notNull(),                 // 원본 HTML 전체 (verbatim)
    thumbnail: text("thumbnail").default(""),            // 카드 썸네일 (16:9)
    thumbnailOverlays: text("thumbnail_overlays").default(""),
    date: text("date").notNull(),                       // 피드 정렬/표시 (YYYY/MM/DD)
    createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()),
  },
  (t) => [index("html_pages_date_idx").on(t.date)]
);

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

export const navMenus = sqliteTable(
  "nav_menus",
  {
    id: text("id").primaryKey(),
    parentId: text("parent_id"),           // null = 최상위, 값 있으면 하위 항목
    label: text("label").notNull(),
    href: text("href").notNull(),
    sortOrder: integer("sort_order").default(0),
  },
  (t) => [index("nav_menus_sort_order_idx").on(t.sortOrder)]
);

export const siteSettings = sqliteTable("site_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()),
});

export const headerLinks = sqliteTable(
  "header_links",
  {
    id: text("id").primaryKey(),
    label: text("label").notNull(),
    href: text("href").notNull(),
    icon: text("icon").default(""),         // 레거시(deprecated): 어드민 신규 입력 받지 않음. 기존 데이터 보존 + image_url 미설정 시 폴백
    imageUrl: text("image_url").default(""), // 사용자 업로드 이미지(/api/admin/upload/...), 헤더 버튼 좌측 아이콘 자리에 노출
    sortOrder: integer("sort_order").default(0),
  },
  (t) => [index("header_links_sort_order_idx").on(t.sortOrder)]
);

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

// 메인 헤더 '액자' 버튼이 여는 풀스크린 슬라이드쇼 항목.
// mediaType=image 면 image_url(자사 R2 경로) 노출, youtube 면 youtube_id(11자) 임베드.
// duration_sec 은 이미지 표시 시간(초) — 유튜브는 영상 종료 시 자동 전환하므로 무시.
export const pictureFrameItems = sqliteTable(
  "picture_frame_items",
  {
    id: text("id").primaryKey(),
    mediaType: text("media_type").notNull(),          // "image" | "youtube"
    imageUrl: text("image_url").default(""),          // /api/admin/upload/{key}
    youtubeId: text("youtube_id").default(""),        // 11자 ID
    durationSec: integer("duration_sec").default(7),  // 이미지 표시 시간(초)
    sortOrder: integer("sort_order").default(0),
    createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
  },
  (t) => [index("picture_frame_items_sort_order_idx").on(t.sortOrder)]
);

// ── 익명 커뮤니티 (/community) — 고등학생 위주 익명 게시판 ──────────────
// 익명 세션. 쿠키 anon_session 의 JWT 페이로드 sid 와 1:1 매핑. 닉네임은 영속.
export const communitySessions = sqliteTable("community_sessions", {
  id: text("id").primaryKey(),                                  // uuid v4
  nickname: text("nickname").notNull(),                         // "조용한코끼리042"
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
  lastSeenAt: text("last_seen_at").$defaultFn(() => new Date().toISOString()),
});

// 어드민이 관리하는 태그 옵션. 글 작성/필터 셀렉트에 노출.
export const communityTags = sqliteTable(
  "community_tags",
  {
    id: text("id").primaryKey(),
    value: text("value").notNull(),
    sortOrder: integer("sort_order").default(0),
  },
  (t) => [uniqueIndex("community_tags_value_idx").on(t.value)]
);

// 커뮤니티 게시글. body 는 sanitize-html 적용된 HTML 단편.
// like_count·comment_count 는 비정규화(트랜잭션 없이 +1/-1).
export const communityPosts = sqliteTable("community_posts", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),                      // community_sessions.id (soft FK)
  nicknameSnapshot: text("nickname_snapshot").notNull(),        // 작성 시점 닉네임
  title: text("title").notNull(),                               // ≤120자
  body: text("body").notNull(),                                 // sanitize-html, ≤5000자
  imageUrl: text("image_url").default(""),                      // /api/community/upload/{key}
  tag: text("tag").default(""),                                 // community_tags.value 카피(SSOT)
  likeCount: integer("like_count").default(0),
  commentCount: integer("comment_count").default(0),
  isDeleted: integer("is_deleted", { mode: "boolean" }).default(false),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
}, (t) => [
  // 작성자별 글 조회 / 피드 cursor 정렬(createdAt|id) 경로
  index("community_posts_session_id_idx").on(t.sessionId),
  index("community_posts_created_at_idx").on(t.createdAt),
  // 피드 cursor 정렬(createdAt DESC, id DESC) — 복합 인덱스로 seek 최적화
  index("community_posts_created_id_idx").on(t.createdAt, t.id),
  // 태그 필터 + 최신순 — tag 무인덱스 풀스캔 방지
  index("community_posts_tag_created_idx").on(t.tag, t.createdAt),
]);

// 좋아요. (post, session) 유니크 — 토글 가능.
export const communityPostLikes = sqliteTable(
  "community_post_likes",
  {
    id: text("id").primaryKey(),
    postId: text("post_id").notNull(),
    sessionId: text("session_id").notNull(),
    createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
  },
  (t) => [uniqueIndex("community_post_likes_post_session_idx").on(t.postId, t.sessionId)]
);

// 평면(flat) 댓글. 본인 식별은 session_id 기반.
export const communityComments = sqliteTable("community_comments", {
  id: text("id").primaryKey(),
  postId: text("post_id").notNull(),
  sessionId: text("session_id").notNull(),
  nicknameSnapshot: text("nickname_snapshot").notNull(),
  body: text("body").notNull(),                                 // sanitize-html, ≤1000자
  isDeleted: integer("is_deleted", { mode: "boolean" }).default(false),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
}, (t) => [
  // 게시글 상세의 댓글 일괄 로드 경로
  index("community_comments_post_id_idx").on(t.postId),
]);
