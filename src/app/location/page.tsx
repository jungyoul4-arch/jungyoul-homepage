import type { Metadata } from "next";
import { MapPin, Train, Bus, Car } from "lucide-react";
import { HeroBanner } from "@/components/hero-banner";

export const metadata: Metadata = {
  title: "찾아오는 길",
  description:
    "정율사관학원 오시는 길 안내. 경기도 부천시 원미구 길주로91 601호 비잔티움 6층. 부천역 도보 5분.",
  openGraph: {
    title: "찾아오는 길 | 정율 교육정보",
    description: "정율사관학원 오시는 길 안내. 부천역 도보 5분.",
    images: [{ url: "/images/hero-location.jpg", width: 1200, height: 514 }],
  },
  alternates: {
    canonical: "/location",
  },
};

export default function LocationPage() {
  return (
    <>
      <HeroBanner src="/images/hero-location.jpg" alt="정율 교육정보 찾아오는 길" />
      <div className="max-w-[1280px] mx-auto px-4 py-10">
        {/* JSON-LD Place */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Place",
            name: "정율사관학원",
            address: {
              "@type": "PostalAddress",
              streetAddress: "길주로91 601호(비잔티움 6층)",
              addressLocality: "부천시 원미구",
              addressRegion: "경기도",
              postalCode: "14544",
              addressCountry: "KR",
            },
            telephone: "032-321-9937",
            geo: {
              "@type": "GeoCoordinates",
              latitude: 37.4864,
              longitude: 126.7636,
            },
          }),
        }}
      />

      <h1 className="text-[1.5rem] md:text-[2.75rem] font-bold text-[#1A1A1A] mb-2">
        찾아오는 길
      </h1>
      <p className="text-[1.25rem] font-medium text-[#666666] mb-10">
        정율사관학원은 부천역에서 도보 5분 거리에 위치해 있습니다.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Map Area */}
        <div className="lg:col-span-2">
          {/* 카카오맵 또는 네이버맵 embed 영역 */}
          <div className="w-full aspect-[16/10] bg-gray-100 border border-gray-200 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <MapPin size={48} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-medium">지도 영역</p>
              <p className="text-xs mt-1">카카오맵 또는 네이버맵 embed 적용 예정</p>
            </div>
          </div>
        </div>

        {/* Address & Directions */}
        <div className="space-y-6">
          {/* Address Card */}
          <div className="border border-gray-200 p-6">
            <div className="flex items-start gap-3 mb-4">
              <MapPin size={20} className="text-[#1E64FA] shrink-0 mt-0.5" />
              <div>
                <h2 className="font-bold text-[#1A1A1A] mb-1">주소</h2>
                <p className="text-sm text-gray-600">
                  경기도 부천시 원미구 길주로91
                </p>
                <p className="text-sm text-gray-600">
                  601호 (비잔티움 6층)
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  우편번호: 14544
                </p>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-sm font-medium text-gray-900 mb-1">고객센터</p>
              <a
                href="tel:032-321-9937"
                className="text-[#1E64FA] font-bold text-lg hover:underline"
              >
                032-321-9937
              </a>
              <p className="text-xs text-gray-400 mt-1">
                평일 09:00~22:00 / 토 09:00~18:00
              </p>
            </div>
          </div>

          {/* Transportation */}
          <div className="border border-gray-200 p-6 space-y-5">
            <h2 className="font-bold text-[#1A1A1A]">교통 안내</h2>

            <div className="flex items-start gap-3">
              <Train size={18} className="text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">지하철</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  1호선 부천역 남부광장 방면 출구 도보 5분
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Bus size={18} className="text-[#1E64FA] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">버스</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  부천역 정류장 하차 후 길주로 방면 도보 이동
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Car size={18} className="text-orange-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">자가용</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  비잔티움 건물 지하주차장 이용 가능
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
