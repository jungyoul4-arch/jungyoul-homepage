export const dynamic = "force-dynamic";

import type { MetadataRoute } from "next";
import { getDb } from "@/db";
import { articles as articlesTable, navMenus } from "@/db/schema";
import { isNull } from "drizzle-orm";
import { toArticle } from "@/lib/mappers";
import { DEFAULT_NAV } from "@/lib/default-nav";

// nav_menus 부모와 별개로 sitemap 에 항상 포함되는 정적 페이지.
// 정책·고정 콘텐츠 라우트로, 어드민 nav_menus 와 의미가 다르다.
const STATIC_ROUTES: { path: string; changeFrequency: "daily" | "weekly" | "monthly" | "yearly"; priority: number }[] = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/articles", changeFrequency: "daily", priority: 0.9 },
  { path: "/exam", changeFrequency: "weekly", priority: 0.8 },
  { path: "/story", changeFrequency: "weekly", priority: 0.8 },
  { path: "/community", changeFrequency: "daily", priority: 0.7 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.6 },
  { path: "/about", changeFrequency: "monthly", priority: 0.6 },
  { path: "/location", changeFrequency: "monthly", priority: 0.5 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://www.jungyoul.net";

  const db = await getDb();
  const [rawArticles, parentRows] = await Promise.all([
    db.select().from(articlesTable),
    db.select().from(navMenus).where(isNull(navMenus.parentId)),
  ]);

  const navParentPaths = parentRows.length > 0
    ? parentRows.map((r) => r.href)
    : DEFAULT_NAV.map((g) => g.parent.href);

  const staticPaths = new Set(STATIC_ROUTES.map((r) => r.path));
  const navEntries = navParentPaths
    .filter((href) => href.startsWith("/") && !staticPaths.has(href))
    .map((href) => ({
      url: `${baseUrl}${href}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

  const staticEntries = STATIC_ROUTES.map((r) => ({
    url: `${baseUrl}${r.path}`,
    lastModified: new Date(),
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  const articleEntries = rawArticles.map(toArticle).map((article) => ({
    url: `${baseUrl}/articles/${article.slug}`,
    lastModified: new Date(article.date.replace(/\//g, "-")),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticEntries, ...navEntries, ...articleEntries];
}
