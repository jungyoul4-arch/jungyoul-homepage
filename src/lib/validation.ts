import { z } from "zod";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";
import { articles, highlights, teachers, videos } from "@/db/schema";
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
