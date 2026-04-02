import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-[#1a1a1a] text-gray-400">
      {/* Press Tools — 삼성 뉴스룸 하단 도구 영역 스타일 */}
      <div className="border-b border-gray-700">
        <div className="max-w-[1280px] mx-auto px-4 py-8">
          <h3 className="text-white text-sm font-bold mb-4">교육 도구</h3>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <Link
              href="/contact"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              상담신청
            </Link>
            <span className="text-gray-600 hidden sm:inline">|</span>
            <Link
              href="/seminars"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              설명회 안내
            </Link>
            <span className="text-gray-600 hidden sm:inline">|</span>
            <Link
              href="/teachers"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              선생님 소개
            </Link>
            <span className="text-gray-600 hidden sm:inline">|</span>
            <Link
              href="/tuition"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              교습비 안내
            </Link>
            <span className="text-gray-600 hidden sm:inline">|</span>
            <Link
              href="/location"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              찾아오는 길
            </Link>
            <span className="text-gray-600 hidden sm:inline">|</span>
            <a
              href="https://www.youtube.com/@jungyoulTV"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              정율TV
            </a>
          </div>
        </div>
      </div>

      {/* Footer Bottom */}
      <div className="max-w-[1280px] mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          {/* Company Info */}
          <div className="space-y-2">
            <p className="text-white font-bold text-sm">주식회사정율</p>
            <div className="text-xs leading-relaxed space-y-1">
              <p>대표이사: 곽정율</p>
              <p>주소: 경기도 부천시 원미구 길주로91 601호(비잔티움 6층)</p>
              <p>사업자등록번호: 392-88-00208 | 통신판매업: 제2023-경기부천-4355호</p>
              <p>학원설립·운영등록번호: 제5042호</p>
              <p>고객센터: 032-321-9937 | 이메일: jungyoul3@naver.com</p>
            </div>
          </div>

          {/* SNS Links — 삼성 뉴스룸 하단 SNS 아이콘 스타일 */}
          <div className="flex items-center gap-4">
            <a
              href="https://www.instagram.com/jysk_official/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-600 transition-colors"
              aria-label="Instagram"
            >
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </a>
            <a
              href="https://blog.naver.com/jungyoul_edu"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-600 transition-colors"
              aria-label="네이버 블로그"
            >
              <span className="text-white text-xs font-bold">N</span>
            </a>
            <a
              href="http://pf.kakao.com/_xiqxhxlxb"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-600 transition-colors"
              aria-label="카카오톡"
            >
              <span className="text-white text-xs font-bold">K</span>
            </a>
            <a
              href="https://www.youtube.com/@jungyoulTV"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-600 transition-colors"
              aria-label="YouTube"
            >
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </a>
          </div>
        </div>

        {/* Bottom Links */}
        <div className="mt-8 pt-6 border-t border-gray-700 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-wrap gap-4 text-xs">
            <Link href="/about" className="hover:text-white transition-colors">
              회사소개
            </Link>
            <Link href="/privacy" className="hover:text-white transition-colors font-bold">
              개인정보처리방침
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
              이용약관
            </Link>
            <Link href="/csr" className="hover:text-white transition-colors">
              사회공헌
            </Link>
          </div>
          <p className="text-xs">
            Copyright &copy; {new Date().getFullYear()} Jungyoul Co., Ltd. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
