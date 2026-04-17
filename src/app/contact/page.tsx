import type { Metadata } from "next";
import { Phone, Mail, MapPin, MessageCircle } from "lucide-react";
import { HeroBanner } from "@/components/hero-banner";

export const metadata: Metadata = {
  title: "상담신청",
  description:
    "정율사관학원 입시 상담을 신청하세요. 수능, 내신, 논술 등 맞춤 교육 상담을 제공합니다. 전화: 032-321-9937",
  openGraph: {
    title: "상담신청 | 정율 교육정보",
    description: "정율사관학원 입시 상담을 신청하세요.",
    images: [{ url: "/images/hero-contact.jpg", width: 1200, height: 514 }],
  },
  alternates: {
    canonical: "/contact",
  },
};

export default function ContactPage() {
  return (
    <>
      <HeroBanner src="/images/hero-contact.jpg" alt="정율 교육정보 상담신청" />
      <div className="max-w-[1480px] mx-auto px-4 lg:px-10 py-10">
        {/* JSON-LD ContactPage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            name: "정율사관학원",
            telephone: "032-321-9937",
            email: "jungyoul3@naver.com",
            address: {
              "@type": "PostalAddress",
              streetAddress: "길주로91 601호(비잔티움 6층)",
              addressLocality: "부천시",
              addressRegion: "경기도",
              postalCode: "14544",
              addressCountry: "KR",
            },
            geo: {
              "@type": "GeoCoordinates",
              latitude: 37.4864,
              longitude: 126.7636,
            },
            openingHoursSpecification: [
              {
                "@type": "OpeningHoursSpecification",
                dayOfWeek: [
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                ],
                opens: "09:00",
                closes: "22:00",
              },
              {
                "@type": "OpeningHoursSpecification",
                dayOfWeek: ["Saturday"],
                opens: "09:00",
                closes: "18:00",
              },
            ],
            url: "https://www.jungyoul.net",
            sameAs: [
              "https://www.instagram.com/jysk_official/",
              "https://blog.naver.com/jungyoul_edu",
              "https://www.youtube.com/@jungyoulTV",
            ],
          }).replace(/</g, "\\u003c"),
        }}
      />

      <h1 className="text-[1.5rem] md:text-[2.75rem] font-bold text-[#1A1A1A] mb-2">
        상담신청
      </h1>
      <p className="text-[1.25rem] font-medium text-[#666666] mb-10">
        입시에 대한 궁금한 점이 있으시면 편하게 문의해 주세요.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Contact Info Cards */}
        <div className="space-y-4">
          <div className="border border-gray-200 p-6 flex items-start gap-4">
            <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center shrink-0">
              <Phone size={18} className="text-blue-600" />
            </div>
            <div>
              <h2 className="font-bold text-[#1A1A1A] mb-1">전화 상담</h2>
              <p className="text-gray-600 text-sm mb-2">
                평일 09:00 ~ 22:00 / 토요일 09:00 ~ 18:00
              </p>
              <a
                href="tel:032-321-9937"
                className="text-[#1E64FA] font-bold text-lg hover:underline"
              >
                032-321-9937
              </a>
            </div>
          </div>

          <div className="border border-gray-200 p-6 flex items-start gap-4">
            <div className="w-10 h-10 bg-yellow-50 rounded-full flex items-center justify-center shrink-0">
              <MessageCircle size={18} className="text-yellow-600" />
            </div>
            <div>
              <h2 className="font-bold text-[#1A1A1A] mb-1">카카오톡 상담</h2>
              <p className="text-gray-600 text-sm mb-2">
                실시간 1:1 채팅 상담이 가능합니다.
              </p>
              <a
                href="http://pf.kakao.com/_xiqxhxlxb"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-400 text-gray-900 text-sm font-medium hover:bg-yellow-500 transition-colors"
              >
                카카오톡 상담하기
              </a>
            </div>
          </div>

          <div className="border border-gray-200 p-6 flex items-start gap-4">
            <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center shrink-0">
              <Mail size={18} className="text-gray-600" />
            </div>
            <div>
              <h2 className="font-bold text-[#1A1A1A] mb-1">이메일 문의</h2>
              <p className="text-gray-600 text-sm mb-2">
                자세한 상담을 원하시면 이메일로 문의해 주세요.
              </p>
              <a
                href="mailto:jungyoul3@naver.com"
                className="text-[#1E64FA] font-medium hover:underline"
              >
                jungyoul3@naver.com
              </a>
            </div>
          </div>

          <div className="border border-gray-200 p-6 flex items-start gap-4">
            <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center shrink-0">
              <MapPin size={18} className="text-green-600" />
            </div>
            <div>
              <h2 className="font-bold text-[#1A1A1A] mb-1">찾아오시는 길</h2>
              <p className="text-gray-600 text-sm mb-1">
                경기도 부천시 원미구 길주로91 601호
              </p>
              <p className="text-gray-500 text-xs">
                비잔티움 6층 (부천역 도보 5분)
              </p>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="border border-gray-200 p-6 md:p-8">
          <h2 className="text-[1.5rem] font-bold text-[#1A1A1A] mb-6">온라인 상담 신청</h2>
          <form className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                학생 이름
              </label>
              <input
                type="text"
                id="name"
                className="w-full h-11 px-3 border border-gray-300 text-sm focus:outline-none focus:border-[#1E64FA]"
                placeholder="이름을 입력하세요"
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                연락처
              </label>
              <input
                type="tel"
                id="phone"
                className="w-full h-11 px-3 border border-gray-300 text-sm focus:outline-none focus:border-[#1E64FA]"
                placeholder="010-0000-0000"
              />
            </div>
            <div>
              <label htmlFor="grade" className="block text-sm font-medium text-gray-700 mb-1">
                학년
              </label>
              <select
                id="grade"
                className="w-full h-11 px-3 border border-gray-300 text-sm focus:outline-none focus:border-[#1E64FA] bg-white"
              >
                <option value="">선택해 주세요</option>
                <option value="high1">고1</option>
                <option value="high2">고2</option>
                <option value="high3">고3</option>
                <option value="n">N수생</option>
              </select>
            </div>
            <div>
              <label htmlFor="interest" className="block text-sm font-medium text-gray-700 mb-1">
                관심 프로그램
              </label>
              <select
                id="interest"
                className="w-full h-11 px-3 border border-gray-300 text-sm focus:outline-none focus:border-[#1E64FA] bg-white"
              >
                <option value="">선택해 주세요</option>
                <option value="suneung">수능 대비</option>
                <option value="gpa">내신 관리</option>
                <option value="essay">논술 특강</option>
                <option value="credit">고교학점제 대비</option>
                <option value="consulting">입시 컨설팅</option>
              </select>
            </div>
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                문의 내용
              </label>
              <textarea
                id="message"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-[#1E64FA] resize-none"
                placeholder="궁금한 내용을 자유롭게 작성해 주세요"
              />
            </div>
            <button
              type="submit"
              className="w-full h-16 bg-[#1E64FA] text-white font-bold text-[1.375rem] rounded-full hover:bg-[#0E41AD] transition-colors"
            >
              상담 신청하기
            </button>
            <p className="text-xs text-gray-400 text-center">
              제출하신 정보는 상담 목적으로만 사용되며, 개인정보처리방침에 따라 보호됩니다.
            </p>
          </form>
        </div>
      </div>
      </div>
    </>
  );
}
