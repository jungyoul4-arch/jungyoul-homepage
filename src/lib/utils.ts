import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * className 병합 + Tailwind 충돌 해결 (shadcn 컨벤션)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 제목 기반 슬러그 자동 생성
 * 한글/영문/숫자 유지, 공백→하이픈, 8자리 UUID 접미사로 유니크 보장
 */
export function generateSlug(title: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const suffix = crypto.randomUUID().slice(0, 8);
  return base ? `${base}-${suffix}` : suffix;
}

/**
 * 정렬된 배열에서 targetId 항목을 direction 방향으로 이웃 항목과 swap 한 새 배열 반환.
 * 이동 불가(경계, 없는 ID)인 경우 null 반환.
 */
export function swapById<T extends { id: string; sortOrder: number }>(
  items: T[],
  targetId: string,
  direction: -1 | 1,
): T[] | null {
  const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder);
  const idx = sorted.findIndex((s) => s.id === targetId);
  const swapIdx = idx + direction;
  if (idx === -1 || swapIdx < 0 || swapIdx >= sorted.length) return null;
  const reordered = [...sorted];
  [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
  return reordered;
}

/**
 * ID 기반 placeholder gradient 생성
 * 콘텐츠 타입별로 다른 색상 조합을 사용
 */
export function placeholderGradient(
  id: string,
  preset: "article" | "teacher" | "highlight" | "video" = "article"
): string {
  const n = parseInt(id) || 0;
  const presets = {
    article:   { m: 40, o: 200, s1: 40, l1: 70, s2: 50, l2: 50, gap: 20 },
    teacher:   { m: 25, o: 200, s1: 30, l1: 75, s2: 40, l2: 55, gap: 20 },
    highlight: { m: 50, o: 180, s1: 50, l1: 60, s2: 60, l2: 40, gap: 20 },
    video:     { m: 60, o: 0,   s1: 70, l1: 45, s2: 80, l2: 30, gap: 20 },
  };
  const p = presets[preset];
  const hue = n * p.m + p.o;
  return `linear-gradient(135deg, hsl(${hue}, ${p.s1}%, ${p.l1}%) 0%, hsl(${hue + p.gap}, ${p.s2}%, ${p.l2}%) 100%)`;
}
