export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { getDb } from "@/db";
import {
  highlights as highlightsTable,
  articles as articlesTable,
  htmlPages as htmlPagesTable,
  urlPages as urlPagesTable,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { toHighlight, toArticle, toHtmlPageCard, toUrlPageCard, resolveHighlights } from "@/lib/mappers";
import type { Highlight } from "@/lib/data";
import { ChevronRight } from "lucide-react";
import { AdminEditButton } from "@/components/admin-edit-button";
import { isValidThumbnail } from "@/lib/thumbnail";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const db = await getDb();
  const [raw] = await db
    .select()
    .from(highlightsTable)
    .where(eq(highlightsTable.slug, decodedSlug))
    .limit(1);

  if (!raw) return {};
  const highlight = toHighlight(raw);

  return {
    title: highlight.title,
    description: `정율 교육정보 하이라이트 — ${highlight.title}`,
    alternates: { canonical: `/highlights/${highlight.slug}` },
  };
}

export default async function HighlightPage({ params }: Props) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const db = await getDb();

  const [raw] = await db
    .select()
    .from(highlightsTable)
    .where(eq(highlightsTable.slug, decodedSlug))
    .limit(1);

  if (!raw) notFound();

  // 연결 참조가 있으면 컨텐츠를 조인해 동기화된 링크/제목/썸네일을 계산.
  let highlight: Highlight = toHighlight(raw);
  if (raw.linkedKind && raw.linkedId) {
    const [rawArticles, rawHtmlPages, rawUrlPages] = await Promise.all([
      db.select().from(articlesTable).where(eq(articlesTable.hidden, false)),
      db.select().from(htmlPagesTable).where(eq(htmlPagesTable.hidden, false)).catch(() => [] as never[]),
      db.select().from(urlPagesTable).where(eq(urlPagesTable.hidden, false)).catch(() => [] as never[]),
    ]);
    highlight = resolveHighlights([raw], {
      articles: rawArticles.map(toArticle),
      htmlPages: rawHtmlPages.map(toHtmlPageCard),
      urlPages: rawUrlPages.map(toUrlPageCard),
    })[0] ?? highlight;
  }

  // 연결 링크(동기화 결과 또는 수동)가 있으면 해당 게시글/외부 URL 로 위임(상세 대신).
  if (highlight.linkUrl) redirect(highlight.linkUrl);

  return (
    <div className="max-w-[1480px] mx-auto px-4 lg:px-10 py-10">
      <nav className="pb-6 text-[1rem] text-text-secondary" aria-label="breadcrumb">
        <ol className="flex items-center gap-1">
          <li>
            <Link href="/" className="hover:text-brand-blue transition-colors">홈</Link>
          </li>
          <li><ChevronRight size={14} className="text-text-secondary" /></li>
          <li className="text-text-primary font-bold">{highlight.title}</li>
        </ol>
      </nav>

      <div className="max-w-3xl">
        <div className="relative mb-6">
          <AdminEditButton type="highlight" data={highlight} />
        </div>

        {isValidThumbnail(highlight.thumbnail) && (
          <div className="relative aspect-[16/9] bg-gray-100 rounded-sm overflow-hidden mb-8">
            <Image
              src={highlight.thumbnail}
              alt={highlight.title}
              fill
              unoptimized
              className="object-cover"
            />
          </div>
        )}

        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          {highlight.title}
        </h1>
      </div>
    </div>
  );
}
