import Link from "next/link";
import { CommunityFooterSocial } from "./community/community-footer-social";

export function Footer() {
  return (
    <footer className="bg-white border-t border-border-light">
      {/* 상단: 법적 링크 + 로고 */}
      <div className="max-w-[1480px] mx-auto px-4 lg:px-10 pt-10 pb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* 로고/회사명 */}
          <span className="text-[1rem] font-bold text-text-primary">
            정율 교육정보
          </span>

          {/* 법적 링크 — 삼성 뉴스룸 상단 우측 스타일 */}
          <div className="flex flex-wrap items-center gap-5 text-[0.875rem] font-bold text-text-primary">
            <Link href="/faq" className="hover:text-brand-blue transition-colors">
              자주 묻는 질문
            </Link>
            <Link href="/about" className="hover:text-brand-blue transition-colors">
              회사소개
            </Link>
            <Link href="/privacy" className="hover:text-brand-blue transition-colors">
              개인정보처리방침
            </Link>
            <Link href="/terms" className="hover:text-brand-blue transition-colors">
              이용약관
            </Link>
          </div>
        </div>
      </div>

      {/* 중단: 회사정보 + 저작권 */}
      <div className="max-w-[1480px] mx-auto px-4 lg:px-10 pb-6">
        <div className="text-[0.875rem] text-text-secondary leading-relaxed space-y-1">
          <p>주식회사정율 | 대표이사: 곽정율</p>
          <p>경기도 부천시 원미구 길주로91 601호(비잔티움 6층)</p>
          <p>
            사업자등록번호: 392-88-00208
            <span className="inline-block w-px h-3 bg-border-light mx-2 align-middle" />
            학원등록번호: 제5042호
          </p>
          <p>
            고객센터: 032-321-9937
            <span className="inline-block w-px h-3 bg-border-light mx-2 align-middle" />
            이메일: jungyoul3@naver.com
          </p>
        </div>
      </div>

      {/* 하단: SNS + 저작권 */}
      <div className="max-w-[1480px] mx-auto px-4 lg:px-10 pb-12">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-6 border-t border-border-light">
          <CommunityFooterSocial />
          <p className="text-[0.875rem] text-text-secondary">
            Copyright &copy; {new Date().getFullYear()} Jungyoul Co., Ltd. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
