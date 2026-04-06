import { z } from "zod";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";
import { articles, highlights, teachers, videos } from "@/db/schema";
import { NextResponse } from "next/server";

// Articles
export const insertArticleSchema = createInsertSchema(articles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateArticleSchema = createUpdateSchema(articles).omit({
  id: true,
  createdAt: true,
});

// Highlights
export const insertHighlightSchema = createInsertSchema(highlights).omit({
  id: true,
});
export const updateHighlightSchema = createUpdateSchema(highlights).omit({
  id: true,
});

// Teachers
export const insertTeacherSchema = createInsertSchema(teachers).omit({
  id: true,
});
export const updateTeacherSchema = createUpdateSchema(teachers).omit({
  id: true,
});

// Videos
export const insertVideoSchema = createInsertSchema(videos).omit({
  id: true,
});
export const updateVideoSchema = createUpdateSchema(videos).omit({
  id: true,
});

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
