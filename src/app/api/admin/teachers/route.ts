import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { teachers } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { insertTeacherSchema, errorResponse, isUniqueConstraintError } from "@/lib/validation";
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
    if (isUniqueConstraintError(e)) {
      return NextResponse.json(
        { error: "이미 사용 중인 슬러그입니다. 다른 슬러그를 입력하세요." },
        { status: 409 }
      );
    }
    return errorResponse(e);
  }
}
