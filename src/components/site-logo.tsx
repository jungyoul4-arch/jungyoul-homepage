"use client";

import { useState } from "react";
import Image from "next/image";
import { useAuth } from "./auth-provider";

const sizeMap = {
  sm: { box: "w-7 h-7", text: "text-xs", px: 28 },
  md: { box: "w-8 h-8", text: "text-sm", px: 32 },
  lg: { box: "w-12 h-12", text: "text-lg", px: 48 },
} as const;

interface SiteLogoProps {
  size: "sm" | "md" | "lg";
  className?: string;
}

function JYFallback({ size }: { size: "sm" | "md" | "lg" }) {
  const s = sizeMap[size];
  return (
    <div className={`${s.box} bg-brand-blue rounded-sm flex items-center justify-center`}>
      <span className={`text-white font-bold ${s.text}`}>JY</span>
    </div>
  );
}

export function SiteLogo({ size, className }: SiteLogoProps) {
  const { logoUrl } = useAuth();
  const [imgError, setImgError] = useState(false);

  if (!logoUrl || imgError) {
    return <JYFallback size={size} />;
  }

  const s = sizeMap[size];
  return (
    <Image
      src={logoUrl}
      alt="정율 교육정보"
      width={s.px}
      height={s.px}
      // 사용자 업로드 로고는 R2 (/api/admin/upload/*) 동적 URL 이라
      // Next 이미지 옵티마이저 캐시 키가 의미 없음 — 원본 그대로 표시.
      unoptimized
      className={`${s.box} rounded-sm object-contain ${className ?? ""}`}
      onError={() => setImgError(true)}
    />
  );
}
