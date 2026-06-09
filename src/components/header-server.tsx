import { asc, sql } from "drizzle-orm";
import { Header } from "./header";
import { getDb } from "@/db";
import { headerLinks, navMenus, pictureFrameItems } from "@/db/schema";
import { buildNavTree, type NavGroup, type NavMenuItem } from "@/lib/default-nav";

type HeaderLink = {
  id: string;
  label: string;
  href: string;
  icon: string | null;
  imageUrl: string | null;
};

// 헤더 부모 카테고리 FOUC 제거를 위한 RSC 래퍼.
// nav_menus / header_links / picture_frame_items(개수) 를 서버에서 미리 fetch 하여 client Header 에 prop 전달.
export async function HeaderServer() {
  const db = await getDb();

  // 메인 SSR 핫패스 — 3개 읽기를 병렬 조회. allSettled 로 개별 실패 격리(헤더는 항상 렌더).
  const [navRes, linkRes, frameRes] = await Promise.allSettled([
    db.select().from(navMenus).orderBy(asc(navMenus.sortOrder)),
    db.select().from(headerLinks).orderBy(asc(headerLinks.sortOrder)),
    db.select({ count: sql<number>`COUNT(*)` }).from(pictureFrameItems),
  ]);

  let initialNavGroups: NavGroup[] = [];
  if (navRes.status === "fulfilled") {
    const items: NavMenuItem[] = navRes.value.map((r) => ({
      id: r.id,
      parentId: r.parentId ?? null,
      label: r.label,
      href: r.href,
      sortOrder: r.sortOrder ?? 0,
    }));
    if (items.length > 0) initialNavGroups = buildNavTree(items);
  }

  let initialHeaderLinks: HeaderLink[] = [];
  if (linkRes.status === "fulfilled") {
    initialHeaderLinks = linkRes.value.map((r) => ({
      id: r.id,
      label: r.label,
      href: r.href,
      icon: r.icon ?? null,
      imageUrl: r.imageUrl ?? null,
    }));
  }

  // 액자 콘텐츠가 1개 이상일 때만 헤더에 '액자' 버튼 노출.
  // 실제 슬라이드 데이터는 오버레이가 열릴 때 클라이언트에서 /api/picture-frames 로 지연 fetch.
  const hasPictureFrame =
    frameRes.status === "fulfilled" && Number(frameRes.value[0]?.count ?? 0) > 0;

  return (
    <Header
      initialNavGroups={initialNavGroups}
      initialHeaderLinks={initialHeaderLinks}
      hasPictureFrame={hasPictureFrame}
    />
  );
}
