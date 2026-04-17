import type { Metadata } from "next";
import { HeroBanner } from "@/components/hero-banner";

export const metadata: Metadata = {
  title: "회사소개",
  description:
    "주식회사정율은 학생 개개인에 맞는 맞춤형 교육을 제공하는 교육 전문 기업입니다. 내신, 수능, 논술, 고교학점제 대비 프로그램을 운영합니다.",
  openGraph: {
    title: "회사소개 | 정율 교육정보",
    description: "주식회사정율 — 맞춤형 교육 전문 기업",
    images: [{ url: "/images/hero-about.jpg", width: 1200, height: 514 }],
  },
  alternates: {
    canonical: "/about",
  },
};

export default function AboutPage() {
  return (
    <>
      <HeroBanner src="/images/hero-about.jpg" alt="정율 교육정보 회사소개" />
      <div className="max-w-[1480px] mx-auto px-4 lg:px-10 py-10">
        {/* AboutPage JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "AboutPage",
            name: "회사소개 - 정율 교육정보",
            description:
              "주식회사정율은 학생 개개인에 맞는 맞춤형 교육을 제공하는 교육 전문 기업입니다.",
            url: "https://www.jungyoul.net/about",
            mainEntity: {
              "@type": "EducationalOrganization",
              name: "주식회사정율",
              founder: { "@type": "Person", name: "곽정율" },
              address: {
                "@type": "PostalAddress",
                streetAddress: "길주로91 601호(비잔티움 6층)",
                addressLocality: "부천시",
                addressRegion: "경기도",
                postalCode: "14544",
                addressCountry: "KR",
              },
              telephone: "032-321-9937",
            },
          }).replace(/</g, "\\u003c"),
        }}
      />

      <h1 className="text-[1.5rem] md:text-[2.75rem] font-bold text-[#1A1A1A] mb-2">
        회사소개
      </h1>
      <p className="text-[1.25rem] font-medium text-[#666666] mb-10">
        학생의 가능성을 이끌어내는 교육, 정율이 함께합니다.
      </p>

      {/* Company Vision */}
      <div className="max-w-3xl">
        <section className="mb-12">
          <h2 className="text-[1.375rem] font-bold text-[#1A1A1A] mb-4 pb-3 border-b border-gray-200">
            교육 철학
          </h2>
          <p className="text-[#000000] text-[1.25rem] leading-[30px] font-normal mb-4">
            정율사관학원은 &ldquo;학생 한 명 한 명에게 최적화된 교육&rdquo;을 핵심 가치로 삼고 있습니다.
            획일화된 교육이 아닌, 학생의 현재 위치와 목표에 맞는 개인 맞춤형 학습 전략을
            설계하고 실행합니다.
          </p>
          <p className="text-[#000000] text-[1.25rem] leading-[30px] font-normal">
            내신 관리부터 수능 대비, 논술 특강, 고교학점제 대비까지 — 입시의 모든 영역을
            아우르는 종합 교육 프로그램을 운영하며, AI 기반 진로 설계 도구를 도입하여
            과학적이고 체계적인 교육을 제공합니다.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-[1.375rem] font-bold text-[#1A1A1A] mb-4 pb-3 border-b border-gray-200">
            정율의 차별점
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                title: "학교별 맞춤 내신 관리",
                desc: "같은 과목이라도 학교마다 출제 패턴이 다릅니다. 학교별 기출 분석을 바탕으로 맞춤 전략을 제공합니다.",
              },
              {
                title: "수능·논술 전문 강사진",
                desc: "각 과목 전문 강사진이 학생의 약점을 정확히 진단하고, 효율적인 학습 방향을 제시합니다.",
              },
              {
                title: "AI 기반 교육 도구",
                desc: "서울대 기술지주자회사의 AI 프로그램을 도입하여 적성 진단, 학생부 분석 등 과학적 교육을 실현합니다.",
              },
              {
                title: "입시 컨설팅",
                desc: "수시·정시 전략부터 학생부종합전형까지, 데이터 기반의 체계적인 입시 컨설팅을 제공합니다.",
              },
            ].map((item) => (
              <div key={item.title} className="border border-gray-200 p-5">
                <h3 className="font-bold text-[#1A1A1A] mb-2">{item.title}</h3>
                <p className="text-[0.875rem] text-[#666666] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-[1.375rem] font-bold text-[#1A1A1A] mb-4 pb-3 border-b border-gray-200">
            회사 정보
          </h2>
          <table className="w-full text-sm">
            <tbody>
              {[
                ["회사명", "주식회사정율"],
                ["대표이사", "곽정율"],
                ["설립", "교육 전문 기업"],
                ["소재지", "경기도 부천시 원미구 길주로91 601호(비잔티움 6층)"],
                ["사업자등록번호", "392-88-00208"],
                ["학원등록번호", "제5042호"],
                ["고객센터", "032-321-9937"],
                ["이메일", "jungyoul3@naver.com"],
              ].map(([label, value]) => (
                <tr key={label} className="border-b border-gray-100">
                  <th className="py-3 pr-4 text-left text-gray-500 font-medium w-36">
                    {label}
                  </th>
                  <td className="py-3 text-gray-900">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
      </div>
    </>
  );
}
