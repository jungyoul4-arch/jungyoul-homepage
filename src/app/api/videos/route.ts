import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { videos } from "@/db/schema";

export async function GET() {
  const db = await getDb();
  const data = await db.select().from(videos);
  return NextResponse.json(data);
}
