import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { trackingCodes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";
import { updateTrackingCodeSchema, errorResponse } from "@/lib/validation";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateTrackingCodeSchema.parse(body);
    const db = await getDb();

    await db.update(trackingCodes).set(parsed).where(eq(trackingCodes.id, id));

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

    await db.delete(trackingCodes).where(eq(trackingCodes.id, id));

    return NextResponse.json({ success: true });
  } catch (e) {
    return errorResponse(e);
  }
}
