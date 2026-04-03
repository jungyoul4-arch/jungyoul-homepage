-- jungyoul-homepage 초기 데이터 시드
-- 기존 src/lib/data.ts 정적 데이터 마이그레이션

-- 테이블 생성
CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  content TEXT DEFAULT '',
  category TEXT NOT NULL CHECK(category IN ('strategy','column','success','news')),
  category_label TEXT NOT NULL,
  thumbnail TEXT DEFAULT '',
  date TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  featured INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS highlights (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  thumbnail TEXT DEFAULT '',
  slug TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS teachers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  photo TEXT DEFAULT '',
  slug TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  youtube_id TEXT NOT NULL,
  thumbnail TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS admin (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL
);

-- 기사 데이터
INSERT INTO articles (id, title, excerpt, category, category_label, thumbnail, date, slug, featured) VALUES
('1', '2026학년도 수능 국어 영역, 핵심 출제 경향과 대비 전략 총정리', '올해 수능 국어 영역은 어떻게 출제될까? 최근 3개년 기출 분석을 바탕으로 효과적인 학습 전략을 제시합니다.', 'strategy', '입시전략', '/images/placeholder-1.jpg', '2026/03/27', '2026-suneung-korean-strategy', 1),
('2', '고교학점제 시대, AI로 진로를 설계하는 새로운 방법', '서울대 기술지주자회사의 AI 프로그램을 도입한 정율의 고교학점제 대비 전략을 소개합니다.', 'column', '교육칼럼', '/images/placeholder-2.jpg', '2026/03/25', 'ai-career-design-high-school-credit', 1),
('3', '약술논술 합격 비법 — 가천대·수원대 간호학과 합격 스토리', '2026학년도 약술논술로 가천대, 수원대 간호학과에 동시 합격한 학생의 실전 준비 과정을 공개합니다.', 'success', '합격스토리', '/images/placeholder-3.jpg', '2026/03/24', 'gachon-suwon-nursing-success', 1),
('4', '모의고사 4등급에서 수능 국어 1등급으로! 역전의 비결', '불수능이라 불린 2026 수능에서 국어 1등급을 달성한 학생의 공부법과 멘탈 관리 비법을 들어봅니다.', 'success', '합격스토리', '/images/placeholder-4.jpg', '2026/03/22', 'mock-4-to-suneung-1-korean', 1),
('5', '2026 대입 논술 전형 완벽 분석 — 대학별 출제 경향과 합격 전략', '가천대, 국민대, 한국외대 등 주요 대학의 논술 전형을 분석하고 합격을 위한 실전 전략을 제시합니다.', 'strategy', '입시전략', '/images/placeholder-5.jpg', '2026/03/20', '2026-essay-admission-analysis', 0),
('6', '내신 관리의 정석 — 학교별 맞춤 전략으로 1등급 만들기', '같은 내신이라도 학교별 출제 패턴이 다릅니다. 학교별 맞춤 내신 전략의 핵심을 알려드립니다.', 'strategy', '입시전략', '/images/placeholder-6.jpg', '2026/03/18', 'school-specific-gpa-strategy', 0),
('7', '합격생의 생기부를 학습한 AI 학생부 분석 프로그램 ''생기뷰'' 도입', '학생부종합전형의 핵심 평가요소를 AI가 분석하여 강점과 보완점을 제시하는 ''생기뷰''를 소개합니다.', 'column', '교육칼럼', '/images/placeholder-7.jpg', '2026/03/15', 'ai-student-record-analysis-saenggibyu', 0),
('8', '수능에서 국영수 총 4개 등급 올린 학생의 공부 비법 공개', '3개 영역에서 총 4개 등급을 상승시킨 비결. 시간 관리부터 과목별 공부법까지 상세히 공유합니다.', 'success', '합격스토리', '/images/placeholder-8.jpg', '2026/03/13', 'suneung-4-grade-improvement', 0),
('9', '고3 국·영·수 내신/정시 학습전략 설명회 안내', '3월 모의고사 이후, 본격적인 입시 전략을 세울 시간입니다. 과목별 학습 방향을 점검하는 설명회를 개최합니다.', 'news', '공지사항', '/images/placeholder-9.jpg', '2026/03/27', 'g3-study-strategy-seminar', 0),
('10', '약술형 논술 무료 공개특강 — 답안의 격을 바꾸다', '감점 요인 제거와 시간 단축 전략. 가천대, 국민대 약술형 논술의 실전 답안 작성법을 공개합니다.', 'news', '공지사항', '/images/placeholder-10.jpg', '2026/03/20', 'essay-free-open-lecture', 0),
('11', 'AI 적성검사 ''앱티핏'' 도입 — 과학적 진로 설계의 시작', '성적만으로 전공을 선택하는 시대는 끝났습니다. AI가 분석하는 나만의 전공 적합도를 확인해보세요.', 'column', '교육칼럼', '/images/placeholder-11.jpg', '2026/03/10', 'ai-aptitude-test-aptifit', 0),
('12', '가천대 논술 합격 전략 설명회 — 입학처 직접 초빙', '가천대학교 입학처 관계자를 직접 초빙하여 공신력 있는 데이터를 바탕으로 합격 전략을 안내합니다.', 'news', '공지사항', '/images/placeholder-12.jpg', '2026/03/08', 'gachon-essay-strategy-seminar', 0);

-- 하이라이트 데이터
INSERT INTO highlights (id, title, thumbnail, slug) VALUES
('1', '수능 전략', '/images/highlight-suneung.jpg', 'suneung-strategy'),
('2', '논술 가이드', '/images/highlight-essay.jpg', 'essay-guide'),
('3', '내신 관리', '/images/highlight-gpa.jpg', 'gpa-management'),
('4', '고교학점제', '/images/highlight-credit.jpg', 'high-school-credit'),
('5', 'AI 교육', '/images/highlight-ai.jpg', 'ai-education'),
('6', '합격 수기', '/images/highlight-success.jpg', 'success-stories'),
('7', '학부모 가이드', '/images/highlight-parents.jpg', 'parents-guide');

-- 강사 데이터
INSERT INTO teachers (id, name, subject, photo, slug) VALUES
('1', '이지후', '국어', '/images/teacher-1.jpg', 'lee-jihu'),
('2', '박서욱', '국어', '/images/teacher-2.jpg', 'park-seowook'),
('3', '박지영', '국어', '/images/teacher-3.jpg', 'park-jiyoung'),
('4', '황규훈', '수학', '/images/teacher-4.jpg', 'hwang-gyuhun'),
('5', '김후엽', '수학', '/images/teacher-5.jpg', 'kim-huyeop'),
('6', '조우제', '수학', '/images/teacher-6.jpg', 'cho-wooje'),
('7', '최희성', '수학', '/images/teacher-7.jpg', 'choi-heesung'),
('8', '권승호', '영어', '/images/teacher-8.jpg', 'kwon-seungho'),
('9', '이성웅', '영어', '/images/teacher-9.jpg', 'lee-sungwoong'),
('10', '박상혁', '영어', '/images/teacher-10.jpg', 'park-sanghyuk'),
('11', '지성현', '탐구', '/images/teacher-11.jpg', 'ji-sunghyun'),
('12', '신경호', '컨설팅', '/images/teacher-12.jpg', 'shin-kyungho');

-- 영상 데이터
INSERT INTO videos (id, title, youtube_id, thumbnail) VALUES
('1', '가천대·수원대 간호학과 합격 스토리', '7usrDA98kL0', '/images/video-1.jpg'),
('2', '수능 국영수 4개 등급 상승 인터뷰', 'iRJfhyeTPxw', '/images/video-2.jpg'),
('3', '모의고사 4등급 → 수능 국어 1등급', 'ZylPxyd2x4A', '/images/video-3.jpg');

-- 기본 관리자 계정 (비밀번호: admin1234 의 bcrypt 해시)
-- 실제 배포 시 반드시 변경할 것
INSERT INTO admin (username, password_hash) VALUES
('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy');
