import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { teachers } from "@/db/schema";

export async function GET() {
  const db = await getDb();
  const data = await db.select().from(teachers);
  return NextResponse.json(data);
}
