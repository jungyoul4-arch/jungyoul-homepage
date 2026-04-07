import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { articles } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { insertArticleSchema, errorResponse } from "@/lib/validation";
import { generateSlug } from "@/lib/utils";
import { sanitizeContent } from "@/lib/sanitize";

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const parsed = insertArticleSchema.parse(body);
    if (parsed.content) parsed.content = sanitizeContent(parsed.content);
    if (!parsed.slug) parsed.slug = generateSlug(parsed.title);
    const db = await getDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.insert(articles).values({
      id,
      ...parsed,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
