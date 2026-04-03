import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { highlights } from "@/db/schema";

export async function GET() {
  const db = await getDb();
  const data = await db.select().from(highlights);
  return NextResponse.json(data);
}
