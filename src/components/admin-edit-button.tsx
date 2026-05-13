"use client";

import { Pencil } from "lucide-react";
import { useAuth, type EditModalType } from "./auth-provider";

interface AdminEditButtonProps {
  type: EditModalType;
  data: object;
  className?: string;
}

export function AdminEditButton({ type, data, className = "" }: AdminEditButtonProps) {
  const { isAdmin, openEdit } = useAuth();
  if (!isAdmin) return null;

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        openEdit(type, data as Record<string, unknown>);
      }}
      className={`inline-flex items-center justify-center w-7 h-7 bg-brand-blue text-white rounded-full shadow-md hover:bg-brand-blue-dark transition-colors z-20 cursor-pointer ${className}`}
      title="편집"
    >
      <Pencil size={13} />
    </button>
  );
}
