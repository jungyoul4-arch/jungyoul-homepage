import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { examTagOptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";
import { errorResponse } from "@/lib/validation";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const db = await getDb();
    await db.delete(examTagOptions).where(eq(examTagOptions.id, id));
    return NextResponse.json({ success: true });
  } catch (e) {
    return errorResponse(e);
  }
}
