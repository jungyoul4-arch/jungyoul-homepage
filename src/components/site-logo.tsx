"use client";

import { useState } from "react";
import { useAuth } from "./auth-provider";

const sizeMap = {
  sm: { box: "w-7 h-7", text: "text-xs" },
  md: { box: "w-8 h-8", text: "text-sm" },
  lg: { box: "w-12 h-12", text: "text-lg" },
} as const;

interface SiteLogoProps {
  size: "sm" | "md" | "lg";
  className?: string;
}

function JYFallback({ size }: { size: "sm" | "md" | "lg" }) {
  const s = sizeMap[size];
  return (
    <div className={`${s.box} bg-blue-600 rounded-sm flex items-center justify-center`}>
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
    <img
      src={logoUrl}
      alt="정율 교육정보"
      className={`${s.box} rounded-sm object-contain ${className ?? ""}`}
      onError={() => setImgError(true)}
    />
  );
}
