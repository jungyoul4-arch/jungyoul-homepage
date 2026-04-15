import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { navMenus } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";
import { updateNavMenuSchema, errorResponse } from "@/lib/validation";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateNavMenuSchema.parse(body);
    const db = await getDb();

    await db.update(navMenus).set(parsed).where(eq(navMenus.id, id));

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

    // 하위 항목도 함께 삭제
    await db.delete(navMenus).where(eq(navMenus.parentId, id));
    await db.delete(navMenus).where(eq(navMenus.id, id));

    return NextResponse.json({ success: true });
  } catch (e) {
    return errorResponse(e);
  }
}
