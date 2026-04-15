import { z } from "zod";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";
import { articles, highlights, teachers, videos, trackingCodes, navMenus } from "@/db/schema";
import { NextResponse } from "next/server";

// Articles
export const insertArticleSchema = createInsertSchema(articles, {
  title: (schema) => schema.max(500),
  excerpt: (schema) => schema.max(1000),
  content: (schema) => schema.max(2_000_000),
  category: (schema) => schema.max(50),
  categoryLabel: (schema) => schema.max(50),
  slug: (schema) => schema.max(200),
  thumbnail: (schema) => schema.max(500),
  date: (schema) => schema.max(50),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateArticleSchema = createUpdateSchema(articles, {
  title: (schema) => schema.max(500),
  excerpt: (schema) => schema.max(1000),
  content: (schema) => schema.max(2_000_000),
  category: (schema) => schema.max(50),
  categoryLabel: (schema) => schema.max(50),
  slug: (schema) => schema.max(200),
  thumbnail: (schema) => schema.max(500),
  date: (schema) => schema.max(50),
}).omit({
  id: true,
  createdAt: true,
});

// Highlights
export const insertHighlightSchema = createInsertSchema(highlights, {
  title: (schema) => schema.max(500),
  slug: (schema) => schema.max(200),
  thumbnail: (schema) => schema.max(500),
}).omit({ id: true });
export const updateHighlightSchema = createUpdateSchema(highlights, {
  title: (schema) => schema.max(500),
  slug: (schema) => schema.max(200),
  thumbnail: (schema) => schema.max(500),
}).omit({ id: true });

// Teachers
export const insertTeacherSchema = createInsertSchema(teachers, {
  name: (schema) => schema.max(100),
  subject: (schema) => schema.max(50),
  slug: (schema) => schema.max(200),
  photo: (schema) => schema.max(500),
}).omit({ id: true });
export const updateTeacherSchema = createUpdateSchema(teachers, {
  name: (schema) => schema.max(100),
  subject: (schema) => schema.max(50),
  slug: (schema) => schema.max(200),
  photo: (schema) => schema.max(500),
}).omit({ id: true });

// Videos
export const insertVideoSchema = createInsertSchema(videos, {
  title: (schema) => schema.max(500),
  youtubeId: (schema) => schema.max(50),
  thumbnail: (schema) => schema.max(500),
}).omit({ id: true });
export const updateVideoSchema = createUpdateSchema(videos, {
  title: (schema) => schema.max(500),
  youtubeId: (schema) => schema.max(50),
  thumbnail: (schema) => schema.max(500),
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
