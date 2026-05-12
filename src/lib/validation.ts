import { z } from "zod";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";
import { articles, highlights, teachers, videos, trackingCodes, navMenus, headerLinks, examTagOptions } from "@/db/schema";
import { categories } from "@/lib/data";
import { NextResponse } from "next/server";

const allowedCategoryValues = categories
  .filter((c) => c.value !== "all")
  .map((c) => c.value);
const categoryRefine = (v: string) => allowedCategoryValues.includes(v as (typeof allowedCategoryValues)[number]);
const categoryRefineMsg = { message: "허용되지 않은 카테고리입니다." };

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

// Highlights
export const insertHighlightSchema = createInsertSchema(highlights, {
  title: (schema) => schema.max(500),
  slug: (schema) => schema.max(200),
  thumbnail: (schema) => schema.max(500),
  thumbnailOverlays: (schema) => schema.max(OVERLAY_JSON_MAX),
}).omit({ id: true });
export const updateHighlightSchema = createUpdateSchema(highlights, {
  title: (schema) => schema.max(500),
  slug: (schema) => schema.max(200),
  thumbnail: (schema) => schema.max(500),
  thumbnailOverlays: (schema) => schema.max(OVERLAY_JSON_MAX),
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

export function validationError(e: unknown) {
  if (e instanceof z.ZodError) {
    return NextResponse.json(
      { error: "입력값이 올바르지 않습니다.", details: e.issues },
      { status: 400 }
    );
  }
  return null;
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
