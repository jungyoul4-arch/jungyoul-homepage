import { asc } from "drizzle-orm";
import { Header } from "./header";
import { getDb } from "@/db";
import { headerLinks, navMenus } from "@/db/schema";
import { buildNavTree, type NavGroup, type NavMenuItem } from "@/lib/default-nav";

type HeaderLink = {
  id: string;
  label: string;
  href: string;
  icon: string | null;
  imageUrl: string | null;
};

// 헤더 부모 카테고리 FOUC 제거를 위한 RSC 래퍼.
// nav_menus / header_links 를 서버에서 미리 fetch 하여 client Header 에 prop 으로 전달.
export async function HeaderServer() {
  const db = await getDb();

  let initialNavGroups: NavGroup[] = [];
  try {
    const rows = await db.select().from(navMenus).orderBy(asc(navMenus.sortOrder));
    const items: NavMenuItem[] = rows.map((r) => ({
      id: r.id,
      parentId: r.parentId ?? null,
      label: r.label,
      href: r.href,
      sortOrder: r.sortOrder ?? 0,
    }));
    if (items.length > 0) {
      initialNavGroups = buildNavTree(items);
    }
  } catch {
    initialNavGroups = [];
  }

  let initialHeaderLinks: HeaderLink[] = [];
  try {
    const rows = await db
      .select()
      .from(headerLinks)
      .orderBy(asc(headerLinks.sortOrder));
    initialHeaderLinks = rows.map((r) => ({
      id: r.id,
      label: r.label,
      href: r.href,
      icon: r.icon ?? null,
      imageUrl: r.imageUrl ?? null,
    }));
  } catch {
    initialHeaderLinks = [];
  }

  return (
    <Header
      initialNavGroups={initialNavGroups}
      initialHeaderLinks={initialHeaderLinks}
    />
  );
}
