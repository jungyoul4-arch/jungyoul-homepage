// 삼성 뉴스룸의 카테고리/탭 구조를 교육 콘텐츠에 맞게 매핑
export type Category = "all" | "strategy" | "column" | "success" | "news";

export interface Article {
  id: string;
  title: string;
  excerpt: string;
  category: Category;
  categoryLabel: string;
  thumbnail: string;
  date: string;
  slug: string;
  featured?: boolean;
}

export interface Highlight {
  id: string;
  title: string;
  thumbnail: string;
  slug: string;
}

export interface Teacher {
  id: string;
  name: string;
  subject: string;
  photo: string;
  slug: string;
}

export const categories: { value: Category; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "strategy", label: "입시전략" },
  { value: "column", label: "교육칼럼" },
  { value: "success", label: "합격스토리" },
  { value: "news", label: "공지사항" },
];

// 샘플 기사 데이터 (실제 운영 시 CMS 연동)
export const articles: Article[] = [
  {
    id: "1",
    title: "2026학년도 수능 국어 영역, 핵심 출제 경향과 대비 전략 총정리",
    excerpt:
      "올해 수능 국어 영역은 어떻게 출제될까? 최근 3개년 기출 분석을 바탕으로 효과적인 학습 전략을 제시합니다.",
    category: "strategy",
    categoryLabel: "입시전략",
    thumbnail: "/images/placeholder-1.jpg",
    date: "2026/03/27",
    slug: "2026-suneung-korean-strategy",
    featured: true,
  },
  {
    id: "2",
    title: "고교학점제 시대, AI로 진로를 설계하는 새로운 방법",
    excerpt:
      "서울대 기술지주자회사의 AI 프로그램을 도입한 정율의 고교학점제 대비 전략을 소개합니다.",
    category: "column",
    categoryLabel: "교육칼럼",
    thumbnail: "/images/placeholder-2.jpg",
    date: "2026/03/25",
    slug: "ai-career-design-high-school-credit",
    featured: true,
  },
  {
    id: "3",
    title: "약술논술 합격 비법 — 가천대·수원대 간호학과 합격 스토리",
    excerpt:
      "2026학년도 약술논술로 가천대, 수원대 간호학과에 동시 합격한 학생의 실전 준비 과정을 공개합니다.",
    category: "success",
    categoryLabel: "합격스토리",
    thumbnail: "/images/placeholder-3.jpg",
    date: "2026/03/24",
    slug: "gachon-suwon-nursing-success",
    featured: true,
  },
  {
    id: "4",
    title: "모의고사 4등급에서 수능 국어 1등급으로! 역전의 비결",
    excerpt:
      "불수능이라 불린 2026 수능에서 국어 1등급을 달성한 학생의 공부법과 멘탈 관리 비법을 들어봅니다.",
    category: "success",
    categoryLabel: "합격스토리",
    thumbnail: "/images/placeholder-4.jpg",
    date: "2026/03/22",
    slug: "mock-4-to-suneung-1-korean",
    featured: true,
  },
  {
    id: "5",
    title: "2026 대입 논술 전형 완벽 분석 — 대학별 출제 경향과 합격 전략",
    excerpt:
      "가천대, 국민대, 한국외대 등 주요 대학의 논술 전형을 분석하고 합격을 위한 실전 전략을 제시합니다.",
    category: "strategy",
    categoryLabel: "입시전략",
    thumbnail: "/images/placeholder-5.jpg",
    date: "2026/03/20",
    slug: "2026-essay-admission-analysis",
  },
  {
    id: "6",
    title: "내신 관리의 정석 — 학교별 맞춤 전략으로 1등급 만들기",
    excerpt:
      "같은 내신이라도 학교별 출제 패턴이 다릅니다. 학교별 맞춤 내신 전략의 핵심을 알려드립니다.",
    category: "strategy",
    categoryLabel: "입시전략",
    thumbnail: "/images/placeholder-6.jpg",
    date: "2026/03/18",
    slug: "school-specific-gpa-strategy",
  },
  {
    id: "7",
    title: "합격생의 생기부를 학습한 AI 학생부 분석 프로그램 '생기뷰' 도입",
    excerpt:
      "학생부종합전형의 핵심 평가요소를 AI가 분석하여 강점과 보완점을 제시하는 '생기뷰'를 소개합니다.",
    category: "column",
    categoryLabel: "교육칼럼",
    thumbnail: "/images/placeholder-7.jpg",
    date: "2026/03/15",
    slug: "ai-student-record-analysis-saenggibyu",
  },
  {
    id: "8",
    title: "수능에서 국영수 총 4개 등급 올린 학생의 공부 비법 공개",
    excerpt:
      "3개 영역에서 총 4개 등급을 상승시킨 비결. 시간 관리부터 과목별 공부법까지 상세히 공유합니다.",
    category: "success",
    categoryLabel: "합격스토리",
    thumbnail: "/images/placeholder-8.jpg",
    date: "2026/03/13",
    slug: "suneung-4-grade-improvement",
  },
  {
    id: "9",
    title: "고3 국·영·수 내신/정시 학습전략 설명회 안내",
    excerpt:
      "3월 모의고사 이후, 본격적인 입시 전략을 세울 시간입니다. 과목별 학습 방향을 점검하는 설명회를 개최합니다.",
    category: "news",
    categoryLabel: "공지사항",
    thumbnail: "/images/placeholder-9.jpg",
    date: "2026/03/27",
    slug: "g3-study-strategy-seminar",
  },
  {
    id: "10",
    title: "약술형 논술 무료 공개특강 — 답안의 격을 바꾸다",
    excerpt:
      "감점 요인 제거와 시간 단축 전략. 가천대, 국민대 약술형 논술의 실전 답안 작성법을 공개합니다.",
    category: "news",
    categoryLabel: "공지사항",
    thumbnail: "/images/placeholder-10.jpg",
    date: "2026/03/20",
    slug: "essay-free-open-lecture",
  },
  {
    id: "11",
    title: "AI 적성검사 '앱티핏' 도입 — 과학적 진로 설계의 시작",
    excerpt:
      "성적만으로 전공을 선택하는 시대는 끝났습니다. AI가 분석하는 나만의 전공 적합도를 확인해보세요.",
    category: "column",
    categoryLabel: "교육칼럼",
    thumbnail: "/images/placeholder-11.jpg",
    date: "2026/03/10",
    slug: "ai-aptitude-test-aptifit",
  },
  {
    id: "12",
    title: "가천대 논술 합격 전략 설명회 — 입학처 직접 초빙",
    excerpt:
      "가천대학교 입학처 관계자를 직접 초빙하여 공신력 있는 데이터를 바탕으로 합격 전략을 안내합니다.",
    category: "news",
    categoryLabel: "공지사항",
    thumbnail: "/images/placeholder-12.jpg",
    date: "2026/03/08",
    slug: "gachon-essay-strategy-seminar",
  },
];

export const highlights: Highlight[] = [
  {
    id: "1",
    title: "수능 전략",
    thumbnail: "/images/highlight-suneung.jpg",
    slug: "suneung-strategy",
  },
  {
    id: "2",
    title: "논술 가이드",
    thumbnail: "/images/highlight-essay.jpg",
    slug: "essay-guide",
  },
  {
    id: "3",
    title: "내신 관리",
    thumbnail: "/images/highlight-gpa.jpg",
    slug: "gpa-management",
  },
  {
    id: "4",
    title: "고교학점제",
    thumbnail: "/images/highlight-credit.jpg",
    slug: "high-school-credit",
  },
  {
    id: "5",
    title: "AI 교육",
    thumbnail: "/images/highlight-ai.jpg",
    slug: "ai-education",
  },
  {
    id: "6",
    title: "합격 수기",
    thumbnail: "/images/highlight-success.jpg",
    slug: "success-stories",
  },
  {
    id: "7",
    title: "학부모 가이드",
    thumbnail: "/images/highlight-parents.jpg",
    slug: "parents-guide",
  },
];

export const videos = [
  {
    id: "1",
    title: "가천대·수원대 간호학과 합격 스토리",
    youtubeId: "7usrDA98kL0",
    thumbnail: "/images/video-1.jpg",
  },
  {
    id: "2",
    title: "수능 국영수 4개 등급 상승 인터뷰",
    youtubeId: "iRJfhyeTPxw",
    thumbnail: "/images/video-2.jpg",
  },
  {
    id: "3",
    title: "모의고사 4등급 → 수능 국어 1등급",
    youtubeId: "ZylPxyd2x4A",
    thumbnail: "/images/video-3.jpg",
  },
];

export const teachers: Teacher[] = [
  { id: "1", name: "이지후", subject: "국어", photo: "/images/teacher-1.jpg", slug: "lee-jihu" },
  { id: "2", name: "박서욱", subject: "국어", photo: "/images/teacher-2.jpg", slug: "park-seowook" },
  { id: "3", name: "박지영", subject: "국어", photo: "/images/teacher-3.jpg", slug: "park-jiyoung" },
  { id: "4", name: "황규훈", subject: "수학", photo: "/images/teacher-4.jpg", slug: "hwang-gyuhun" },
  { id: "5", name: "김후엽", subject: "수학", photo: "/images/teacher-5.jpg", slug: "kim-huyeop" },
  { id: "6", name: "조우제", subject: "수학", photo: "/images/teacher-6.jpg", slug: "cho-wooje" },
  { id: "7", name: "최희성", subject: "수학", photo: "/images/teacher-7.jpg", slug: "choi-heesung" },
  { id: "8", name: "권승호", subject: "영어", photo: "/images/teacher-8.jpg", slug: "kwon-seungho" },
  { id: "9", name: "이성웅", subject: "영어", photo: "/images/teacher-9.jpg", slug: "lee-sungwoong" },
  { id: "10", name: "박상혁", subject: "영어", photo: "/images/teacher-10.jpg", slug: "park-sanghyuk" },
  { id: "11", name: "지성현", subject: "탐구", photo: "/images/teacher-11.jpg", slug: "ji-sunghyun" },
  { id: "12", name: "신경호", subject: "컨설팅", photo: "/images/teacher-12.jpg", slug: "shin-kyungho" },
];
