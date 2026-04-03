import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { teachers } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const body = await request.json();
  const db = await getDb();
  const id = crypto.randomUUID();

  await db.insert(teachers).values({
    id,
    name: body.name,
    subject: body.subject,
    photo: body.photo || "",
    slug: body.slug,
  });

  return NextResponse.json({ id }, { status: 201 });
}
