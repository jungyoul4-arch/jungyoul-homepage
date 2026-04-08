import type { Metadata } from "next";
import { teachers } from "@/lib/data";

export const metadata: Metadata = {
  title: "선생님 소개",
  description:
    "정율사관학원의 전문 강사진을 소개합니다. 국어, 수학, 영어, 탐구 각 과목 전문 선생님이 학생 개개인에 맞는 교육을 제공합니다.",
  openGraph: {
    title: "선생님 소개 | 정율 교육정보",
    description:
      "정율사관학원의 전문 강사진을 소개합니다.",
  },
  alternates: {
    canonical: "/teachers",
  },
};

// 과목별 그룹핑
const subjects = ["국어", "수학", "영어", "탐구", "컨설팅"] as const;

export default function TeachersPage() {
  return (
    <div className="max-w-[1280px] mx-auto px-4 py-10">
      {/* JSON-LD for teachers */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "EducationalOrganization",
            name: "정율사관학원",
            url: "https://www.jungyoul.net",
            employee: teachers.map((t) => ({
              "@type": "Person",
              name: t.name,
              jobTitle: `${t.subject} 강사`,
            })),
          }).replace(/</g, "\\u003c"),
        }}
      />

      {/* Page Header — 삼성 뉴스룸 서브페이지 헤더 스타일 */}
      <h1 className="text-2xl md:text-[32px] font-bold text-gray-900 mb-2">
        선생님 소개
      </h1>
      <p className="text-gray-500 mb-10">
        학생 한 명 한 명에게 최적화된 교육을 제공하는 정율의 전문 강사진입니다.
      </p>

      {/* Teachers by Subject — 과목별 그룹 */}
      {subjects.map((subject) => {
        const subjectTeachers = teachers.filter((t) => t.subject === subject);
        if (subjectTeachers.length === 0) return null;

        return (
          <section key={subject} className="mb-12">
            <h2 className="text-lg font-bold text-gray-900 mb-6 pb-3 border-b border-gray-200">
              {subject}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {subjectTeachers.map((teacher) => (
                <div
                  key={teacher.id}
                  className="group text-center"
                >
                  {/* Teacher Photo */}
                  <div className="relative w-full aspect-square bg-gray-100 rounded-sm overflow-hidden mb-3">
                    <div
                      className="absolute inset-0 transition-transform duration-300 group-hover:scale-105"
                      style={{
                        background: `linear-gradient(135deg,
                          hsl(${parseInt(teacher.id) * 25 + 200}, 30%, 75%) 0%,
                          hsl(${parseInt(teacher.id) * 25 + 220}, 40%, 55%) 100%)`,
                      }}
                    />
                    {/* Placeholder initial */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white text-3xl font-bold opacity-50">
                        {teacher.name[0]}
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <p className="text-xs text-blue-600 font-medium mb-1">
                    {teacher.subject}
                  </p>
                  <p className="text-sm font-bold text-gray-900">
                    {teacher.name} 선생님
                  </p>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
