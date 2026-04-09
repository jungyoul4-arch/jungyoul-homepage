"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  Star,
  Users,
  Video,
  LayoutDashboard,
  LogOut,
  Code,
  Settings,
} from "lucide-react";
import { SiteLogo } from "@/components/site-logo";

const sidebarItems = [
  { label: "대시보드", href: "/admin", icon: LayoutDashboard },
  { label: "기사 관리", href: "/admin/articles", icon: FileText },
  { label: "하이라이트", href: "/admin/highlights", icon: Star },
  { label: "강사 관리", href: "/admin/teachers", icon: Users },
  { label: "영상 관리", href: "/admin/videos", icon: Video },
  { label: "추적 코드", href: "/admin/tracking-codes", icon: Code },
  { label: "웹사이트 로고 설정", href: "/admin/settings", icon: Settings },
];

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

        <nav className="flex-1 py-4 px-3 space-y-1">
          {sidebarItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-600 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-gray-600 hover:bg-gray-100 w-full transition-colors"
          >
            <LogOut size={18} />
            로그아웃
          </button>
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-xs text-gray-400 hover:text-gray-600 transition-colors mt-1"
          >
            ← 사이트로 돌아가기
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-8">{children}</div>
      </main>
    </div>
  );
}
