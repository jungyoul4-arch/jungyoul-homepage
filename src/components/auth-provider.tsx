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
    fetch("/api/auth/me")
      .then((res) => setIsAdmin(res.ok))
      .catch(() => setIsAdmin(false));

    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => setLogoUrl(data.logoUrl ?? null))
      .catch(() => setLogoUrl(null));
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
