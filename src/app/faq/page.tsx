import type { Metadata } from "next";
import { HeroBanner } from "@/components/hero-banner";

export const metadata: Metadata = {
  title: "자주 묻는 질문(FAQ)",
  description:
    "정율사관학원에 대해 자주 묻는 질문과 답변입니다. 수능, 내신, 논술 준비 방법부터 상담 신청까지 궁금한 점을 확인하세요.",
  keywords: [
    "정율사관학원 FAQ",
    "부천학원 자주묻는질문",
    "수능 준비 방법",
    "약술형 논술이란",
    "내신 관리 방법",
  ],
  openGraph: {
    title: "자주 묻는 질문(FAQ) | 정율 교육정보",
    description:
      "정율사관학원에 대해 자주 묻는 질문과 답변입니다.",
    images: [{ url: "/images/hero-faq.jpg", width: 1200, height: 514 }],
  },
  alternates: {
    canonical: "/faq",
  },
};

const faqs = [
  {
    question: "정율사관학원은 어디에 있나요?",
    answer:
      "경기도 부천시 원미구 길주로91 비잔티움 6층에 위치해 있으며, 부천역에서 도보 5분 거리입니다. 전화 상담은 032-321-9937로 가능합니다.",
  },
  {
    question: "정율사관학원에서 제공하는 프로그램은 무엇인가요?",
    answer:
      "수능 대비(국어·영어·수학), 내신 관리(학교별 맞춤 전략), 논술 특강(약술형·인문논술), 고교학점제 대비, AI 기반 진로 설계(앱티핏·생기뷰), 입시 컨설팅(수시·정시) 프로그램을 운영합니다.",
  },
  {
    question: "수능 대비는 언제부터 시작하는 것이 좋나요?",
    answer:
      "이상적으로는 고2 겨울방학부터 본격적인 수능 대비를 시작하는 것이 좋습니다. 고3 3월 모의고사 이후 약점을 분석하고 과목별 학습 전략을 세우는 것이 핵심입니다. 정율에서는 개인별 현재 등급과 목표에 맞는 맞춤 로드맵을 제공합니다.",
  },
  {
    question: "약술형 논술이란 무엇인가요?",
    answer:
      "약술형 논술은 가천대, 수원대 등에서 시행하는 논술 전형으로, 기존 논술보다 짧은 분량(200~600자)의 답안을 작성하는 형태입니다. 교과 내용 중심으로 출제되어 별도의 논술 훈련 없이도 준비가 가능하며, 내신 등급이 다소 낮아도 합격 가능성이 있어 주목받고 있습니다.",
  },
  {
    question: "내신 관리는 어떻게 하나요?",
    answer:
      "정율사관학원은 학교별 기출 분석을 바탕으로 맞춤형 내신 전략을 제공합니다. 같은 과목이라도 학교마다 출제 패턴이 다르기 때문에, 재학 중인 학교의 기출문제를 분석하고 출제 경향에 맞는 학습 계획을 세우는 것이 핵심입니다.",
  },
  {
    question: "상담은 어떻게 신청하나요?",
    answer:
      "전화(032-321-9937), 카카오톡 채널, 또는 홈페이지 상담신청 페이지에서 온라인으로 신청할 수 있습니다. 평일 09:00~22:00, 토요일 09:00~18:00에 상담이 가능합니다.",
  },
  {
    question: "수시와 정시 중 어떤 전형이 유리한가요?",
    answer:
      "학생의 내신 등급, 모의고사 성적, 비교과 활동에 따라 유리한 전형이 달라집니다. 내신이 강하다면 수시(학생부교과/학생부종합), 수능 성적이 강하다면 정시가 유리할 수 있습니다. 정율에서는 데이터 기반 분석을 통해 개인별 최적의 입시 전략을 설계합니다.",
  },
  {
    question: "AI 진로 설계 프로그램이란 무엇인가요?",
    answer:
      "서울대 기술지주자회사의 AI 프로그램을 도입한 과학적 진로 설계 도구입니다. '앱티핏'은 AI 적성검사를 통해 전공 적합도를 분석하고, '생기뷰'는 합격생의 학생부를 학습한 AI가 학생부종합전형의 강점과 보완점을 진단합니다.",
  },
  {
    question: "고교학점제란 무엇이고, 어떻게 대비하나요?",
    answer:
      "고교학점제는 학생이 원하는 과목을 직접 선택하여 수강하고, 일정 학점을 이수하면 졸업하는 제도입니다. 과목 선택이 대입에 직접 영향을 미치므로, 희망 전공과 연계된 과목을 전략적으로 선택하는 것이 중요합니다. 정율에서는 AI 기반 진로 설계를 통해 최적의 과목 조합을 추천합니다.",
  },
  {
    question: "수강료는 어떻게 되나요?",
    answer:
      "수강료는 과목, 수강 횟수, 프로그램에 따라 다릅니다. 정확한 수강료 안내는 전화(032-321-9937) 또는 카카오톡 상담을 통해 확인하실 수 있습니다. 학원 교습비는 관할 교육청에 신고된 금액에 따릅니다.",
  },
];

export default function FAQPage() {
  return (
    <>
      <HeroBanner src="/images/hero-faq.jpg" alt="정율 교육정보 자주 묻는 질문" />
      <div className="max-w-[1280px] mx-auto px-4 py-10">
        {/* FAQPage JSON-LD — AEO 핵심 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((faq) => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: {
                "@type": "Answer",
                text: faq.answer,
              },
            })),
          }).replace(/</g, "\\u003c"),
        }}
      />

      <h1 className="text-[1.5rem] md:text-[2.75rem] font-bold text-[#1A1A1A] mb-2">
        자주 묻는 질문
      </h1>
      <p className="text-[1.25rem] font-medium text-[#666666] mb-10">
        정율사관학원과 입시 준비에 대해 궁금한 점을 확인하세요.
      </p>

      <div className="max-w-3xl space-y-6">
        {faqs.map((faq, index) => (
          <details
            key={index}
            className="group border border-gray-200 open:border-[#1E64FA] transition-colors"
          >
            <summary className="flex items-start gap-3 px-6 py-5 cursor-pointer list-none select-none hover:bg-gray-50 transition-colors">
              <span className="text-[#1E64FA] font-bold text-lg mt-0.5 shrink-0">
                Q
              </span>
              <span className="text-[1.25rem] font-bold text-[#1A1A1A] leading-relaxed">
                {faq.question}
              </span>
              <span className="ml-auto shrink-0 text-gray-400 group-open:rotate-180 transition-transform duration-200">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                >
                  <path
                    d="M5 7.5L10 12.5L15 7.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </summary>
            <div className="px-6 pb-5 pt-0">
              <div className="flex items-start gap-3">
                <span className="text-gray-400 font-bold text-lg mt-0.5 shrink-0">
                  A
                </span>
                <p className="text-[1.25rem] font-normal text-[#000000] leading-[30px]">
                  {faq.answer}
                </p>
              </div>
            </div>
          </details>
        ))}
      </div>
      </div>
    </>
  );
}
