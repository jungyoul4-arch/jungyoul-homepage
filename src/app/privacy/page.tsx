import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description: "주식회사정율 개인정보처리방침",
  openGraph: {
    title: "개인정보처리방침 | 정율 교육정보",
    description: "주식회사정율 개인정보처리방침",
  },
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <div className="max-w-[1480px] mx-auto px-4 lg:px-10 py-10">
      <h1 className="text-[1.5rem] md:text-[2.75rem] font-bold text-[#1A1A1A] mb-8">
        개인정보처리방침
      </h1>

      <div className="max-w-3xl prose-newsroom">
        <p className="text-gray-500 text-sm mb-8">
          시행일: 2024년 1월 1일
        </p>

        <section className="mb-8">
          <h2 className="text-[1.375rem] font-bold text-[#000080] mb-3">
            제1조 (개인정보의 처리 목적)
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            주식회사정율(이하 &ldquo;회사&rdquo;)은 다음의 목적을 위하여 개인정보를 처리합니다.
            처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며,
            이용 목적이 변경되는 경우에는 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
          </p>
          <ul className="text-sm text-gray-600 mt-3 space-y-1 list-disc list-inside">
            <li>교육 상담 신청 접수 및 회신</li>
            <li>설명회 안내 및 참가 신청 관리</li>
            <li>교육 서비스 제공 및 학습 관리</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-[1.375rem] font-bold text-[#000080] mb-3">
            제2조 (개인정보의 처리 및 보유기간)
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에
            동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.
          </p>
          <ul className="text-sm text-gray-600 mt-3 space-y-1 list-disc list-inside">
            <li>상담 신청 정보: 상담 완료 후 1년</li>
            <li>교육 서비스 이용 기록: 서비스 종료 후 3년</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-[1.375rem] font-bold text-[#000080] mb-3">
            제3조 (처리하는 개인정보의 항목)
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            회사는 다음의 개인정보 항목을 처리하고 있습니다.
          </p>
          <ul className="text-sm text-gray-600 mt-3 space-y-1 list-disc list-inside">
            <li>필수항목: 이름, 연락처</li>
            <li>선택항목: 학년, 관심 프로그램, 문의 내용</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-[1.375rem] font-bold text-[#000080] mb-3">
            제4조 (개인정보의 파기)
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는
            지체 없이 해당 개인정보를 파기합니다. 전자적 파일 형태의 정보는 복구 및 재생할 수 없도록
            안전하게 삭제하며, 그 외의 기록물은 파쇄 또는 소각합니다.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-[1.375rem] font-bold text-[#000080] mb-3">
            제5조 (정보주체의 권리·의무)
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            정보주체는 회사에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다.
          </p>
          <ul className="text-sm text-gray-600 mt-3 space-y-1 list-disc list-inside">
            <li>개인정보 열람 요구</li>
            <li>오류 등이 있을 경우 정정 요구</li>
            <li>삭제 요구</li>
            <li>처리정지 요구</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-[1.375rem] font-bold text-[#000080] mb-3">
            제6조 (개인정보 보호책임자)
          </h2>
          <div className="text-sm text-gray-600 leading-relaxed">
            <p>성명: 곽정율</p>
            <p>직책: 대표이사</p>
            <p>연락처: 032-321-9937</p>
            <p>이메일: jungyoul3@naver.com</p>
          </div>
        </section>
      </div>
    </div>
  );
}
