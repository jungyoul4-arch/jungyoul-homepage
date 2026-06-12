import { categories } from "@/lib/data";

export interface NavMenuItem {
  id: string;
  parentId: string | null;
  label: string;
  href: string;
  sortOrder: number;
}

export interface NavGroup {
  parent: NavMenuItem;
  children: NavMenuItem[];
}

// 교육정보(헤더 드롭다운·/articles 탭·홈 최신 탭) 에서 숨길 카테고리.
// - "exam": 별도 라우트 /exam 으로 분리
// - "growth": 별도 라우트 /story (정율사관 → 성장스토리) 전용
export const EDUCATION_HIDDEN_CATEGORIES = new Set<string>(["exam", "growth"]);

// catch-all [slug] 인덱스/명시 라우트가 선점하는 slug 예약어.
// 자식 메뉴의 단일 세그먼트 href 를 "리프 카테고리"(예: /jstory = 학원소식)로 인정할 때
// 이 예약어와 겹치면 카테고리로 보지 않는다(명시 라우트 폴더 + 부모 인덱스 slug).
// 새 명시 라우트(src/app/(main)/<slug>) 추가 시 여기에도 등록한다.
export const RESERVED_ROUTE_SLUGS = new Set<string>([
  "about", "articles", "contact", "exam", "faq", "highlights",
  "location", "privacy", "story", "teachers", "terms",
  "jungyoul", "community", "admin", "p",
]);

// nav 항목 href 가 단일 세그먼트 경로(`/jstory` 등)이고 예약어가 아니면 그 slug 를 카테고리로 인정.
// `?category=` 쿼리도, 명시 라우트(/teachers)도, 부모 인덱스(/jungyoul)도 아닌 자식 "리프 카테고리".
export function extractLeafCategorySlug(href: string): string | null {
  const m = href.match(/^\/([a-z0-9-]+)$/);
  if (!m) return null;
  return RESERVED_ROUTE_SLUGS.has(m[1]) ? null : m[1];
}

const educationChildren: NavMenuItem[] = categories
  .filter((c) => !EDUCATION_HIDDEN_CATEGORIES.has(c.value))
  .map((c, i) => ({
    id: `f-edu-${c.value}`,
    parentId: "f-edu",
    label: c.label,
    href: c.value === "all" ? "/articles" : `/articles?category=${c.value}`,
    sortOrder: i,
  }));

export const DEFAULT_NAV: NavGroup[] = [
  {
    parent: { id: "f-edu", parentId: null, label: "교육정보", href: "/articles", sortOrder: 0 },
    children: educationChildren,
  },
  {
    parent: { id: "f-jy", parentId: null, label: "정율사관", href: "/jungyoul", sortOrder: 1 },
    children: [
      { id: "f-jy-teachers", parentId: "f-jy", label: "선생님", href: "/teachers", sortOrder: 0 },
      { id: "f-jy-faq", parentId: "f-jy", label: "FAQ", href: "/faq", sortOrder: 1 },
      { id: "f-jy-exam", parentId: "f-jy", label: "시험지 분석", href: "/exam", sortOrder: 2 },
      { id: "f-jy-success", parentId: "f-jy", label: "성장스토리", href: "/story", sortOrder: 3 },
    ],
  },
  { parent: { id: "f-teachers", parentId: null, label: "선생님", href: "/teachers", sortOrder: 2 }, children: [] },
  { parent: { id: "f-faq", parentId: null, label: "FAQ", href: "/faq", sortOrder: 3 }, children: [] },
  { parent: { id: "f-contact", parentId: null, label: "상담신청", href: "/contact", sortOrder: 4 }, children: [] },
];

export function getDefaultParentBySlug(slug: string): NavGroup | null {
  return DEFAULT_NAV.find((g) => g.parent.href === `/${slug}`) ?? null;
}

export function buildNavTree(items: NavMenuItem[]): NavGroup[] {
  const parents = items.filter((i) => !i.parentId);
  return parents.map((p) => ({
    parent: p,
    children: items.filter((c) => c.parentId === p.id),
  }));
}

export function extractCategorySlugsFromHrefs(hrefs: string[]): string[] {
  const set = new Set<string>();
  for (const href of hrefs) {
    const idx = href.indexOf("?");
    if (idx === -1) {
      // 쿼리 없는 단일 세그먼트 경로 → 리프 카테고리(예: /jstory)
      const leaf = extractLeafCategorySlug(href);
      if (leaf) set.add(leaf);
      continue;
    }
    const params = new URLSearchParams(href.slice(idx));
    const cat = params.get("category");
    if (cat) set.add(cat);
  }
  return Array.from(set);
}

// 카테고리 탭 1개(목록 페이지·홈 최신 탭·어드민 폼 옵션 공통 형태).
export interface CategoryTab {
  value: string;
  label: string;
}

// nav 항목(label+href)을 카테고리 탭 리스트로 변환(라벨·순서 보존, value 중복 제거).
// href 에 `?category=slug` 가 있으면 value=slug, 없으면(=bare /articles) value="all"(전체 탭).
export function extractCategoryTabsFromNavItems(
  items: { href: string; label: string }[],
): CategoryTab[] {
  const out: CategoryTab[] = [];
  const seen = new Set<string>();
  for (const it of items) {
    let value = "all";
    const idx = it.href.indexOf("?");
    if (idx !== -1) {
      const cat = new URLSearchParams(it.href.slice(idx)).get("category");
      if (cat) value = cat;
    }
    if (seen.has(value)) continue;
    seen.add(value);
    out.push({ value, label: it.label });
  }
  return out;
}

// 어드민 글/HTML 폼의 카테고리 옵션(label+value, "all" 제외).
// = data.ts 빌트인 ∪ nav_menus 의 `?category=` 항목(같은 slug 면 nav 라벨 우선).
export function mergeCategoryOptions(
  navItems: { href: string; label: string }[],
): CategoryTab[] {
  const map = new Map<string, string>();
  for (const c of categories) {
    if (c.value !== "all") map.set(c.value, c.label);
  }
  for (const it of navItems) {
    const idx = it.href.indexOf("?");
    if (idx === -1) {
      // 쿼리 없는 단일 세그먼트 경로 → 리프 카테고리(예: /jstory = "학원소식")
      const leaf = extractLeafCategorySlug(it.href);
      if (leaf) map.set(leaf, it.label);
      continue;
    }
    const cat = new URLSearchParams(it.href.slice(idx)).get("category");
    if (cat) map.set(cat, it.label);
  }
  return Array.from(map, ([value, label]) => ({ value, label }));
}

// 글/HTML 저장이 허용되는 카테고리 slug 집합.
// = data.ts 빌트인(=all 제외) ∪ nav_menus 전(全) 부모의 `?category=` slug.
export function mergeWritableCategorySlugs(navHrefs: string[]): string[] {
  const set = new Set<string>();
  for (const c of categories) {
    if (c.value !== "all") set.add(c.value);
  }
  for (const slug of extractCategorySlugsFromHrefs(navHrefs)) set.add(slug);
  return Array.from(set);
}
