import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
