export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { getCategoryOptions } from "@/lib/category-rules";

// 공개 read-only. 어드민 글/HTML 폼이 카테고리 select 옵션을 받아오는 출처.
// = data.ts 빌트인 ∪ nav_menus 의 ?category= 항목(라벨 포함, "all" 제외).
export async function GET() {
  try {
    const db = await getDb();
    const options = await getCategoryOptions(db);
    return NextResponse.json(options);
  } catch {
    // 실패 시 빈 배열 — 클라이언트 훅은 data.ts 빌트인 시드를 그대로 유지한다.
    return NextResponse.json([]);
  }
}
