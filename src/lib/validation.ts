import { z } from "zod";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";
import {
  articles,
  htmlPages,
  urlPages,
  highlights,
  teachers,
  videos,
  trackingCodes,
  navMenus,
  headerLinks,
  examTagOptions,
  communityPosts,
  communityComments,
  communityTags,
  pictureFrameItems,
} from "@/db/schema";
import { isYouTubeId } from "@/lib/youtube";
import { NextResponse } from "next/server";

// 카테고리는 nav_menus(DB) 주도 SSOT — 정적 enum 대신 slug 포맷만 검사한다.
// 실제 허용 여부(멤버십)는 각 API 핸들러가 getWritableCategorySlugs(db) 로 DB 기준 검증.
const categorySlugFormat = /^[a-z0-9-]+$/;
const categoryRefine = (v: string) => categorySlugFormat.test(v);
const categoryRefineMsg = { message: "허용되지 않은 카테고리입니다." };

// URL 페이지의 외부 링크 — http(s) 스킴만 허용해 javascript:/data: 등 위험 스킴을 차단.
const externalUrlRefine = (v: string) => /^https?:\/\//i.test(v);
const externalUrlRefineMsg = { message: "http(s):// 로 시작하는 URL만 허용됩니다." };

// 썸네일 텍스트 오버레이 메타 JSON 길이 한도. {version, baseImageUrl, overlays[]} 의 직렬화 길이.
const OVERLAY_JSON_MAX = 50_000;

// Articles
export const insertArticleSchema = createInsertSchema(articles, {
  title: (schema) => schema.max(500),
  excerpt: (schema) => schema.max(1000),
  content: (schema) => schema.max(2_000_000),
  category: (schema) => schema.max(50).refine(categoryRefine, categoryRefineMsg),
  categoryLabel: (schema) => schema.max(50),
  slug: (schema) => schema.max(200),
  thumbnail: (schema) => schema.max(500),
  thumbnailOverlays: (schema) => schema.max(OVERLAY_JSON_MAX),
  date: (schema) => schema.max(50),
  examYear: (schema) => schema.max(50),
  examGrade: (schema) => schema.max(50),
  examSubject: (schema) => schema.max(50),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateArticleSchema = createUpdateSchema(articles, {
  title: (schema) => schema.max(500),
  excerpt: (schema) => schema.max(1000),
  content: (schema) => schema.max(2_000_000),
  category: (schema) => schema.max(50).refine((v) => v === undefined || categoryRefine(v), categoryRefineMsg),
  categoryLabel: (schema) => schema.max(50),
  slug: (schema) => schema.max(200),
  thumbnail: (schema) => schema.max(500),
  thumbnailOverlays: (schema) => schema.max(OVERLAY_JSON_MAX),
  date: (schema) => schema.max(50),
  examYear: (schema) => schema.max(50),
  examGrade: (schema) => schema.max(50),
  examSubject: (schema) => schema.max(50),
}).omit({
  id: true,
  createdAt: true,
});

// HTML Pages — 독립 HTML 페이지(/p/{slug} sandbox iframe). content 는 verbatim 저장.
export const insertHtmlPageSchema = createInsertSchema(htmlPages, {
  title: (schema) => schema.min(1).max(500),
  slug: (schema) => schema.max(200),
  excerpt: (schema) => schema.max(1000),
  // 기사와 동일하게 허용 카테고리만 통과. 빈 문자열(레거시·미지정)도 허용.
  category: (schema) => schema.max(50).refine((v) => v === "" || categoryRefine(v), categoryRefineMsg),
  categoryLabel: (schema) => schema.max(50),
  content: (schema) => schema.min(1).max(2_000_000),
  thumbnail: (schema) => schema.max(500),
  thumbnailOverlays: (schema) => schema.max(OVERLAY_JSON_MAX),
  date: (schema) => schema.max(50),
}).omit({ id: true, createdAt: true, updatedAt: true });
export const updateHtmlPageSchema = createUpdateSchema(htmlPages, {
  title: (schema) => schema.max(500),
  slug: (schema) => schema.max(200),
  excerpt: (schema) => schema.max(1000),
  category: (schema) => schema.max(50).refine((v) => v === undefined || v === "" || categoryRefine(v), categoryRefineMsg),
  categoryLabel: (schema) => schema.max(50),
  content: (schema) => schema.max(2_000_000),
  thumbnail: (schema) => schema.max(500),
  thumbnailOverlays: (schema) => schema.max(OVERLAY_JSON_MAX),
  date: (schema) => schema.max(50),
}).omit({ id: true, createdAt: true });

// URL Pages — 외부 URL 카드. externalUrl 은 http(s) 만 허용. slug·content 없음.
export const insertUrlPageSchema = createInsertSchema(urlPages, {
  title: (schema) => schema.min(1).max(500),
  excerpt: (schema) => schema.max(1000),
  category: (schema) => schema.max(50).refine((v) => v === "" || categoryRefine(v), categoryRefineMsg),
  categoryLabel: (schema) => schema.max(50),
  externalUrl: (schema) => schema.min(1).max(500).refine(externalUrlRefine, externalUrlRefineMsg),
  thumbnail: (schema) => schema.max(500),
  thumbnailOverlays: (schema) => schema.max(OVERLAY_JSON_MAX),
  date: (schema) => schema.max(50),
}).omit({ id: true, createdAt: true, updatedAt: true });
export const updateUrlPageSchema = createUpdateSchema(urlPages, {
  title: (schema) => schema.max(500),
  excerpt: (schema) => schema.max(1000),
  category: (schema) => schema.max(50).refine((v) => v === undefined || v === "" || categoryRefine(v), categoryRefineMsg),
  categoryLabel: (schema) => schema.max(50),
  externalUrl: (schema) => schema.min(1).max(500).refine(externalUrlRefine, externalUrlRefineMsg),
  thumbnail: (schema) => schema.max(500),
  thumbnailOverlays: (schema) => schema.max(OVERLAY_JSON_MAX),
  date: (schema) => schema.max(50),
}).omit({ id: true, createdAt: true });

// Highlights
export const insertHighlightSchema = createInsertSchema(highlights, {
  title: (schema) => schema.max(500),
  slug: (schema) => schema.max(200),
  thumbnail: (schema) => schema.max(500),
  thumbnailOverlays: (schema) => schema.max(OVERLAY_JSON_MAX),
  // 카드 연결 링크 — / 상대경로 또는 http(s):// 만 허용(빈 값 허용). javascript:/data: 차단.
  linkUrl: (schema) => schema.max(500).refine((v) => !v || /^\/|^https?:\/\//i.test(v), {
    message: "링크는 /로 시작하는 상대경로 또는 http(s):// URL이어야 합니다.",
  }),
}).omit({ id: true });
export const updateHighlightSchema = createUpdateSchema(highlights, {
  title: (schema) => schema.max(500),
  slug: (schema) => schema.max(200),
  thumbnail: (schema) => schema.max(500),
  thumbnailOverlays: (schema) => schema.max(OVERLAY_JSON_MAX),
  linkUrl: (schema) => schema.max(500).refine((v) => v === undefined || v === "" || /^\/|^https?:\/\//i.test(v), {
    message: "링크는 /로 시작하는 상대경로 또는 http(s):// URL이어야 합니다.",
  }),
}).omit({ id: true });

// Teachers
export const insertTeacherSchema = createInsertSchema(teachers, {
  name: (schema) => schema.max(100),
  subject: (schema) => schema.max(50),
  slug: (schema) => schema.max(200),
  photo: (schema) => schema.max(500),
  thumbnailOverlays: (schema) => schema.max(OVERLAY_JSON_MAX),
}).omit({ id: true });
export const updateTeacherSchema = createUpdateSchema(teachers, {
  name: (schema) => schema.max(100),
  subject: (schema) => schema.max(50),
  slug: (schema) => schema.max(200),
  photo: (schema) => schema.max(500),
  thumbnailOverlays: (schema) => schema.max(OVERLAY_JSON_MAX),
}).omit({ id: true });

// Videos
export const insertVideoSchema = createInsertSchema(videos, {
  title: (schema) => schema.max(500),
  youtubeId: (schema) => schema.max(50),
  thumbnail: (schema) => schema.max(500),
  thumbnailOverlays: (schema) => schema.max(OVERLAY_JSON_MAX),
}).omit({ id: true });
export const updateVideoSchema = createUpdateSchema(videos, {
  title: (schema) => schema.max(500),
  youtubeId: (schema) => schema.max(50),
  thumbnail: (schema) => schema.max(500),
  thumbnailOverlays: (schema) => schema.max(OVERLAY_JSON_MAX),
}).omit({ id: true });

// Tracking Codes
export const insertTrackingCodeSchema = createInsertSchema(trackingCodes, {
  name: (schema) => schema.min(1).max(100),
  code: (schema) => schema.min(1).max(50_000),
  position: (schema) => schema.refine((v) => ["head", "body-start", "body-end"].includes(v), {
    message: "위치는 head, body-start, body-end 중 하나여야 합니다.",
  }),
}).omit({ id: true, createdAt: true });

export const updateTrackingCodeSchema = createUpdateSchema(trackingCodes, {
  name: (schema) => schema.max(100),
  code: (schema) => schema.max(50_000),
  position: (schema) => schema.refine((v) => !v || ["head", "body-start", "body-end"].includes(v), {
    message: "위치는 head, body-start, body-end 중 하나여야 합니다.",
  }),
}).omit({ id: true, createdAt: true });


// Nav Menus
const hrefRefine = (v: string) =>
  v.startsWith("/") || v.startsWith("https://") || v.startsWith("http://");
const hrefMsg = { message: "링크는 /로 시작하는 상대경로 또는 http(s):// URL이어야 합니다." };

export const insertNavMenuSchema = createInsertSchema(navMenus, {
  label: (schema) => schema.min(1).max(100),
  href: (schema) => schema.min(1).max(300).refine(hrefRefine, hrefMsg),
}).omit({ id: true, sortOrder: true });
export const updateNavMenuSchema = createUpdateSchema(navMenus, {
  label: (schema) => schema.max(100),
  href: (schema) => schema.max(300).refine((v) => v === undefined || hrefRefine(v), hrefMsg),
}).omit({ id: true, sortOrder: true });

// Header Links — 헤더 우측 상단 외부/내부 링크 버튼
export const insertHeaderLinkSchema = createInsertSchema(headerLinks, {
  label: (schema) => schema.min(1).max(100),
  href: (schema) => schema.min(1).max(300).refine(hrefRefine, hrefMsg),
  icon: (schema) => schema.max(50).optional(),
  imageUrl: (schema) => schema.max(500).optional(),
}).omit({ id: true, sortOrder: true });
export const updateHeaderLinkSchema = createUpdateSchema(headerLinks, {
  label: (schema) => schema.max(100),
  href: (schema) => schema.max(300).refine((v) => v === undefined || hrefRefine(v), hrefMsg),
  icon: (schema) => schema.max(50).optional(),
  imageUrl: (schema) => schema.max(500).optional(),
}).omit({ id: true, sortOrder: true });

// Exam Tag Options — /exam 태그 셀렉트박스 옵션 (year/grade/subject)
export const examTagTypes = ["year", "grade", "subject"] as const;
export type ExamTagType = (typeof examTagTypes)[number];
const examTagTypeRefine = (v: string): v is ExamTagType =>
  (examTagTypes as readonly string[]).includes(v);
const examTagTypeMsg = { message: "tagType은 year, grade, subject 중 하나여야 합니다." };

export const insertExamTagOptionSchema = createInsertSchema(examTagOptions, {
  tagType: (schema) => schema.refine(examTagTypeRefine, examTagTypeMsg),
  value: (schema) => schema.min(1).max(50),
}).omit({ id: true, sortOrder: true });

// Picture Frame — 메인 헤더 '액자' 풀스크린 슬라이드쇼 항목
export const pictureFrameMediaTypes = ["image", "youtube"] as const;
export type PictureFrameMediaType = (typeof pictureFrameMediaTypes)[number];
const pictureFrameTypeRefine = (v: string) =>
  (pictureFrameMediaTypes as readonly string[]).includes(v);
const pictureFrameTypeMsg = { message: "미디어 종류는 image 또는 youtube 여야 합니다." };
const pfImageMsg = { message: "이미지를 업로드하세요.", path: ["imageUrl"] };
const pfYoutubeMsg = { message: "유효한 유튜브 영상이 아닙니다.", path: ["youtubeId"] };

export const insertPictureFrameItemSchema = createInsertSchema(pictureFrameItems, {
  mediaType: (schema) => schema.refine(pictureFrameTypeRefine, pictureFrameTypeMsg),
  imageUrl: (schema) => schema.max(500).optional(),
  youtubeId: (schema) => schema.max(50).optional(),
  durationSec: (schema) => schema.min(1).max(3600).optional(),
})
  .omit({ id: true, sortOrder: true, createdAt: true })
  .refine((v) => v.mediaType !== "image" || !!v.imageUrl, pfImageMsg)
  .refine((v) => v.mediaType !== "youtube" || isYouTubeId(v.youtubeId), pfYoutubeMsg);

export const updatePictureFrameItemSchema = createUpdateSchema(pictureFrameItems, {
  mediaType: (schema) =>
    schema.refine((v) => v === undefined || pictureFrameTypeRefine(v), pictureFrameTypeMsg),
  imageUrl: (schema) => schema.max(500).optional(),
  youtubeId: (schema) => schema.max(50).optional(),
  durationSec: (schema) => schema.min(1).max(3600).optional(),
})
  .omit({ id: true, sortOrder: true, createdAt: true })
  .refine((v) => v.mediaType !== "image" || !!v.imageUrl, pfImageMsg)
  .refine((v) => v.mediaType !== "youtube" || isYouTubeId(v.youtubeId), pfYoutubeMsg);

// Community — 익명 커뮤니티 게시글/댓글/태그
export const insertCommunityPostSchema = createInsertSchema(communityPosts, {
  title: (schema) => schema.min(1).max(120),
  body: (schema) => schema.min(1).max(5000),
  imageUrl: (schema) => schema.max(500).optional(),
  tag: (schema) => schema.max(50).optional(),
}).pick({ title: true, body: true, imageUrl: true, tag: true });

export const insertCommunityCommentSchema = createInsertSchema(communityComments, {
  body: (schema) => schema.min(1).max(1000),
}).pick({ body: true });

export const insertCommunityTagSchema = createInsertSchema(communityTags, {
  value: (schema) => schema.min(1).max(50),
}).omit({ id: true, sortOrder: true });

export const updateCommunityTagSchema = createUpdateSchema(communityTags, {
  value: (schema) => schema.max(50),
}).omit({ id: true, sortOrder: true });

export function validationError(e: unknown) {
  if (e instanceof z.ZodError) {
    return NextResponse.json(
      { error: "입력값이 올바르지 않습니다.", details: e.issues },
      { status: 400 }
    );
  }
  return null;
}

/**
 * Miniflare(local D1 에뮬레이터)는 UNIQUE 제약 위반을 `Error` 인스턴스가 아닌 객체로
 * throw 할 수 있다. 운영 D1 / Miniflare 양쪽 모두에서 안정적으로 감지하기 위해
 * `e.message` + `e.cause.message` + `String(e)` 를 한꺼번에 확인한다.
 * 회고: docs/mistake-log.md 2026-05-12.
 */
export function isUniqueConstraintError(e: unknown): boolean {
  const direct = e instanceof Error ? e.message : "";
  const cause =
    e instanceof Error && e.cause instanceof Error ? e.cause.message : "";
  const stringified = String(e);
  return (
    direct.includes("UNIQUE constraint failed") ||
    cause.includes("UNIQUE constraint failed") ||
    stringified.includes("UNIQUE constraint failed")
  );
}

export function errorResponse(e: unknown) {
  const zodRes = validationError(e);
  if (zodRes) return zodRes;

  const message = e instanceof Error ? e.message : "알 수 없는 오류";
  console.error("API Error:", message);
  return NextResponse.json(
    { error: "요청 처리 중 오류가 발생했습니다." },
    { status: 500 }
  );
}
