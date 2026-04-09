import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { siteSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const db = await getDb();
    const row = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, "logo_url"))
      .get();

    return NextResponse.json(
      { logoUrl: row?.value ?? null },
      { headers: { "Cache-Control": "public, max-age=60, s-maxage=60" } }
    );
  } catch {
    return NextResponse.json({ logoUrl: null });
  }
}
