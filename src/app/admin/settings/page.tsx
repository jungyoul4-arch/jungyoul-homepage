"use client";

import { useEffect, useState } from "react";
import { ThumbnailUploader } from "@/components/thumbnail-uploader";

export default function AdminSettingsPage() {
  const [logoUrl, setLogoUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((data) => {
        setLogoUrl(data.logo_url ?? "");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "logo_url", value: logoUrl }),
      });
      if (!res.ok) {
        const data = await res.json();
        setMessage(data.error || "저장에 실패했습니다.");
        return;
      }
      setMessage("저장되었습니다.");
    } catch {
      setMessage("서버와 통신할 수 없습니다.");
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setLogoUrl("");
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">사이트 설정</h1>
        <p className="text-sm text-gray-500">불러오는 중...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">사이트 설정</h1>

      <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-lg">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">
          사이트 로고
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          헤더, 관리자 페이지, 브라우저 탭 아이콘에 표시됩니다. 정사각형 PNG
          이미지를 권장합니다.
        </p>

        <div className="max-w-[200px]">
          <ThumbnailUploader value={logoUrl} onChange={setLogoUrl} />
        </div>

        {!logoUrl && (
          <p className="text-xs text-gray-400 mt-2">
            로고가 설정되지 않으면 기본 JY 아이콘이 표시됩니다.
          </p>
        )}

        {message && (
          <p
            className={`text-sm mt-4 ${
              message === "저장되었습니다."
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            {message}
          </p>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? "저장 중..." : "저장"}
          </button>
          {logoUrl && (
            <button
              onClick={handleReset}
              className="px-4 py-2 border border-gray-300 text-sm text-gray-600 rounded-sm hover:bg-gray-50 transition-colors"
            >
              기본값으로 초기화
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
