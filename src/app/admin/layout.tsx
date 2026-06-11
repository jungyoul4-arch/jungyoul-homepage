"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  FileCode,
  Star,
  Users,
  Video,
  LayoutDashboard,
  LogOut,
  Code,
  Settings,
  Layers,
  Navigation,
  Pin,
  ExternalLink,
  Tags,
  MessageSquare,
  Tag,
  Frame,
} from "lucide-react";
import { SiteLogo } from "@/components/site-logo";

const dashboardItem = {
  label: "대시보드",
  href: "/admin",
  icon: LayoutDashboard,
};

const sidebarGroups = [
  {
    label: "콘텐츠 관리",
    items: [
      { label: "기사 관리", href: "/admin/articles", icon: FileText },
      { label: "HTML 페이지", href: "/admin/html-pages", icon: FileCode },
      { label: "슬라이드 관리", href: "/admin/slides", icon: Layers },
      { label: "메인 고정 기사", href: "/admin/pinned-articles", icon: Pin },
      { label: "하이라이트", href: "/admin/highlights", icon: Star },
      { label: "강사 관리", href: "/admin/teachers", icon: Users },
      { label: "영상 관리", href: "/admin/videos", icon: Video },
      { label: "액자", href: "/admin/picture-frames", icon: Frame },
    ],
  },
  {
    label: "사이트 구조",
    items: [
      { label: "메뉴 관리", href: "/admin/nav-menus", icon: Navigation },
      { label: "헤더 링크 버튼", href: "/admin/header-links", icon: ExternalLink },
    ],
  },
  {
    label: "커뮤니티",
    items: [
      { label: "게시글 모더레이션", href: "/admin/community/posts", icon: MessageSquare },
      { label: "커뮤니티 태그", href: "/admin/community/tags", icon: Tag },
    ],
  },
  {
    label: "설정",
    items: [
      { label: "시험 태그 옵션", href: "/admin/exam-tag-options", icon: Tags },
      { label: "추적 코드", href: "/admin/tracking-codes", icon: Code },
      { label: "웹사이트 로고 설정", href: "/admin/settings", icon: Settings },
    ],
  },
];

type SidebarItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
};

function SidebarLink({
  item,
  pathname,
}: {
  item: SidebarItem;
  pathname: string;
}) {
  const isActive =
    pathname === item.href ||
    (item.href !== "/admin" && pathname.startsWith(item.href));
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
        isActive
          ? "bg-blue-50 text-blue-600 font-medium"
          : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      <Icon size={18} />
      {item.label}
    </Link>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // 로그인 페이지는 사이드바 없이 렌더링
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="h-16 flex items-center px-5 border-b border-gray-200">
          <Link href="/admin" className="flex items-center gap-2">
            <SiteLogo size="sm" />
            <span className="font-bold text-gray-900 text-sm">관리자</span>
          </Link>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-4 overflow-y-auto">
          <SidebarLink item={dashboardItem} pathname={pathname} />

          {sidebarGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              <div className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                {group.label}
              </div>
              {group.items.map((item) => (
                <SidebarLink
                  key={item.href}
                  item={item}
                  pathname={pathname}
                />
              ))}
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-gray-600 hover:bg-gray-100 w-full transition-colors"
          >
            <LogOut size={18} />
            로그아웃
          </button>
          {/* 어드민 ↔ 공개 사이트 전환은 풀 리로드로 처리 — 클라이언트 라우터의 프리페치된
              RSC payload(어드민 nav_menus 변경 전 스냅샷)를 우회해 헤더가 즉시 최신 상태를 반영. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-xs text-gray-400 hover:text-gray-600 transition-colors mt-1"
          >
            ← 사이트로 돌아가기
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-8">{children}</div>
      </main>
    </div>
  );
}
