export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HeroBanner } from "@/components/hero-banner";
import { NavTabs } from "@/components/nav-tabs";
import { getDb } from "@/db";
import { navMenus } from "@/db/schema";
import { and, asc, eq, isNull } from "drizzle-orm";

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

// 로컬 dev / fresh-seed 환경에서 nav_menus 테이블이 비어있을 때 사용하는 폴백.
// 운영 D1 에는 어드민이 등록한 데이터가 있어 이 폴백은 거의 호출되지 않는다.
// 단일 소스 통합은 보고서 H5 (src/lib/default-nav.ts) 별도 작업에서 진행.
const FALLBACK_PARENTS: Record<string, MenuResult> = {
  jungyoul: {
    label: "정율사관",
    children: [
      { id: "fb-teachers", label: "선생님", href: "/teachers" },
      { id: "fb-faq", label: "FAQ", href: "/faq" },
      { id: "fb-exam", label: "시험지 분석", href: "/exam" },
      { id: "fb-success", label: "성장스토리", href: "/articles?category=success" },
    ],
  },
};

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
    // 부모는 있지만 자식이 없음 → 폴백 자식이 있으면 사용
    const fb = FALLBACK_PARENTS[slug];
    if (fb) return { label: parent.label, children: fb.children };
    return { label: parent.label, children: [] };
  }

  // DB 에 부모 없음 → 알려진 폴백 부모(jungyoul 등) 이면 그대로 사용
  return FALLBACK_PARENTS[slug] ?? null;
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
      images: [{ url: "/images/hero-articles.jpg", width: 1200, height: 514 }],
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
      <HeroBanner src="/images/hero-articles.jpg" alt={label} />
      <div className="max-w-[1480px] mx-auto px-4 lg:px-10 py-10">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
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
            }).replace(/</g, "\\u003c"),
          }}
        />

        <h1 className="text-[1.5rem] md:text-[1.875rem] font-bold text-[#1A1A1A] mt-10 md:mt-20 pb-5 border-b border-[#E0E0E0] mb-10">
          {label}
        </h1>

        {children.length > 0 ? (
          <NavTabs items={children} />
        ) : (
          <p className="text-[1rem] text-[#666666] py-10">
            아직 하위 메뉴가 등록되지 않았습니다. 어드민에서 자식 항목을 추가하면 자동으로 표시됩니다.
          </p>
        )}
      </div>
    </>
  );
}
