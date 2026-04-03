import { HeroCarousel } from "@/components/hero-carousel";
import { LatestArticles } from "@/components/latest-articles";
import { HighlightsCarousel } from "@/components/highlights-carousel";
import { MediaLibrary } from "@/components/media-library";
import { getDb } from "@/db";
import { articles as articlesTable, highlights as highlightsTable, videos as videosTable } from "@/db/schema";
import { desc } from "drizzle-orm";
import { toArticle, toHighlight, toVideo } from "@/lib/mappers";

export default async function Home() {
  const db = await getDb();

  const [rawArticles, rawHighlights, rawVideos] = await Promise.all([
    db.select().from(articlesTable).orderBy(desc(articlesTable.date)),
    db.select().from(highlightsTable),
    db.select().from(videosTable),
  ]);

  const allArticles = rawArticles.map(toArticle);
  const featuredArticles = allArticles.filter((a) => a.featured);

  return (
    <>
      {/* WebSite JSON-LD — SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "정율 교육정보",
            url: "https://www.jungyoul.net",
            description:
              "대입 입시, 수능, 내신, 논술 등 교육 정보를 전문적으로 제공하는 미디어",
            publisher: {
              "@type": "Organization",
              name: "정율 교육정보",
              logo: {
                "@type": "ImageObject",
                url: "https://www.jungyoul.net/logo.png",
              },
            },
          }).replace(/</g, "\\u003c"),
        }}
      />

      {/* FAQ JSON-LD — AEO 핵심 (AI 검색 인용 대상) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: "정율사관학원은 어디에 있나요?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "경기도 부천시 원미구 길주로91 비잔티움 6층에 위치해 있으며, 부천역에서 도보 5분 거리입니다. 전화 상담은 032-321-9937로 가능합니다.",
                },
              },
              {
                "@type": "Question",
                name: "정율사관학원에서 제공하는 프로그램은 무엇인가요?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "수능 대비(국어·영어·수학), 내신 관리(학교별 맞춤 전략), 논술 특강(약술형·인문논술), 고교학점제 대비, AI 기반 진로 설계(앱티핏·생기뷰), 입시 컨설팅(수시·정시) 프로그램을 운영합니다.",
                },
              },
              {
                "@type": "Question",
                name: "수능 대비는 언제부터 시작하는 것이 좋나요?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "이상적으로는 고2 겨울방학부터 본격적인 수능 대비를 시작하는 것이 좋습니다. 고3 3월 모의고사 이후 약점을 분석하고 과목별 학습 전략을 세우는 것이 핵심입니다. 정율에서는 개인별 현재 등급과 목표에 맞는 맞춤 로드맵을 제공합니다.",
                },
              },
              {
                "@type": "Question",
                name: "약술형 논술이란 무엇인가요?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "약술형 논술은 가천대, 수원대 등에서 시행하는 논술 전형으로, 기존 논술보다 짧은 분량(200~600자)의 답안을 작성하는 형태입니다. 교과 내용 중심으로 출제되어 별도의 논술 훈련 없이도 준비가 가능하며, 내신 등급이 다소 낮아도 합격 가능성이 있어 주목받고 있습니다.",
                },
              },
              {
                "@type": "Question",
                name: "상담은 어떻게 신청하나요?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "전화(032-321-9937), 카카오톡 채널, 또는 홈페이지 상담신청 페이지에서 온라인으로 신청할 수 있습니다. 평일 09:00~22:00, 토요일 09:00~18:00에 상담이 가능합니다.",
                },
              },
            ],
          }).replace(/</g, "\\u003c"),
        }}
      />

      {/* 시각적으로 숨긴 h1 — SEO 핵심 */}
      <h1 className="sr-only">
        정율 교육정보 — 부천 입시·수능·내신·논술 전문 교육 미디어
      </h1>

      {/* Hero Carousel — 삼성 뉴스룸 메인 슬라이더 */}
      <HeroCarousel articles={featuredArticles} />
      <LatestArticles articles={allArticles} />
      <HighlightsCarousel highlights={rawHighlights.map(toHighlight)} />
      <MediaLibrary videos={rawVideos.map(toVideo)} />
    </>
  );
}
