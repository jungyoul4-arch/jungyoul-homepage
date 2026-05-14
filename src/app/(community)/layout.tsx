import Link from "next/link";
import { Pencil } from "lucide-react";
import { SiteLogo } from "@/components/site-logo";
import { CommunityFooterSocial } from "@/components/community/community-footer-social";

export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const year = new Date().getFullYear();
  return (
    <>
      <header className="sticky top-0 z-[999] bg-white border-b border-border-light">
        <div className="max-w-[1080px] mx-auto px-4 lg:px-10 h-14 flex items-center justify-between">
          <Link href="/community" className="flex items-center gap-2">
            <SiteLogo size="sm" />
            <span className="text-base font-bold text-text-primary">커뮤니티</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/community/new"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-community-accent text-white text-xs font-medium rounded-md hover:opacity-90"
            >
              <Pencil size={14} />
              글쓰기
            </Link>
            <Link
              href="/"
              className="text-xs text-text-secondary hover:text-text-primary transition-colors"
            >
              메인 ←
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-white border-t border-border-light">
        <div className="max-w-[1080px] mx-auto px-4 lg:px-10 py-8 flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div className="text-[0.8125rem] text-text-secondary leading-relaxed space-y-0.5">
            <p>주식회사정율 | 대표이사: 곽정율</p>
            <p>경기도 부천시 원미구 길주로91 601호(비잔티움 6층)</p>
            <p>사업자등록번호: 392-88-00208 · 학원등록번호: 제5042호</p>
            <p>고객센터: 032-321-9937 · 이메일: jungyoul3@naver.com</p>
            <p className="pt-1">© {year} Jungyoul Co., Ltd.</p>
          </div>
          <CommunityFooterSocial />
        </div>
      </footer>
    </>
  );
}
