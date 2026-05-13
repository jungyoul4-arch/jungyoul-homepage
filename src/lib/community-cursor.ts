// 무한 스크롤 cursor 인코딩. (createdAt, id) 페어로 안정적 페이지네이션 보장.
// base64url 의 단순한 `createdAt|id` 인코딩 — id 가 UUID 이므로 동률 안전.

export function encodeCursor(createdAt: string, id: string): string {
  return btoa(`${createdAt}|${id}`).replace(/=+$/, "");
}

export function decodeCursor(cursor: string | null): { createdAt: string; id: string } | null {
  if (!cursor) return null;
  try {
    const raw = atob(cursor);
    const [createdAt, id] = raw.split("|");
    if (!createdAt || !id) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}
