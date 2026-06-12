export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NavTabs } from "@/components/nav-tabs";
import { ArticleList } from "@/components/article-list";
import { getDb } from "@/db";
import {
  navMenus,
  articles as articlesTable,
  htmlPages as htmlPagesTable,
  urlPages as urlPagesTable,
} from "@/db/schema";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { toArticle, toHtmlPageCard, toUrlPageCard } from "@/lib/mappers";
import { renderJsonLd } from "@/lib/json-ld";
import { SITE_URL } from "@/lib/site";
import { getDefaultParentBySlug, RESERVED_ROUTE_SLUGS } from "@/lib/default-nav";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

interface MenuChild {
  id: string;
  label: string;
  href: string;
}

interface MenuResult {
  // "parent" = 부모 메뉴 인덱스(자식 탭), "category" = 리프 카테고리 콘텐츠 목록.
  kind: "parent" | "category";
  label: string;
  children: MenuChild[];
}

async function loadMenu(slug: string): Promise<MenuResult | null> {
  const db = await getDb();
  // 1) 부모 메뉴(parentId IS NULL) 매칭 → 자식 메뉴 탭 인덱스 페이지
  const parents = await db
    .select()
    .from(navMenus)
    .where(and(isNull(navMenus.parentId), eq(navMenus.href, `/${slug}`)))
    .limit(1);

  if (parents.length > 0) {
    const parent = parents[0];
    const rows = await db
      .select()
      .from(navMenus)
      .where(eq(navMenus.parentId, parent.id))
      .orderBy(asc(navMenus.sortOrder));
    if (rows.length > 0) {
      return {
        kind: "parent",
        label: parent.label,
        children: rows.map((r) => ({ id: r.id, label: r.label, href: r.href })),
      };
    }
    const fb = getDefaultParentBySlug(slug);
    if (fb) {
      return {
        kind: "parent",
        label: parent.label,
        children: fb.children.map((c) => ({ id: c.id, label: c.label, href: c.href })),
      };
    }
    return { kind: "parent", label: parent.label, children: [] };
  }

  // 2) 기본 부모 폴백(DB nav_menus 가 비었을 때)
  const fb = getDefaultParentBySlug(slug);
  if (fb) {
    return {
      kind: "parent",
      label: fb.parent.label,
      children: fb.children.map((c) => ({ id: c.id, label: c.label, href: c.href })),
    };
  }

  // 3) 리프 카테고리 — 자식 메뉴의 단일 세그먼트 href(/jstory 등). 예약어가 아니고 nav_menus 에
  //    존재하면 그 slug 를 카테고리로 하는 콘텐츠 목록을 렌더(404 대신). 자식 추가 시 404 재발 방지.
  if (!RESERVED_ROUTE_SLUGS.has(slug)) {
    const leaf = await db
      .select()
      .from(navMenus)
      .where(eq(navMenus.href, `/${slug}`))
      .limit(1);
    if (leaf.length > 0) {
      return { kind: "category", label: leaf[0].label, children: [] };
    }
  }

  return null;
}

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { slug } = await params;
  const menu = await loadMenu(slug);
  if (!menu) {
    return { title: "페이지를 찾을 수 없습니다" };
  }
  const { label } = menu;
  const description = `${label} — 정율 교육정보에서 ${label} 관련 콘텐츠를 모았습니다.`;
  return {
    title: label,
    description,
    openGraph: {
      title: `${label} | 정율 교육정보`,
      description,
    },
    alternates: {
      canonical: `/${slug}`,
    },
  };
}

export default async function MenuIndexPage({ params }: RouteParams) {
  const { slug } = await params;
  const menu = await loadMenu(slug);
  if (!menu) notFound();

  // 리프 카테고리 페이지 — 해당 카테고리(slug)의 기사·HTML·URL 콘텐츠 목록.
  if (menu.kind === "category") {
    return <CategoryIndex slug={slug} label={menu.label} />;
  }

  const { label, children } = menu;
  const description = `${label} — 정율 교육정보에서 ${label} 관련 콘텐츠를 모았습니다.`;

  return (
    <>
      <div className="max-w-[1480px] mx-auto px-4 lg:px-10 py-10">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={renderJsonLd({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: label,
            description,
            url: `${SITE_URL}/${slug}`,
            mainEntity: {
              "@type": "ItemList",
              itemListElement: children.map((c, i) => ({
                "@type": "ListItem",
                position: i + 1,
                name: c.label,
                url: c.href.startsWith("http")
                  ? c.href
                  : `${SITE_URL}${c.href}`,
              })),
            },
          })}
        />

        <h1 className="text-[1.5rem] md:text-[1.875rem] font-bold text-text-primary mt-10 md:mt-20 pb-5 border-b border-border-light mb-10">
          {label}
        </h1>

        {children.length > 0 ? (
          <NavTabs items={children} />
        ) : (
          <p className="text-[1rem] text-text-secondary py-10">
            아직 하위 메뉴가 등록되지 않았습니다. 어드민에서 자식 항목을 추가하면 자동으로 표시됩니다.
          </p>
        )}
      </div>
    </>
  );
}

// 리프 카테고리 콘텐츠 목록(/articles 패턴 재사용). 해당 category 의 글·HTML·URL 을 hidden=false 로 모아 노출.
async function CategoryIndex({ slug, label }: { slug: string; label: string }) {
  const db = await getDb();
  const [raw, rawHtml, rawUrl] = await Promise.all([
    db
      .select()
      .from(articlesTable)
      .where(and(eq(articlesTable.category, slug), eq(articlesTable.hidden, false)))
      .orderBy(desc(articlesTable.date)),
    db
      .select()
      .from(htmlPagesTable)
      .where(and(eq(htmlPagesTable.category, slug), eq(htmlPagesTable.hidden, false)))
      .orderBy(desc(htmlPagesTable.date))
      .catch(() => [] as never[]),
    db
      .select()
      .from(urlPagesTable)
      .where(and(eq(urlPagesTable.category, slug), eq(urlPagesTable.hidden, false)))
      .orderBy(desc(urlPagesTable.date))
      .catch(() => [] as never[]),
  ]);

  const articles = [
    ...raw.map(toArticle),
    ...rawHtml.map(toHtmlPageCard),
    ...rawUrl.map(toUrlPageCard),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const description = `${label} — 정율 교육정보에서 ${label} 관련 콘텐츠를 모았습니다.`;

  return (
    <div className="max-w-[1480px] mx-auto px-4 lg:px-10 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={renderJsonLd({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: label,
          description,
          url: `${SITE_URL}/${slug}`,
          mainEntity: {
            "@type": "ItemList",
            itemListElement: articles.slice(0, 10).map((a, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url:
                a.kind === "html"
                  ? `${SITE_URL}/p/${a.slug}`
                  : a.kind === "url"
                    ? (a.externalUrl ?? `${SITE_URL}/${slug}`)
                    : `${SITE_URL}/articles/${a.slug}`,
            })),
          },
        })}
      />

      <h1 className="text-[1.5rem] md:text-[1.875rem] font-bold text-text-primary mt-10 md:mt-20 pb-5 border-b border-border-light mb-10">
        {label}
      </h1>

      {articles.length > 0 ? (
        <ArticleList articles={articles} hideTabs />
      ) : (
        <p className="text-[1rem] text-text-secondary py-10">
          아직 등록된 콘텐츠가 없습니다. 어드민에서 카테고리 &quot;{label}&quot; 로 글을 작성하면 자동으로 표시됩니다.
        </p>
      )}
    </div>
  );
}
