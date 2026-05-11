import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { headerLinks } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { insertHeaderLinkSchema, errorResponse } from "@/lib/validation";
import { sql } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const parsed = insertHeaderLinkSchema.parse(body);
    const db = await getDb();
    const id = crypto.randomUUID();

    const [{ maxOrder }] = await db
      .select({ maxOrder: sql<number>`COALESCE(MAX(sort_order), -1)` })
      .from(headerLinks);

    await db.insert(headerLinks).values({
      id,
      ...parsed,
      sortOrder: maxOrder + 1,
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
