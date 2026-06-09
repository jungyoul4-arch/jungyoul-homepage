import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { headerLinks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";
import { updateHeaderLinkSchema, errorResponse } from "@/lib/validation";
import { revalidateTag } from "next/cache";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateHeaderLinkSchema.parse(body);
    const db = await getDb();

    await db.update(headerLinks).set(parsed).where(eq(headerLinks.id, id));

    revalidateTag("header-data", "max");
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

    await db.delete(headerLinks).where(eq(headerLinks.id, id));

    revalidateTag("header-data", "max");
    return NextResponse.json({ success: true });
  } catch (e) {
    return errorResponse(e);
  }
}
