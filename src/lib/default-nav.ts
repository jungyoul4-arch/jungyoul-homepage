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

const educationChildren: NavMenuItem[] = categories
  .filter((c) => c.value !== "exam")
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
      { id: "f-jy-success", parentId: "f-jy", label: "성장스토리", href: "/articles?category=success", sortOrder: 3 },
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
