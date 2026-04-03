import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { articles } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const body = await request.json();
  const db = await getDb();

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.insert(articles).values({
    id,
    title: body.title,
    excerpt: body.excerpt,
    content: body.content || "",
    category: body.category,
    categoryLabel: body.categoryLabel,
    thumbnail: body.thumbnail || "",
    date: body.date,
    slug: body.slug,
    featured: body.featured || false,
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json({ id }, { status: 201 });
}
