"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Highlight } from "@/lib/data";
import { AdminEditButton } from "./admin-edit-button";
import { isValidThumbnail, thumbSrc } from "@/lib/thumbnail";
import { placeholderGradient } from "@/lib/utils";

// 하이라이트 카드(썸네일 16:9 + 제목). 캐러셀(가로 스크롤)과 /highlights 목록(그리드)이 공유.
// 너비/마진은 부모가 지정 — 카드 자체는 relative(어드민 버튼 기준)만 갖는다.
// linkUrl 이 있으면 그 링크로(외부는 새 탭), 없으면 /highlights/{slug} 상세로 이동.
export function HighlightCard({ item }: { item: Highlight }) {
  const [failed, setFailed] = useState(false);
  const href = item.linkUrl || `/highlights/${item.slug}`;
  const isExternal = /^https?:\/\//i.test(href);

  const inner = (
    <>
      {/* Image — 16:9, rounded-lg */}
      <div className="relative aspect-video bg-gray-200 overflow-hidden rounded-lg">
        <div
          className="absolute inset-0"
          style={{ background: placeholderGradient(item.id, "highlight") }}
        />
        {isValidThumbnail(item.thumbnail) && !failed && (
          <Image
            src={thumbSrc(item.thumbnail, 1280)}
            alt={item.title}
            fill
            unoptimized
            className="object-cover group-hover:will-change-transform transition-transform duration-300 ease-in-out group-hover:scale-110"
            onError={() => setFailed(true)}
          />
        )}
      </div>
      {/* Title — 이미지 아래 (삼성 뉴스룸 패턴) */}
      <p className="py-5 max-[670px]:py-3 text-[1.375rem] max-[670px]:text-base font-bold text-text-primary leading-7 tracking-[-0.041rem] truncate">
        {item.title}
      </p>
    </>
  );

  return (
    <div className="relative">
      <div className="absolute top-2 right-2 z-10">
        <AdminEditButton type="highlight" data={item} />
      </div>
      {isExternal ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="group block">
          {inner}
        </a>
      ) : (
        <Link href={href} className="group block">
          {inner}
        </Link>
      )}
    </div>
  );
}
