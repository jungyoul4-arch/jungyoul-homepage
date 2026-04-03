"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

export type EditModalType = "article" | "highlight" | "teacher" | "video";

export interface EditModalState {
  type: EditModalType;
  data: Record<string, unknown>;
}

interface AuthContextValue {
  isAdmin: boolean;
  editModal: EditModalState | null;
  openEdit: (type: EditModalType, data: Record<string, unknown>) => void;
  closeEdit: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  isAdmin: false,
  editModal: null,
  openEdit: () => {},
  closeEdit: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [editModal, setEditModal] = useState<EditModalState | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => setIsAdmin(res.ok))
      .catch(() => setIsAdmin(false));
  }, []);

  const openEdit = useCallback((type: EditModalType, data: Record<string, unknown>) => {
    setEditModal({ type, data });
  }, []);

  const closeEdit = useCallback(() => {
    setEditModal(null);
  }, []);

  return (
    <AuthContext.Provider value={{ isAdmin, editModal, openEdit, closeEdit }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
