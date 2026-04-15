"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

export type EditModalType = "article" | "highlight" | "teacher" | "video";

export interface EditModalState {
  type: EditModalType;
  data: Record<string, unknown>;
}

interface AuthContextValue {
  isAdmin: boolean;
  logoUrl: string | null;
  editModal: EditModalState | null;
  openEdit: (type: EditModalType, data: Record<string, unknown>) => void;
  closeEdit: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  isAdmin: false,
  logoUrl: null,
  editModal: null,
  openEdit: () => {},
  closeEdit: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [editModal, setEditModal] = useState<EditModalState | null>(null);

  useEffect(() => {
    async function init() {
      const [authResult, settingsResult] = await Promise.allSettled([
        fetch("/api/auth/me"),
        fetch("/api/settings").then((r) => { if (!r.ok) throw new Error(); return r.json(); }),
      ]);
      setIsAdmin(authResult.status === "fulfilled" && authResult.value.ok);
      setLogoUrl(
        settingsResult.status === "fulfilled"
          ? (settingsResult.value.logoUrl ?? null)
          : null
      );
    }
    init();
  }, []);

  const openEdit = useCallback((type: EditModalType, data: Record<string, unknown>) => {
    setEditModal({ type, data });
  }, []);

  const closeEdit = useCallback(() => {
    setEditModal(null);
  }, []);

  return (
    <AuthContext.Provider value={{ isAdmin, logoUrl, editModal, openEdit, closeEdit }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
