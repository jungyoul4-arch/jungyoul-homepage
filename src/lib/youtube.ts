// 유튜브 URL → 11자 영상 ID 추출 공유 헬퍼.
// 정규식은 content-editor.tsx 의 parseVideoUrl 과 동일 패턴(watch?v= / youtu.be/ / embed/ / shorts/).
// 액자 어드민 폼이 전체 URL 입력을 받아 ID 만 추출/저장하는 데 사용한다.

const YOUTUBE_ID_RE =
  /(?:youtube\.com\/watch\?.*v=|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

/**
 * 유튜브 URL 에서 11자 영상 ID 를 추출한다.
 * - 정규 URL(watch?v=, youtu.be/, embed/, shorts/) 매칭
 * - 입력 자체가 이미 11자 ID 형태이면 그대로 반환
 * - 매칭 실패 시 null
 */
export function parseYouTubeId(input: string): string | null {
  const trimmed = (input ?? "").trim();
  if (!trimmed) return null;

  const match = trimmed.match(YOUTUBE_ID_RE);
  if (match) return match[1];

  // 사용자가 ID 만 붙여넣은 경우 허용
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

  return null;
}

/** 11자 유튜브 ID 형식 여부 */
export function isYouTubeId(value: string | null | undefined): boolean {
  return /^[a-zA-Z0-9_-]{11}$/.test(value ?? "");
}
