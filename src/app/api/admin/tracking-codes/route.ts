import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { trackingCodes } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { insertTrackingCodeSchema, errorResponse } from "@/lib/validation";

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const parsed = insertTrackingCodeSchema.parse(body);
    const db = await getDb();
    const id = crypto.randomUUID();

    await db.insert(trackingCodes).values({
      id,
      ...parsed,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
