PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE articles (
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
, pinned_order INTEGER);
INSERT INTO "articles" ("id","title","excerpt","content","category","category_label","thumbnail","date","slug","featured","created_at","updated_at","pinned_order") VALUES('1','2026학년도 수능 국어 영역, 핵심 출제 경향과 대비 전략 총정리','올해 수능 국어 영역은 어떻게 출제될까? 최근 3개년 기출 분석을 바탕으로 효과적인 학습 전략을 제시합니다.','ㄹㅎ오로흐ㅡㅠㅡㅠㅡㅜㅜ <br />','news','공지사항','/api/admin/upload/2026/04/1776322260079-87051180.png','2026/03/27','2026-suneung-korean-strategy',1,'2026-04-03 10:13:27','2026-04-16T06:51:03.125Z',3);
INSERT INTO "articles" ("id","title","excerpt","content","category","category_label","thumbnail","date","slug","featured","created_at","updated_at","pinned_order") VALUES('2','고교학점제 시대, AI로 진로를 설계하는 새로운 방법','서울대 기술지주자회사의 AI 프로그램을 도입한 정율의 고교학점제 대비 전략을 소개합니다.','','column','교육칼럼','/api/admin/upload/2026/04/1776322283772-0f095146.png','2026/03/25','ai-career-design-high-school-credit',1,'2026-04-03 10:13:27','2026-04-16T06:51:25.635Z',NULL);
INSERT INTO "articles" ("id","title","excerpt","content","category","category_label","thumbnail","date","slug","featured","created_at","updated_at","pinned_order") VALUES('3','약술논술 합격 비법 — 가천대·수원대 간호학과 합격 스토리','2026학년도 약술논술로 가천대, 수원대 간호학과에 동시 합격한 학생의 실전 준비 과정을 공개합니다.','1234','success','합격스토리','','2026/03/24','gachon-suwon-nursing-success',1,'2026-04-03 10:13:27','2026-04-06T06:52:11.705Z',NULL);
INSERT INTO "articles" ("id","title","excerpt","content","category","category_label","thumbnail","date","slug","featured","created_at","updated_at","pinned_order") VALUES('4','모의고사 4등급에서 수능 국어 1등급으로! 역전의 비결','불수능이라 불린 2026 수능에서 국어 1등급을 달성한 학생의 공부법과 멘탈 관리 비법을 들어봅니다.','<p></p><div style="font-weight:400;color:rgb(0, 0, 0)"><p><br /><br /></p></div>','success','합격스토리','','2026/03/22','mock-4-to-suneung-1-korean',1,'2026-04-03 10:13:27','2026-04-23T07:21:23.434Z',NULL);
INSERT INTO "articles" ("id","title","excerpt","content","category","category_label","thumbnail","date","slug","featured","created_at","updated_at","pinned_order") VALUES('5','2026 대입 논술 전형 완벽 분석 — 대학별 출제 경향과 합격 전략','가천대, 국민대, 한국외대 등 주요 대학의 논술 전형을 분석하고 합격을 위한 실전 전략을 제시합니다.','','strategy','입시전략','/api/admin/upload/2026/04/1776322317340-a512929c.png','2026/03/20','2026-essay-admission-analysis',0,'2026-04-03 10:13:27','2026-04-16T06:51:58.790Z',2);
INSERT INTO "articles" ("id","title","excerpt","content","category","category_label","thumbnail","date","slug","featured","created_at","updated_at","pinned_order") VALUES('6','내신 관리의 정석 — 학교별 맞춤 전략으로 1등급 만들기','같은 내신이라도 학교별 출제 패턴이 다릅니다. 학교별 맞춤 내신 전략의 핵심을 알려드립니다.','','strategy','입시전략','','2026/03/18','school-specific-gpa-strategy',0,'2026-04-03 10:13:27','2026-04-03 10:13:27',NULL);
INSERT INTO "articles" ("id","title","excerpt","content","category","category_label","thumbnail","date","slug","featured","created_at","updated_at","pinned_order") VALUES('7','합격생의 생기부를 학습한 AI 학생부 분석 프로그램 ''생기뷰'' 도입','학생부종합전형의 핵심 평가요소를 AI가 분석하여 강점과 보완점을 제시하는 ''생기뷰''를 소개합니다.','<p><br /></p>','column','교육칼럼','','2026/03/15','ai-student-record-analysis-saenggibyu',0,'2026-04-03 10:13:27','2026-04-23T07:03:06.642Z',NULL);
INSERT INTO "articles" ("id","title","excerpt","content","category","category_label","thumbnail","date","slug","featured","created_at","updated_at","pinned_order") VALUES('8','수능에서 국영수 총 4개 등급 올린 학생의 공부 비법 공개','3개 영역에서 총 4개 등급을 상승시킨 비결. 시간 관리부터 과목별 공부법까지 상세히 공유합니다.','<p></p><figure><img src="/api/admin/upload/2026/05/1778228930405-b56681cd.png" alt="image.png" /><figcaption>▲ </figcaption></figure><br /><p></p><p><br /></p><p><br /></p><p><br /></p><p>[중원고등학교 1학년 1학기 중간고사 상세 총평]</p><p>▣전체 출제 경향 및 난이도 분석:</p><p>난이도 양극화 구조: 이번 중원고 시험은 1번부터 14번까지의 기초~중간</p><p>난이도 문항군과, 15번부터 21번까지의 고난도 문항군이 뚜렷하게 구분되는</p><p>양극화 구조를 보였습니다. 하위권 학생들은 기초 문항에서 점수를 확보할</p><p>수 있으나, 상위권 변별력은 철저히 후반부 4~5개 문항에서 결정되었습니다.</p><p>▣ 단원별 주요 체크포인트</p><p>다항식 및 나머지 정리 (개념 결합형 사고력 요구):</p><p>단순 나눗셈 원리를 넘어, 나머지 정리를 여러 번 연립하거나 다항식의 구조를</p><p>추론해야 하는 13번, 15번, 16번 문항이 돋보였습니다. 특히 15번은 홀수인</p><p>자연수 조건과 나머지 정리의 심화 개념을 유기적으로 연결해야 풀 수 있는</p><p>고차원적 사고를 요구했습니다.</p><p>복소수와 이차방정식 (함정형 오답 유도 및 주기성):</p><p>4번과 같이 복소수의 기본 성질을 묻는 문항에서도 실수 조건과 허수 조건을</p><p>명확히 분리하지 않으면 오답을 선택하도록 유도하는 ''매력적인 오답'' 함정이</p><p>존재했습니다.</p><p>논술형 21번은 거듭제곱의 주기성을 체계적으로 나열하여 조건에 맞는 자연수</p><p>개수를 정확히 산출해야 하는 문항으로, 서술 과정의 논리적 완결성이 감점</p><p>여부를 결정했습니다.</p><p>이차함수 (기하학적 해석과 위치 관계):</p><p>도형의 넓이를 함수로 표현하는 18번과 구간별로 정의된 함수 h(x)와 직선의</p><p>교점 개수를 분석하는 19번은 이번 시험의 킬러 문항이었습니다. 그래프의</p><p>대칭축, 꼭짓점, 경계값의 위치 관계를 동적으로 파악하는 훈련이 부족했다면</p><p>접근하기 매우 까다로웠을 것입니다.</p><p><br /></p><p></p><figure><img src="/api/admin/upload/2026/05/1778228959947-97ce3c3a.png" alt="image.png" /><figcaption>▲ </figcaption><figcaption><br /></figcaption><figcaption><br /></figcaption></figure><p></p><p>1. [문항 18번] 이차함수의 최대·최소와 도형의 닮음</p><figure><figcaption><p>정석 해석 경로 (변수 설정과 함수화) : 직각이등변삼각형의 기하학적 성질을 이용하여</p><p>직사각형의 가로 또는 세로의 길이를 변수로 설정합니다. 이후 닮음비를 활용하여</p><p>인접한 변의 길이를 변수에 관한 식으로 나타내고, 넓이 공식을 통해 이차함수를</p><p>유도합니다. 마지막으로 표준형 변환을 통해 최댓값을 구하는 ''대수적 모델링''</p><p>경로입니다.</p><p>직관적 해석 원리 (대칭성과 비율의 보존) : 도형을 좌표평면 위에 올리지 않고도,</p><p>직각이등변삼각형 내부에 내접하는 사각형이 가질 수 있는 **''기하학적 대칭성''**에</p><p>주목합니다. 넓이가 최대가 되는 순간은 변수들 사이의 비율이 가장 균형을 이루는</p><p>지점(중점 연결 등)임을 이용합니다. 닮음을 단순 계산 도구가 아닌,</p><p>''길이의 비가</p><p>유지되는 변환''으로 이해하여 식을 간소화하는 원리를 탐구하기에 적합합니다.</p><p>2. [문항 21번] 복소수의 거듭제곱과 주기성</p><p>정석 해석 경로 (수치적 귀납과 규칙성 발견) : 복소수를 직접 제곱, 네제곱하며 i 또는</p><p>1이 나오는 지점을 찾습니다. 이후 반복되는 규칙(주기)을 파악하여 n의 범위를 분류</p><p>하고 조건을 만족하는 자연수의 개수를 세는 ''귀납적 추론'' 경로입니다.</p><p>직관적 해석 원리 (단위 원 위에서의 회전과 대칭) : 복소수를 크기가 1인 벡터로 보고,</p><p>거듭제곱을 단위 원 위에서의 ''일정한 각도의 회전''으로 해석합니다. 켤레복소수와의</p><p>합이 양의 실수가 되는 지점은 두 복소수가 실축 위에서 동기화되는 순간임을 파악하</p><p>는 방식입니다. 대수적인 계산을 기하학적 회전으로 치환하는 원리를 탐구하기에</p><p>적합합니다.</p><p>3. [문항 19번] 함수 그래프와 직선의 동적 위치 관계</p><p>정석 해석 경로 (대수적 판별식과 경계 조사) : 구간별로 함수를 정의하고 그래프를</p><p>그린 뒤, 직선과 접하는 순간과 함수의 꺾이는 점(경계점)을 지나는 순간을 각각</p><p>계산합니다. 모든 임계 지점의 k값을 대수적으로 구한 뒤 조건에 맞는 범위를 찾는</p><p>''상태 분석'' 경로입니다.</p><p>직관적 해석 원리 (정점 중심의 회전 변환 해석) : 직선을 고정된 정점을 지나는</p><p>''회전하는 막대기''로 간주합니다. 정점에서 직선이 회전함에 따라 교점의 개수가</p><p>변하는 찰나의 순간(접점, 경계점)을 시각적으로 추적합니다. 이는 기하학적 직관을</p><p>대수적 계산으로 연결하는 고차원적 사고를 요구하는 소재입니다.</p></figcaption></figure><p><br /></p>','success','합격스토리','','2026/03/13','suneung-4-grade-improvement',0,'2026-04-03 10:13:27','2026-05-08T08:29:36.588Z',NULL);
INSERT INTO "articles" ("id","title","excerpt","content","category","category_label","thumbnail","date","slug","featured","created_at","updated_at","pinned_order") VALUES('9','고3 국·영·수 내신/정시 학습전략 설명회 안내','3월 모의고사 이후, 본격적인 입시 전략을 세울 시간입니다. 과목별 학습 방향을 점검하는 설명회를 개최합니다.','<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;margin:12px 0;border-radius:8px" contenteditable="false"><iframe src="https://www.youtube.com/embed/DrekqeDlO1w" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div><p><br /></p>','news','공지사항','/api/admin/upload/2026/04/1776322295958-3696d4f2.png','2026/03/27','g3-study-strategy-seminar',0,'2026-04-03 10:13:27','2026-04-16T06:51:38.027Z',NULL);
INSERT INTO "articles" ("id","title","excerpt","content","category","category_label","thumbnail","date","slug","featured","created_at","updated_at","pinned_order") VALUES('10','약술형 논술 무료 공개특강 — 답안의 격을 바꾸다','감점 요인 제거와 시간 단축 전략. 가천대, 국민대 약술형 논술의 실전 답안 작성법을 공개합니다.','','news','공지사항','','2026/03/20','essay-free-open-lecture',0,'2026-04-03 10:13:27','2026-04-03 10:13:27',NULL);
INSERT INTO "articles" ("id","title","excerpt","content","category","category_label","thumbnail","date","slug","featured","created_at","updated_at","pinned_order") VALUES('11','AI 적성검사 ''앱티핏'' 도입 — 과학적 진로 설계의 시작','성적만으로 전공을 선택하는 시대는 끝났습니다. AI가 분석하는 나만의 전공 적합도를 확인해보세요.','','column','교육칼럼','','2026/03/10','ai-aptitude-test-aptifit',0,'2026-04-03 10:13:27','2026-04-15T10:46:18.687Z',4);
INSERT INTO "articles" ("id","title","excerpt","content","category","category_label","thumbnail","date","slug","featured","created_at","updated_at","pinned_order") VALUES('12','가천대 논술 합격 전략 설명회 — 입학처 직접 초빙','가천대학교 입학처 관계자를 직접 초빙하여 공신력 있는 데이터를 바탕으로 합격 전략을 안내합니다.','','news','공지사항','','2026/03/08','gachon-essay-strategy-seminar',0,'2026-04-03 10:13:27','2026-04-03 10:13:27',NULL);
INSERT INTO "articles" ("id","title","excerpt","content","category","category_label","thumbnail","date","slug","featured","created_at","updated_at","pinned_order") VALUES('54b5f1d8-360d-40d6-aa42-728684afdb9b','[테스트] 질문과 AI 디지털 트랜스포밍, 사교육에 재미 더하고 성적도 향상','','<p></p><figure><img src="/api/admin/upload/2026/04/1776159619650-4df28146.png" alt="image.png" /><figcaption>▲(주)정율 정율사관학원 곽정율 대표</figcaption></figure><br /><p></p><p>부천·인천 지역에서 5년 전부터 종이책 대신 IT하드웨어와 AI시스템을 도입한 정율사관학원이 주입식 사교육의 ‘트랜스포머’로 주<span>목받고 있다. </span></p><p><span>학원운영 20년 차 원장인 곽정율 대표는, 상위 10%만을 위한 입시전문사교육 학원문화에 이제 변화를 줄 때라고 한</span><span>다. </span></p><p><span>그는 종이책보다는 스크롤과 터치로 정보획득에 익숙한 학생들과, 상위권 일색인 커리큘럼 개선을 원하는 학원 강사들 모두가</span><span>마음 편한 교육 환경을 제안한다. </span></p><p><span>그래서 이들은 주입식 대신 즐겁게 예습해, 질문 답변으로 학습 참여도와 성적을 함께 올리는 디</span><span>지털 트랜스포밍 사교육 1호다. </span></p><p><span>곽 대표는 나아가 수업시간을 잠으로 때우는 학생이 없도록 재미있는 교육을 추구하며, 향후 이러</span><span>한 교육철학을 확장해 공교육에도 좋은 영향을 주려 한다.</span></p><h2><span style="font-size:1.1em">질문 많은 교실의 비결,</span><span style="font-size:1.1em">종이 대신 전자칠판·아이패드와 </span><span style="font-size:1.1em">AI데이터수집</span></h2><div><p>챗GPT보다 빨리 도입된 국/영/수/사탐과탐 중<span>등고등학습 디지털 트랜스포밍 학원 1호, 부천의 </span><span>전통 있는 입시명문 정율사관학원이 학원교육 IT화</span><span>를 학생 실력 향상으로 이어간 성공사례로 꼽히고 있</span><span>다. </span></p><p><span>강남학원가보다 종이와 연필 없는 문제풀이를</span><span>더 빨리 정착시킨 정율사관학원(이하 정율)의 곽정</span><span>율 대표는, 지역 내 대형입시학원으로 도약한 이래</span><span>자신의 교육철학에 따라 사교육현장을 바꿔가고 있</span><span>다. </span></p><p><span>그는 AI디지털 방식인 아이패드와 전자칠판으</span><span>로 수업하고, 암기주입식보다는 내용을 파악하며 </span><span>질문하고 답변하는 수업으로 학생들에게 흥미를 더</span><span>한다는 평가를 받는다. </span></p><p><span>“지금껏 많은 학원들은 보</span><span>습과 진학, 1등과 SKY대상인 상위 10% 학생을 위</span><span>한 엘리트교육을 했다. </span></p><p><span>그러면 80%가 넘는 학생</span><span>들은 어쩔 수 없이 뒤처지곤 한다. </span></p><p><span>강사 입장에서</span><span>도 시험</span><span>과 점수 위주 수업을 준비해야 하고, 흥미</span><span>를 잃은 학생들이 책상에 엎</span><span>드려 시간을 때우는 것</span><span>을 보며 안타까웠다”는 곽 대표는 교육자로서 모두</span><span>가 이유를 알지만 어찌할 수 없었던 환경에 죄책감</span><span>을 느끼고, ‘AI와 딥러닝 시대를 맞아 더는 안 된다’</span><span>는 판단으로 가장 먼저 ‘아무도 졸지 않는 교실’을 </span><span>생각했다.</span></p><p><span> 그래서 삼성 HP/MS 경영진을 역임하고 </span><span>은퇴 후 디지털 교육에 관심을 보인 유승삼 고문의 </span><span>교육사업 컨설팅 과정에서, 서로 사회에  기여하자</span><span>는 교육관으로 힘을 모았다. </span></p><p><span>이들은 ㈜정율을 함께</span><span>이끌고 사교육의 디지털화, 데이터수집을 통해 공</span><span>부에 집중할 환경을 만들기 시작한다.</span></p><p><span>책상 배열과 </span><span>단차까지 다른 쿼드러닝 인터렉티브 강의실에 전자</span><span>칠판을 설치하고, 업계 최초로 종이책과 공책대신 </span><span>원내에서 구입한 아이패드를 학생들에게 5년 전부</span><span>터 저렴하게 대여하는 도전도 시작한 것이다.</span></p><p><span><br /></span></p></div><p><span></span></p><figure><img src="/api/admin/upload/2026/04/1776159821378-a51c6624.png" alt="image.png" /><figcaption>▲ 내부 전경 테스트</figcaption></figure>','column','교육칼럼','/api/admin/upload/2026/04/1776161274411-f7ec34d8.png','2026/04/14','테스트-질문과-ai-디지털-트랜스포밍-사교육에-재미-더하고-성적도-향상-c73ac23d',0,'2026-04-14T09:44:41.131Z','2026-04-15T10:45:42.676Z',1);
CREATE TABLE highlights (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  thumbnail TEXT DEFAULT '',
  slug TEXT UNIQUE NOT NULL
);
INSERT INTO "highlights" ("id","title","thumbnail","slug") VALUES('1','수능 전략','/images/highlight-suneung.jpg','suneung-strategy');
INSERT INTO "highlights" ("id","title","thumbnail","slug") VALUES('2','논술 가이드','/api/admin/upload/2026/04/1776412218410-1ea1f5ee.jpeg','essay-guide');
INSERT INTO "highlights" ("id","title","thumbnail","slug") VALUES('3','내신 관리','/images/highlight-gpa.jpg','gpa-management');
INSERT INTO "highlights" ("id","title","thumbnail","slug") VALUES('4','고교학점제','/images/highlight-credit.jpg','high-school-credit');
INSERT INTO "highlights" ("id","title","thumbnail","slug") VALUES('5','AI 교육','/images/highlight-ai.jpg','ai-education');
INSERT INTO "highlights" ("id","title","thumbnail","slug") VALUES('6','합격 수기','/images/highlight-success.jpg','success-stories');
INSERT INTO "highlights" ("id","title","thumbnail","slug") VALUES('7','학부모 가이드','/images/highlight-parents.jpg','parents-guide');
CREATE TABLE teachers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  photo TEXT DEFAULT '',
  slug TEXT UNIQUE NOT NULL
);
INSERT INTO "teachers" ("id","name","subject","photo","slug") VALUES('1','이지후','국어','','lee-jihu');
INSERT INTO "teachers" ("id","name","subject","photo","slug") VALUES('2','박서욱','국어','','park-seowook');
INSERT INTO "teachers" ("id","name","subject","photo","slug") VALUES('3','박지영','국어','','park-jiyoung');
INSERT INTO "teachers" ("id","name","subject","photo","slug") VALUES('4','황규훈','수학','','hwang-gyuhun');
INSERT INTO "teachers" ("id","name","subject","photo","slug") VALUES('5','김후엽','수학','','kim-huyeop');
INSERT INTO "teachers" ("id","name","subject","photo","slug") VALUES('6','조우제','수학','','cho-wooje');
INSERT INTO "teachers" ("id","name","subject","photo","slug") VALUES('7','최희성','수학','','choi-heesung');
INSERT INTO "teachers" ("id","name","subject","photo","slug") VALUES('8','권승호','영어','','kwon-seungho');
INSERT INTO "teachers" ("id","name","subject","photo","slug") VALUES('9','이성웅','영어','','lee-sungwoong');
INSERT INTO "teachers" ("id","name","subject","photo","slug") VALUES('10','박상혁','영어','','park-sanghyuk');
INSERT INTO "teachers" ("id","name","subject","photo","slug") VALUES('11','지성현','탐구','','ji-sunghyun');
INSERT INTO "teachers" ("id","name","subject","photo","slug") VALUES('12','신경호','컨설팅','','shin-kyungho');
CREATE TABLE videos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  youtube_id TEXT NOT NULL,
  thumbnail TEXT DEFAULT ''
, sort_order INTEGER DEFAULT 0);
INSERT INTO "videos" ("id","title","youtube_id","thumbnail","sort_order") VALUES('1','가천대·수원대 간호학과 합격 스토리','7usrDA98kL0','https://img.youtube.com/vi/7usrDA98kL0/hqdefault.jpg',1);
INSERT INTO "videos" ("id","title","youtube_id","thumbnail","sort_order") VALUES('2','수능 국영수 4개 등급 상승 인터뷰','iRJfhyeTPxw','https://img.youtube.com/vi/iRJfhyeTPxw/hqdefault.jpg',2);
INSERT INTO "videos" ("id","title","youtube_id","thumbnail","sort_order") VALUES('3','모의고사 4등급 → 수능 국어 1등급','ZylPxyd2x4A','https://img.youtube.com/vi/ZylPxyd2x4A/hqdefault.jpg',0);
CREATE TABLE admin (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL
);
INSERT INTO "admin" ("id","username","password_hash") VALUES(2,'admin','$2b$10$p5tXnTQF5yB048q51Pg.POTWy9p29JkfDmeUp2MFMDPoJdDmlUJk6');
CREATE TABLE site_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT);
INSERT INTO "site_settings" ("key","value","updated_at") VALUES('logo_url','/api/admin/upload/2026/04/1775718852728-f3dc0f82.png','2026-04-09T07:23:53.527Z');
INSERT INTO "site_settings" ("key","value","updated_at") VALUES('favicon_url','/api/admin/upload/favicon/favicon-32x32.png','2026-04-09T07:23:54.496Z');
CREATE TABLE `hero_slide_items` (
	`id` text PRIMARY KEY NOT NULL,
	`slide_id` text NOT NULL,
	`article_id` text NOT NULL,
	`role` text NOT NULL,
	`sort_order` integer DEFAULT 0
);
INSERT INTO "hero_slide_items" ("id","slide_id","article_id","role","sort_order") VALUES('57ed352a-f964-4df7-b708-ae47905768e6','97d3e922-b7f1-4e2e-8149-20cb4d0a89a5','9','main',0);
INSERT INTO "hero_slide_items" ("id","slide_id","article_id","role","sort_order") VALUES('9d736ff4-e667-4fef-b501-03fe9d029e37','97d3e922-b7f1-4e2e-8149-20cb4d0a89a5','1','sub-image',1);
INSERT INTO "hero_slide_items" ("id","slide_id","article_id","role","sort_order") VALUES('d5cebda3-bc7e-4c65-8e93-be1be0184d10','97d3e922-b7f1-4e2e-8149-20cb4d0a89a5','2','sub-text',2);
INSERT INTO "hero_slide_items" ("id","slide_id","article_id","role","sort_order") VALUES('8e727eff-b6d8-4fa7-babb-b67c6f470237','97d3e922-b7f1-4e2e-8149-20cb4d0a89a5','12','sub-text',3);
INSERT INTO "hero_slide_items" ("id","slide_id","article_id","role","sort_order") VALUES('e1edb9d5-5592-4019-9f54-dc442ad98dcc','e51ff64d-5e0a-4aea-ac66-672162d98c31','1','main',0);
INSERT INTO "hero_slide_items" ("id","slide_id","article_id","role","sort_order") VALUES('8a3d02a2-649b-4b35-94fe-3f10d21c7bbe','e51ff64d-5e0a-4aea-ac66-672162d98c31','3','sub-image',1);
INSERT INTO "hero_slide_items" ("id","slide_id","article_id","role","sort_order") VALUES('d02a99dd-3d8c-49dd-acd4-4fa441f989db','75fa902a-03c3-4b45-a963-08ebd1ec03b1','12','main',0);
CREATE TABLE `hero_slides` (
	`id` text PRIMARY KEY NOT NULL,
	`sort_order` integer DEFAULT 0,
	`created_at` text,
	`updated_at` text
);
INSERT INTO "hero_slides" ("id","sort_order","created_at","updated_at") VALUES('97d3e922-b7f1-4e2e-8149-20cb4d0a89a5',1,'2026-04-10T07:45:18.226Z','2026-04-10T07:46:16.254Z');
INSERT INTO "hero_slides" ("id","sort_order","created_at","updated_at") VALUES('e51ff64d-5e0a-4aea-ac66-672162d98c31',2,'2026-04-10T07:46:21.309Z','2026-04-10T07:46:32.175Z');
INSERT INTO "hero_slides" ("id","sort_order","created_at","updated_at") VALUES('75fa902a-03c3-4b45-a963-08ebd1ec03b1',0,'2026-04-10T07:46:34.879Z','2026-04-15T09:34:20.006Z');
CREATE TABLE `tracking_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`position` text NOT NULL,
	`enabled` integer DEFAULT true,
	`created_at` text
);
CREATE TABLE nav_menus (id text PRIMARY KEY NOT NULL, parent_id text, label text NOT NULL, href text NOT NULL, sort_order integer DEFAULT 0);
INSERT INTO "nav_menus" ("id","parent_id","label","href","sort_order") VALUES('71677ed3-89e6-436b-b3dd-99654fef55e2',NULL,'교육정보','/articles',1);
INSERT INTO "nav_menus" ("id","parent_id","label","href","sort_order") VALUES('0e3b90c2-21bd-4b94-b8bb-31f144089573','71677ed3-89e6-436b-b3dd-99654fef55e2','전체','/articles',0);
INSERT INTO "nav_menus" ("id","parent_id","label","href","sort_order") VALUES('f5fd750e-53a4-45ce-bbb2-40750cfab88a',NULL,'정율사관','/jungyoul',3);
INSERT INTO "nav_menus" ("id","parent_id","label","href","sort_order") VALUES('0ea6c048-889c-48a2-b244-8f7d2c358fbf','71677ed3-89e6-436b-b3dd-99654fef55e2','입시전략','/articles?category=strategy',1);
INSERT INTO "nav_menus" ("id","parent_id","label","href","sort_order") VALUES('6b94f929-3f70-43e9-9e2c-0a1b6c497d6c',NULL,'상담신청','/contact',4);
INSERT INTO "nav_menus" ("id","parent_id","label","href","sort_order") VALUES('f889db97-9af7-4533-a083-9d95bf5286c6','71677ed3-89e6-436b-b3dd-99654fef55e2','교육칼럼','/articles?category=column',2);
INSERT INTO "nav_menus" ("id","parent_id","label","href","sort_order") VALUES('70f5ca46-1285-4b34-adfc-86b1ed02ec96','71677ed3-89e6-436b-b3dd-99654fef55e2','합격스토리','/articles?category=success',3);
INSERT INTO "nav_menus" ("id","parent_id","label","href","sort_order") VALUES('f4271e22-ceee-4806-8dd0-4faf8cd37879','71677ed3-89e6-436b-b3dd-99654fef55e2','공지사항','/articles?category=news',4);
INSERT INTO "nav_menus" ("id","parent_id","label","href","sort_order") VALUES('9c13ccc4-acc6-4b5f-a613-ea250d017314','f5fd750e-53a4-45ce-bbb2-40750cfab88a','선생님','/teachers',0);
INSERT INTO "nav_menus" ("id","parent_id","label","href","sort_order") VALUES('b20e82bb-26f8-4318-9f82-a1802e832058','f5fd750e-53a4-45ce-bbb2-40750cfab88a','FAQ','/faq',1);
INSERT INTO "nav_menus" ("id","parent_id","label","href","sort_order") VALUES('c4170b7f-0e38-4ec4-be3d-3e9ccca5de1e','f5fd750e-53a4-45ce-bbb2-40750cfab88a','시험지 분석','/exam',2);
INSERT INTO "nav_menus" ("id","parent_id","label","href","sort_order") VALUES('ba85fee8-f41e-45bc-a1ee-13cc9cb4e69c','f5fd750e-53a4-45ce-bbb2-40750cfab88a','성장스토리','/story',3);
CREATE TABLE pinned_articles (slot INTEGER PRIMARY KEY NOT NULL, article_id TEXT NOT NULL);
INSERT INTO "pinned_articles" ("slot","article_id") VALUES(1,'54b5f1d8-360d-40d6-aa42-728684afdb9b');
INSERT INTO "pinned_articles" ("slot","article_id") VALUES(2,'3');
INSERT INTO "pinned_articles" ("slot","article_id") VALUES(3,'4');
INSERT INTO "pinned_articles" ("slot","article_id") VALUES(4,'10');
DELETE FROM sqlite_sequence;
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('admin',2);
CREATE UNIQUE INDEX idx_articles_pinned_order ON articles(pinned_order);
