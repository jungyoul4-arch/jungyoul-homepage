import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { communityTags } from "@/db/schema";
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
    await db.delete(communityTags).where(eq(communityTags.id, id));
    return NextResponse.json({ success: true });
  } catch (e) {
    return errorResponse(e);
  }
}
