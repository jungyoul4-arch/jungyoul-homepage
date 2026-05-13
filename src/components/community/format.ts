// 커뮤니티 카드/상세 공통 포맷터.

// "방금 전" / "3분 전" / "2시간 전" / "어제" / "2026-05-13" 형식.
export function formatRelativeTime(iso: string): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "방금 전";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day === 1) return "어제";
  if (day < 7) return `${day}일 전`;
  // 7일 이상은 절대 날짜
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// 닉네임 → 안정적인 hue. 같은 닉네임은 항상 같은 색.
// 후속 디자인 작업에서 색상을 바꿀 때는 community-* 토큰 4종을 손볼 것.
export function nicknameHue(nickname: string): number {
  let h = 0;
  for (let i = 0; i < nickname.length; i++) h = (h * 31 + nickname.charCodeAt(i)) % 360;
  return h;
}
