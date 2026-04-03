"use client";

import Link from "next/link";
import { useState } from "react";
import { Search, X, Menu, Lock, LayoutDashboard } from "lucide-react";
import { useAuth } from "./auth-provider";

const navItems = [
  { label: "교육정보", href: "/articles" },
  { label: "입시전략", href: "/articles?category=strategy" },
  { label: "교육칼럼", href: "/articles?category=column" },
  { label: "합격스토리", href: "/articles?category=success" },
  { label: "선생님", href: "/teachers" },
  { label: "FAQ", href: "/faq" },
  { label: "상담신청", href: "/contact" },
];

export function Header() {
  const { isAdmin } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      {/* Top bar — 삼성 뉴스룸 스타일 */}
      <div className="max-w-[1280px] mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-blue-600 rounded-sm flex items-center justify-center">
              <span className="text-white font-bold text-sm">JY</span>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-gray-900 leading-tight">
                정율 교육정보
              </span>
            </div>
          </Link>

          {/* Desktop Navigation — 삼성 뉴스룸과 동일한 수평 네비 */}
          <nav className="hidden lg:flex items-center gap-8">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="text-[15px] font-medium text-gray-700 hover:text-blue-600 transition-colors"
              >
                {item.label}
              </Link>
            ))}
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
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-full hover:bg-blue-700 transition-colors"
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

      {/* Search Panel — 삼성 뉴스룸 검색 패널 스타일 */}
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
                  className="w-full h-12 px-4 pr-12 border border-gray-300 rounded-sm text-[15px] focus:outline-none focus:border-blue-600"
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
                {[
                  { label: "수능전략", href: "/articles?category=strategy" },
                  { label: "논술", href: "/articles?category=strategy" },
                  { label: "내신관리", href: "/articles?category=strategy" },
                  { label: "고교학점제", href: "/articles?category=column" },
                  { label: "합격스토리", href: "/articles?category=success" },
                  { label: "AI교육", href: "/articles?category=column" },
                ].map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="px-3 py-1.5 bg-white border border-gray-200 rounded-sm text-sm text-gray-600 hover:border-blue-600 hover:text-blue-600 transition-colors"
                    >
                      {item.label}
                    </Link>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-200 bg-white">
          <nav className="max-w-[1280px] mx-auto px-4 py-4">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="block py-3 text-[15px] font-medium text-gray-700 border-b border-gray-100 last:border-0"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
