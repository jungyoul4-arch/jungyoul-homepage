export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { getDb } from "@/db";
import { highlights as highlightsTable } from "@/db/schema";
import { toHighlight } from "@/lib/mappers";
import { HighlightCard } from "@/components/highlight-card";
import { renderJsonLd } from "@/lib/json-ld";
import { SITE_URL } from "@/lib/site";

const DESCRIPTION = "정율 교육정보 하이라이트 — 주요 소식과 추천 콘텐츠를 모았습니다.";

export const metadata: Metadata = {
  title: "하이라이트",
  description: DESCRIPTION,
  openGraph: {
    title: "하이라이트 | 정율 교육정보",
    description: DESCRIPTION,
  },
  alternates: {
    canonical: "/highlights",
  },
};

export default async function HighlightsPage() {
  const db = await getDb();
  const raw = await db.select().from(highlightsTable);
  const items = raw.map(toHighlight);

  return (
    <div className="max-w-[1480px] mx-auto px-4 lg:px-10 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={renderJsonLd({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "하이라이트",
          description: DESCRIPTION,
          url: `${SITE_URL}/highlights`,
          mainEntity: {
            "@type": "ItemList",
            itemListElement: items.slice(0, 10).map((h, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: h.title,
              url: h.linkUrl
                ? h.linkUrl.startsWith("http")
                  ? h.linkUrl
                  : `${SITE_URL}${h.linkUrl}`
                : `${SITE_URL}/highlights/${h.slug}`,
            })),
          },
        })}
      />

      <h1 className="text-[1.5rem] md:text-[1.875rem] font-bold text-text-primary mt-10 md:mt-20 pb-5 border-b border-border-light mb-10">
        하이라이트
      </h1>

      {items.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-[22px] gap-y-[40px] max-[670px]:gap-y-6">
          {items.map((item) => (
            <HighlightCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <p className="text-[1rem] text-text-secondary py-10">
          아직 등록된 하이라이트가 없습니다.
        </p>
      )}
    </div>
  );
}
