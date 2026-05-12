import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { examTagOptions } from "@/db/schema";
import { asc, eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type");
  const db = await getDb();

  const data = type
    ? await db
        .select()
        .from(examTagOptions)
        .where(eq(examTagOptions.tagType, type))
        .orderBy(asc(examTagOptions.sortOrder))
    : await db.select().from(examTagOptions).orderBy(asc(examTagOptions.sortOrder));

  return NextResponse.json(data);
}
