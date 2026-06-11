"use client";

import { useEffect, useState } from "react";
import { categories } from "@/lib/data";

export interface CategoryOption {
  value: string;
  label: string;
}

// data.ts 빌트인 시드(초기 렌더 빈 깜빡임 방지). "all"(전체)은 폼 옵션에서 제외.
const SEED: CategoryOption[] = categories.filter((c) => c.value !== "all");

// 어드민 글/HTML 폼 카테고리 select 옵션. 마운트 시 /api/categories(nav_menus 주도)로 갱신.
// excludeExam: 히어로 슬라이드 빠른생성 등 exam 카테고리를 노출하지 않는 곳에서 true.
export function useCategoryOptions(opts?: { excludeExam?: boolean }): CategoryOption[] {
  const excludeExam = opts?.excludeExam ?? false;
  const [options, setOptions] = useState<CategoryOption[]>(SEED);

  useEffect(() => {
    let alive = true;
    fetch("/api/categories")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: CategoryOption[] | null) => {
        if (alive && Array.isArray(data) && data.length > 0) setOptions(data);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return excludeExam ? options.filter((c) => c.value !== "exam") : options;
}
