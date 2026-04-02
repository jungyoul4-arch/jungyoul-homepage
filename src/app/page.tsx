import { HeroCarousel } from "@/components/hero-carousel";
import { LatestArticles } from "@/components/latest-articles";
import { HighlightsCarousel } from "@/components/highlights-carousel";
import { MediaLibrary } from "@/components/media-library";
import { articles, highlights, videos } from "@/lib/data";

export default function Home() {
  const featuredArticles = articles.filter((a) => a.featured);

  return (
    <>
      {/* Hero Carousel — 삼성 뉴스룸 메인 슬라이더 */}
      <HeroCarousel articles={featuredArticles} />

      {/* Latest Articles with Tab Filter — 삼성 뉴스룸 "최신기사" 섹션 */}
      <LatestArticles articles={articles} />

      {/* Highlights Carousel — 삼성 뉴스룸 "하이라이트" 섹션 */}
      <HighlightsCarousel highlights={highlights} />

      {/* Media Library (정율TV) — 삼성 뉴스룸 "미디어 라이브러리" 섹션 */}
      <MediaLibrary videos={videos} />
    </>
  );
}
