import { describe, it, expect } from "vitest";
import {
  extractCategoryTabsFromNavItems,
  mergeCategoryOptions,
  mergeWritableCategorySlugs,
} from "../default-nav";

// 어드민이 /admin/nav-menus 에서 교육정보(/articles) 하위에 등록한 카테고리 행 예시.
// "설명회"(session) 는 data.ts 빌트인에 없는, 어드민이 새로 추가한 카테고리.
const navChildren = [
  { href: "/articles", label: "전체" },
  { href: "/articles?category=strategy", label: "입시전략" },
  { href: "/articles?category=column", label: "교육칼럼" },
  { href: "/articles?category=session", label: "설명회" },
];

describe("extractCategoryTabsFromNavItems — /articles 인-페이지 탭", () => {
  it("nav 라벨·순서를 보존하고 bare /articles 는 'all' 탭이 된다", () => {
    expect(extractCategoryTabsFromNavItems(navChildren)).toEqual([
      { value: "all", label: "전체" },
      { value: "strategy", label: "입시전략" },
      { value: "column", label: "교육칼럼" },
      { value: "session", label: "설명회" },
    ]);
  });

  it("어드민이 추가한 신규 카테고리(session) 탭이 포함된다 — 버그의 핵심", () => {
    const tabs = extractCategoryTabsFromNavItems(navChildren);
    expect(tabs.some((t) => t.value === "session")).toBe(true);
  });

  it("같은 value 는 중복 제거된다", () => {
    const dup = [
      { href: "/articles", label: "전체" },
      { href: "/articles?category=strategy", label: "입시전략" },
      { href: "/articles?category=strategy", label: "중복" },
    ];
    expect(extractCategoryTabsFromNavItems(dup)).toEqual([
      { value: "all", label: "전체" },
      { value: "strategy", label: "입시전략" },
    ]);
  });

  it("빈 입력은 빈 배열", () => {
    expect(extractCategoryTabsFromNavItems([])).toEqual([]);
  });
});

describe("mergeCategoryOptions — 어드민 폼 카테고리 옵션", () => {
  it("빌트인에 nav 신규 카테고리(session)를 합치고 'all' 은 제외한다", () => {
    const opts = mergeCategoryOptions(navChildren);
    expect(opts.some((o) => o.value === "all")).toBe(false);
    expect(opts).toContainEqual({ value: "session", label: "설명회" });
    // 빌트인도 유지
    expect(opts).toContainEqual({ value: "news", label: "공지사항" });
  });

  it("같은 slug 는 nav 라벨이 빌트인 라벨을 덮어쓴다", () => {
    const opts = mergeCategoryOptions([
      { href: "/articles?category=strategy", label: "입시전략(개편)" },
    ]);
    const strategy = opts.find((o) => o.value === "strategy");
    expect(strategy?.label).toBe("입시전략(개편)");
  });
});

describe("mergeWritableCategorySlugs — 저장 허용 slug 집합", () => {
  it("빌트인 6종 + nav 신규(session)를 모두 허용한다", () => {
    const slugs = mergeWritableCategorySlugs(navChildren.map((c) => c.href));
    for (const builtin of ["strategy", "column", "success", "news", "exam", "growth"]) {
      expect(slugs).toContain(builtin);
    }
    expect(slugs).toContain("session"); // 신규 카테고리로 글 저장 허용
    expect(slugs).not.toContain("all");
  });

  it("nav 가 비어도 빌트인은 허용된다(폴백)", () => {
    const slugs = mergeWritableCategorySlugs([]);
    expect(slugs).toContain("strategy");
    expect(slugs).not.toContain("session");
  });
});
