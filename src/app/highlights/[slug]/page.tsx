export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { getDb } from "@/db";
import { highlights as highlightsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { toHighlight } from "@/lib/mappers";
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
  const highlight = toHighlight(raw);

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-10">
      <nav className="pb-6 text-sm text-gray-500" aria-label="breadcrumb">
        <ol className="flex items-center gap-1">
          <li>
            <Link href="/" className="hover:text-blue-600 transition-colors">홈</Link>
          </li>
          <li><ChevronRight size={14} className="text-gray-400" /></li>
          <li className="text-gray-900 font-medium">{highlight.title}</li>
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
