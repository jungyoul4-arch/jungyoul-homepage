export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NavTabs } from "@/components/nav-tabs";
import { getDb } from "@/db";
import { navMenus } from "@/db/schema";
import { and, asc, eq, isNull } from "drizzle-orm";
import { renderJsonLd } from "@/lib/json-ld";
import { getDefaultParentBySlug } from "@/lib/default-nav";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

interface MenuChild {
  id: string;
  label: string;
  href: string;
}

interface MenuResult {
  label: string;
  children: MenuChild[];
}

async function loadMenu(slug: string): Promise<MenuResult | null> {
  const db = await getDb();
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
        label: parent.label,
        children: rows.map((r) => ({ id: r.id, label: r.label, href: r.href })),
      };
    }
    const fb = getDefaultParentBySlug(slug);
    if (fb) {
      return {
        label: parent.label,
        children: fb.children.map((c) => ({ id: c.id, label: c.label, href: c.href })),
      };
    }
    return { label: parent.label, children: [] };
  }

  const fb = getDefaultParentBySlug(slug);
  if (!fb) return null;
  return {
    label: fb.parent.label,
    children: fb.children.map((c) => ({ id: c.id, label: c.label, href: c.href })),
  };
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
            url: `https://www.jungyoul.net/${slug}`,
            mainEntity: {
              "@type": "ItemList",
              itemListElement: children.map((c, i) => ({
                "@type": "ListItem",
                position: i + 1,
                name: c.label,
                url: c.href.startsWith("http")
                  ? c.href
                  : `https://www.jungyoul.net${c.href}`,
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
