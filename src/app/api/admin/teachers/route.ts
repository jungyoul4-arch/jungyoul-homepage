import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { teachers } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { insertTeacherSchema, errorResponse } from "@/lib/validation";
import { generateSlug } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const parsed = insertTeacherSchema.parse(body);
    if (!parsed.slug) parsed.slug = generateSlug(parsed.name);
    const db = await getDb();
    const id = crypto.randomUUID();

    await db.insert(teachers).values({
      id,
      ...parsed,
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
