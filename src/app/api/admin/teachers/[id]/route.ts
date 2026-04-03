import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { teachers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { id } = await params;
  const body = await request.json();
  const db = await getDb();

  await db.update(teachers).set(body).where(eq(teachers.id, id));

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { id } = await params;
  const db = await getDb();

  await db.delete(teachers).where(eq(teachers.id, id));

  return NextResponse.json({ success: true });
}
