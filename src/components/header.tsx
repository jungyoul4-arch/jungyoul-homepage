"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Search, X, Menu, Lock, LayoutDashboard, ChevronDown } from "lucide-react";
// ChevronDown: 모바일 메뉴에서만 사용
import { useAuth } from "./auth-provider";
import { SiteLogo } from "./site-logo";

/* ── 타입 ── */
interface NavMenuItem {
  id: string;
  parentId: string | null;
  label: string;
  href: string;
  sortOrder: number;
}

interface NavGroup {
  parent: NavMenuItem;
  children: NavMenuItem[];
}

/* ── 하드코딩 폴백 (DB 데이터 없을 때) ── */
const fallbackNavItems: NavGroup[] = [
  {
    parent: { id: "f1", parentId: null, label: "교육정보", href: "/articles", sortOrder: 0 },
    children: [
      { id: "f1a", parentId: "f1", label: "전체", href: "/articles", sortOrder: 0 },
      { id: "f1b", parentId: "f1", label: "입시전략", href: "/articles?category=strategy", sortOrder: 1 },
      { id: "f1c", parentId: "f1", label: "교육칼럼", href: "/articles?category=column", sortOrder: 2 },
      { id: "f1d", parentId: "f1", label: "합격스토리", href: "/articles?category=success", sortOrder: 3 },
      { id: "f1e", parentId: "f1", label: "공지사항", href: "/articles?category=news", sortOrder: 4 },
    ],
  },
  { parent: { id: "f2", parentId: null, label: "선생님", href: "/teachers", sortOrder: 1 }, children: [] },
  { parent: { id: "f3", parentId: null, label: "FAQ", href: "/faq", sortOrder: 2 }, children: [] },
  { parent: { id: "f4", parentId: null, label: "상담신청", href: "/contact", sortOrder: 3 }, children: [] },
];

function buildNavTree(items: NavMenuItem[]): NavGroup[] {
  const parents = items.filter((i) => !i.parentId);
  return parents.map((p) => ({
    parent: p,
    children: items.filter((c) => c.parentId === p.id),
  }));
}

/* ── 검색 추천 검색어 ── */
const searchSuggestions = [
  { label: "수능전략", href: "/articles?category=strategy" },
  { label: "논술", href: "/articles?category=strategy" },
  { label: "내신관리", href: "/articles?category=strategy" },
  { label: "고교학점제", href: "/articles?category=column" },
  { label: "합격스토리", href: "/articles?category=success" },
  { label: "AI교육", href: "/articles?category=column" },
];

export function Header() {
  const { isAdmin } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [navGroups, setNavGroups] = useState<NavGroup[]>(fallbackNavItems);
  const [mobileSubmenu, setMobileSubmenu] = useState<string | null>(null);
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);
  const hoveredGroup = navGroups.find((g) => g.parent.id === hoveredNav);
  const showMegaMenu = !!hoveredGroup && hoveredGroup.children.length > 0;

  // DB에서 메뉴 데이터 로드
  useEffect(() => {
    let cancelled = false;
    fetch("/api/nav-menus")
      .then((res) => res.json())
      .then((data: NavMenuItem[]) => {
        if (!cancelled && data.length > 0) {
          setNavGroups(buildNavTree(data));
        }
      })
      .catch(() => {
        // 네트워크 에러 시 폴백 유지
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <header
      className="sticky top-0 z-50 bg-white border-b border-gray-200 relative"
      onMouseLeave={() => setHoveredNav(null)}
    >
      {/* Top bar */}
      <div className="max-w-[1280px] mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <SiteLogo size="md" />
            <div className="flex flex-col">
              <span className="text-[1.125rem] font-bold text-[#1A1A1A] leading-6">
                정율 교육정보
              </span>
            </div>
          </Link>

          {/* Desktop Navigation — 상위 카테고리 링크 + 메가메뉴 (nav 기준 정렬) */}
          <nav className="hidden lg:flex items-center gap-8 relative">
            {navGroups.map((group) => (
              <Link
                key={group.parent.id}
                href={group.parent.href}
                className="relative text-[1.125rem] font-bold text-[#1A1A1A] hover:text-[#1E64FA] transition-colors py-5"
                onMouseEnter={() => setHoveredNav(group.parent.id)}
              >
                {group.parent.label}
                <span
                  className={`absolute bottom-0 left-0 right-0 h-[3px] bg-[#1E64FA] transition-opacity duration-200 ${
                    hoveredNav === group.parent.id ? "opacity-100" : "opacity-0"
                  }`}
                />
              </Link>
            ))}

            {/* 하위 메뉴: 호버된 그룹의 children만 표시 */}
            {showMegaMenu && (
              <div className="absolute top-full left-0 py-6 z-10">
                {hoveredGroup!.children.map((child) => (
                  <Link
                    key={child.id}
                    href={child.href}
                    className="block py-1.5 text-[0.9375rem] text-[#666666] hover:text-[#1E64FA] transition-colors whitespace-nowrap"
                  >
                    {child.label}
                  </Link>
                ))}
              </div>
            )}
          </nav>

          {/* Search + Admin + Mobile Menu */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="검색"
            >
              {searchOpen ? <X size={20} /> : <Search size={20} />}
            </button>
            {isAdmin ? (
              <Link
                href="/admin"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1E64FA] text-white text-xs font-medium rounded-full hover:bg-[#0E41AD] transition-colors"
                aria-label="관리자 대시보드"
              >
                <LayoutDashboard size={14} />
                <span className="hidden sm:inline">관리자</span>
              </Link>
            ) : (
              <Link
                href="/admin"
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="관리자 로그인"
              >
                <Lock size={18} className="text-gray-500" />
              </Link>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="메뉴"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* 풀와이드 메가메뉴 배경 — header 기준 absolute, 하위 메뉴 영역 커버 */}
      {showMegaMenu && (
        <div className="hidden lg:block border-t border-gray-200 bg-white shadow-md">
          <div className="py-6">
            {hoveredGroup!.children.map((child) => (
              <div key={`bg-${child.id}`} className="py-1.5 text-[0.9375rem] invisible">
                {child.label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search Panel */}
      {searchOpen && (
        <div className="border-t border-gray-200 bg-gray-50">
          <div className="max-w-[1280px] mx-auto px-4 py-6">
            <div className="flex items-center gap-3 max-w-2xl mx-auto">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="검색어를 입력하세요"
                  className="w-full h-12 px-4 pr-12 border border-gray-300 rounded-sm text-[15px] focus:outline-none focus:border-[#1E64FA]"
                  autoFocus
                />
                <button className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Search size={20} className="text-gray-400" />
                </button>
              </div>
            </div>
            <div className="mt-4 max-w-2xl mx-auto">
              <p className="text-xs text-gray-500 mb-2">추천 검색어</p>
              <div className="flex flex-wrap gap-2">
                {searchSuggestions.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-sm text-sm text-gray-600 hover:border-[#1E64FA] hover:text-[#1E64FA] transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Menu — 아코디언 스타일 */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-200 bg-white">
          <nav className="max-w-[1280px] mx-auto px-4 py-4">
            {navGroups.map((group) => (
              <div key={group.parent.id} className="border-b border-gray-100 last:border-0">
                {group.children.length > 0 ? (
                  <>
                    <button
                      onClick={() =>
                        setMobileSubmenu(
                          mobileSubmenu === group.parent.id ? null : group.parent.id
                        )
                      }
                      className="flex items-center justify-between w-full py-3 text-[1.125rem] font-bold text-[#1A1A1A]"
                    >
                      {group.parent.label}
                      <ChevronDown
                        size={16}
                        className={`text-gray-400 transition-transform duration-200 ${
                          mobileSubmenu === group.parent.id ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {mobileSubmenu === group.parent.id && (
                      <div className="pl-4 pb-3 space-y-1">
                        {group.children.map((child) => (
                          <Link
                            key={child.id}
                            href={child.href}
                            className="block py-2 text-[1rem] text-[#666666] hover:text-[#1E64FA]"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    href={group.parent.href}
                    className="block py-3 text-[1.125rem] font-bold text-[#1A1A1A]"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {group.parent.label}
                  </Link>
                )}
              </div>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
