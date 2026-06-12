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

// srcdoc iframe 은 base URL 을 부모(메인 사이트)에서 상속하므로, 본문의 <a href="#id"> 같은
// 같은-페이지 앵커가 부모 URL 로의 전체 내비게이션으로 오인되어 X-Frame-Options: DENY 로 차단된다
// ("연결을 거부했습니다"). 클릭을 가로채 문서 내부에서 직접 스크롤한다. allow-scripts + CSP
// 'unsafe-inline' 으로 실행 허용됨. capture 단계에서 preventDefault 만 호출(stopPropagation 금지)
// 하므로 페이지 자체 클릭 핸들러와 충돌하지 않는다.
const IN_PAGE_ANCHOR_SCROLL_SHIM =
  '<script>(function(){document.addEventListener("click",function(e){' +
  'var a=e.target&&e.target.closest?e.target.closest(\'a[href^="#"]\'):null;if(!a)return;' +
  'var h=a.getAttribute("href")||"";if(h.charAt(0)!=="#")return;e.preventDefault();' +
  'var id=h.slice(1);if(!id||id==="top"){window.scrollTo({top:0,behavior:"smooth"});return;}' +
  'var el=document.getElementById(id);' +
  'if(!el){try{el=document.getElementById(decodeURIComponent(id));}catch(_){}}' +
  'if(el)el.scrollIntoView({behavior:"smooth",block:"start"});},true);})();</script>';

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
      // 뒤에 같은-페이지 앵커 스크롤 shim 을 덧붙여 #섹션 목차 버튼이 iframe 내부에서 스크롤되게 한다.
      // h-[100dvh]: 모바일 동적 툴바 환경에서 정적 100vh 가 하단을 가리는 문제 방지(dynamic viewport).
      srcDoc={page.content + IN_PAGE_ANCHOR_SCROLL_SHIM}
      sandbox="allow-scripts allow-popups allow-forms allow-popups-to-escape-sandbox"
      title={page.title}
      className="fixed inset-0 w-full h-[100dvh] border-0 z-[100]"
    />
  );
}
