"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Star, Users, Video, Code } from "lucide-react";

interface Stats {
  articles: number;
  highlights: number;
  teachers: number;
  videos: number;
  trackingCodes: number;
}

const cards = [
  { key: "articles" as const, label: "기사", icon: FileText, href: "/admin/articles", color: "blue" },
  { key: "highlights" as const, label: "하이라이트", icon: Star, href: "/admin/highlights", color: "amber" },
  { key: "teachers" as const, label: "강사", icon: Users, href: "/admin/teachers", color: "green" },
  { key: "videos" as const, label: "영상", icon: Video, href: "/admin/videos", color: "purple" },
  { key: "trackingCodes" as const, label: "추적 코드", icon: Code, href: "/admin/tracking-codes", color: "red" },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ articles: 0, highlights: 0, teachers: 0, videos: 0, trackingCodes: 0 });
  const [error, setError] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [a, h, t, v, tc] = await Promise.all([
          fetch("/api/articles").then((r) => r.json()),
          fetch("/api/highlights").then((r) => r.json()),
          fetch("/api/teachers").then((r) => r.json()),
          fetch("/api/videos").then((r) => r.json()),
          fetch("/api/tracking-codes").then((r) => r.json()),
        ]);
        setStats({
          articles: a.length,
          highlights: h.length,
          teachers: t.length,
          videos: v.length,
          trackingCodes: tc.length,
        });
      } catch {
        setError(true);
      }
    }
    load();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">대시보드</h1>
      {error && <p className="text-red-500 text-sm mb-4">데이터를 불러오지 못했습니다.</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Link
            key={card.key}
            href={card.href}
            className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <card.icon size={20} className="text-gray-400" />
              <span className="text-2xl font-bold text-gray-900">
                {stats[card.key]}
              </span>
            </div>
            <p className="text-sm text-gray-600">{card.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
