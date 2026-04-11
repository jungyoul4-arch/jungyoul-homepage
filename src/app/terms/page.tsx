import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "이용약관",
  description: "주식회사정율 서비스 이용약관",
  openGraph: {
    title: "이용약관 | 정율 교육정보",
    description: "주식회사정율 서비스 이용약관",
  },
  alternates: {
    canonical: "/terms",
  },
};

export default function TermsPage() {
  return (
    <div className="max-w-[1280px] mx-auto px-4 py-10">
      <h1 className="text-[1.5rem] md:text-[2.75rem] font-bold text-[#1A1A1A] mb-8">
        이용약관
      </h1>

      <div className="max-w-3xl prose-newsroom">
        <p className="text-gray-500 text-sm mb-8">
          시행일: 2024년 1월 1일
        </p>

        <section className="mb-8">
          <h2 className="text-[1.375rem] font-bold text-[#000080] mb-3">
            제1조 (목적)
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            본 약관은 주식회사정율(이하 &ldquo;회사&rdquo;)이 운영하는 웹사이트(www.jungyoul.net)에서
            제공하는 서비스의 이용조건 및 절차에 관한 사항을 규정함을 목적으로 합니다.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-[1.375rem] font-bold text-[#000080] mb-3">
            제2조 (정의)
          </h2>
          <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
            <li>&ldquo;서비스&rdquo;란 회사가 웹사이트를 통해 제공하는 교육 정보, 상담 신청, 설명회 안내 등 일체의 서비스를 말합니다.</li>
            <li>&ldquo;이용자&rdquo;란 본 약관에 따라 회사가 제공하는 서비스를 이용하는 자를 말합니다.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-[1.375rem] font-bold text-[#000080] mb-3">
            제3조 (약관의 효력 및 변경)
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            본 약관은 웹사이트에 게시함으로써 효력이 발생합니다.
            회사는 합리적인 사유가 있는 경우 관련 법령에 위배되지 않는 범위 내에서
            약관을 변경할 수 있으며, 변경된 약관은 웹사이트에 공지합니다.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-[1.375rem] font-bold text-[#000080] mb-3">
            제4조 (서비스의 제공)
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-3">
            회사는 다음과 같은 서비스를 제공합니다.
          </p>
          <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
            <li>교육 정보 및 입시 관련 콘텐츠 제공</li>
            <li>온라인 상담 신청 및 설명회 안내</li>
            <li>교육 프로그램 안내</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-[1.375rem] font-bold text-[#000080] mb-3">
            제5조 (이용자의 의무)
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            이용자는 서비스 이용 시 허위 정보를 제공하거나, 타인의 정보를 도용하는 행위,
            서비스의 운영을 방해하는 행위 등을 해서는 안 됩니다.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-[1.375rem] font-bold text-[#000080] mb-3">
            제6조 (면책 조항)
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            회사는 천재지변, 불가항력 등으로 인해 서비스를 제공할 수 없는 경우에는
            서비스 제공에 관한 책임이 면제됩니다.
            또한 이용자의 귀책사유로 인한 서비스 이용 장애에 대해서는 책임을 지지 않습니다.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-[1.375rem] font-bold text-[#000080] mb-3">
            제7조 (분쟁 해결)
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            본 약관에 관한 분쟁은 대한민국 법률에 따르며,
            회사의 주소지를 관할하는 법원을 제1심 관할법원으로 합니다.
          </p>
        </section>

        <section>
          <h2 className="text-[1.375rem] font-bold text-[#000080] mb-3">
            부칙
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            본 약관은 2024년 1월 1일부터 시행합니다.
          </p>
        </section>
      </div>
    </div>
  );
}
