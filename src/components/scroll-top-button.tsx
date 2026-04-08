"use client";

import { useState, useEffect } from "react";
import { ChevronUp } from "lucide-react";

export function ScrollTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 300);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (!visible) return null;

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-6 right-6 z-40 w-11 h-11 rounded-full bg-white border border-gray-300 shadow-sm flex items-center justify-center text-gray-600 hover:text-[#1428a0] hover:border-[#1428a0] transition-colors"
      aria-label="맨 위로"
    >
      <ChevronUp size={20} strokeWidth={2} />
    </button>
  );
}
