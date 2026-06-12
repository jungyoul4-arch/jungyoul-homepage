import { MessageCircle } from "lucide-react";

// 메인 사이트 우하단 고정 카카오톡 상담 버튼. 2028 대학입시 개편 페이지의 `.fab` 패턴 차용.
// 순수 <a> 링크(카카오 SDK 미사용) — (main) 레이아웃에서만 노출, /community 에는 미노출.
// 카카오 옐로(#FEE500)는 브랜드 팔레트가 아니므로 footer SNS 버튼과 동일하게 arbitrary 색상 허용.
export function KakaoFab({ url }: { url: string }) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="카카오톡 상담"
      className="fixed right-4 bottom-4 z-[60] inline-flex items-center gap-2 bg-[#FEE500] text-[#3a1d1d] font-bold text-sm px-4 py-3 rounded-full shadow-lg hover:brightness-95 transition-all"
    >
      <MessageCircle size={18} className="fill-current" />
      <span>카카오톡 상담</span>
    </a>
  );
}
