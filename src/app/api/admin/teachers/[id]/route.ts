import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { teachers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";
import { updateTeacherSchema, errorResponse } from "@/lib/validation";
import { generateSlug } from "@/lib/utils";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateTeacherSchema.parse(body);
    if (parsed.slug === "") {
      parsed.slug = generateSlug(parsed.name || "untitled");
    }
    const db = await getDb();

    await db.update(teachers).set(parsed).where(eq(teachers.id, id));

    return NextResponse.json({ success: true });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const db = await getDb();

    await db.delete(teachers).where(eq(teachers.id, id));

    return NextResponse.json({ success: true });
  } catch (e) {
    return errorResponse(e);
  }
}
