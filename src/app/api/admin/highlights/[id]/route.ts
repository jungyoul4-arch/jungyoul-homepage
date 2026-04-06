import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { highlights } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";
import { updateHighlightSchema, errorResponse } from "@/lib/validation";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateHighlightSchema.parse(body);
    const db = await getDb();

    await db.update(highlights).set(parsed).where(eq(highlights.id, id));

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

    await db.delete(highlights).where(eq(highlights.id, id));

    return NextResponse.json({ success: true });
  } catch (e) {
    return errorResponse(e);
  }
}
