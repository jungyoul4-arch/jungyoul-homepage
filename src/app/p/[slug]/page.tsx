export const dynamic = "force-dynamic";

import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getDb } from "@/db";
import { htmlPages as htmlPagesTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { SITE_URL } from "@/lib/site";

// 독립 HTML 페이지. (main) 라우트 그룹 밖이라 루트 layout.tsx 만 적용 → 사이트 헤더/푸터 없음.
// content 는 sandbox iframe(srcDoc) 으로 렌더한다. sandbox 에 allow-same-origin 을 주지 않아
// iframe 이 opaque(null) origin 으로 실행 → 부모(메인 사이트)의 쿠키·localStorage·DOM 에 접근 불가.
// 어드민 전용 작성 + 이 격리로 임의 <script> 를 안전하게 허용한다.

const getHtmlPageBySlug = cache(async (decodedSlug: string) => {
  const db = await getDb();
  const [raw] = await db
    .select()
    .from(htmlPagesTable)
    .where(eq(htmlPagesTable.slug, decodedSlug))
    .limit(1);
  return raw ?? null;
});

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const page = await getHtmlPageBySlug(decodedSlug);
  if (!page) return {};

  const description = page.excerpt || undefined;
  return {
    title: page.title,
    description,
    openGraph: {
      type: "article",
      title: page.title,
      description,
      url: `${SITE_URL}/p/${page.slug}`,
      siteName: "정율 교육정보",
      images: page.thumbnail
        ? [{ url: page.thumbnail }]
        : [{ url: "/og-image.png", width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title: page.title, description },
    alternates: { canonical: `/p/${page.slug}` },
  };
}

export default async function HtmlPagePage({ params }: Props) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

  const page = await getHtmlPageBySlug(decodedSlug);
  if (!page) notFound();

  return (
    <iframe
      // 등록된 원본 HTML 을 그대로 표시 (sandbox 격리로 메인 사이트와 분리).
      // h-[100dvh]: 모바일 동적 툴바 환경에서 정적 100vh 가 하단을 가리는 문제 방지(dynamic viewport).
      srcDoc={page.content}
      sandbox="allow-scripts allow-popups allow-forms allow-popups-to-escape-sandbox"
      title={page.title}
      className="fixed inset-0 w-full h-[100dvh] border-0 z-[100]"
    />
  );
}
