// 카테고리 규칙 — 서버 전용. nav_menus(DB)를 카테고리 SSOT 로 삼아
// (1) /articles·홈 인-페이지 탭, (2) 어드민 폼 옵션, (3) 저장 허용목록을 일원화한다.
// 순수 변환은 default-nav.ts 의 헬퍼에 위임하고, 여기서는 DB 조회만 담당한다.
import type { getDb } from "@/db";
import { navMenus } from "@/db/schema";
import { and, asc, eq, isNull } from "drizzle-orm";
import {
  type CategoryTab,
  extractCategoryTabsFromNavItems,
  mergeCategoryOptions,
  mergeWritableCategorySlugs,
  getDefaultParentBySlug,
} from "@/lib/default-nav";

type Db = Awaited<ReturnType<typeof getDb>>;

// /articles 부모(href="/articles")의 자식 메뉴 → 카테고리 탭 리스트(label+value, 순서 보존).
// nav_menus 가 비었으면 DEFAULT_NAV 교육정보 자식으로 폴백. ArticleList·홈 최신 탭에 전달.
export async function getArticleCategoryTabs(db: Db): Promise<CategoryTab[]> {
  const parents = await db
    .select()
    .from(navMenus)
    .where(and(isNull(navMenus.parentId), eq(navMenus.href, "/articles")))
    .limit(1);

  let items: { href: string; label: string }[] = [];
  if (parents.length > 0) {
    const rows = await db
      .select()
      .from(navMenus)
      .where(eq(navMenus.parentId, parents[0].id))
      .orderBy(asc(navMenus.sortOrder));
    items = rows.map((r) => ({ href: r.href, label: r.label }));
  }
  if (items.length === 0) {
    const fb = getDefaultParentBySlug("articles");
    items = fb?.children.map((c) => ({ href: c.href, label: c.label })) ?? [];
  }
  return extractCategoryTabsFromNavItems(items);
}

// 어드민 글/HTML 폼의 카테고리 옵션(label+value, "all" 제외) = 빌트인 ∪ nav_menus ?category= 항목.
export async function getCategoryOptions(db: Db): Promise<CategoryTab[]> {
  const rows = await db
    .select({ href: navMenus.href, label: navMenus.label })
    .from(navMenus);
  return mergeCategoryOptions(rows.map((r) => ({ href: r.href, label: r.label })));
}

// 글/HTML 저장이 허용되는 카테고리 slug 집합 = 빌트인 ∪ nav_menus 전 부모의 ?category= slug.
// API 핸들러에서 Zod 포맷검사 통과 후 멤버십 검증에 사용.
export async function getWritableCategorySlugs(db: Db): Promise<string[]> {
  const rows = await db.select({ href: navMenus.href }).from(navMenus);
  return mergeWritableCategorySlugs(rows.map((r) => r.href));
}
