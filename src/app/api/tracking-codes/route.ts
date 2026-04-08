import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { trackingCodes } from "@/db/schema";

export async function GET() {
  try {
    const db = await getDb();
    const rows = await db.select().from(trackingCodes);
    return NextResponse.json(rows);
  } catch (e) {
    console.error("tracking-codes GET error:", e);
    return NextResponse.json([], { status: 200 });
  }
}
