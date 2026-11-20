"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { getStoredStoreScope, setStoredStoreScope } from "@/shared/api/admin-client";

export interface StoreOption {
  id: string;
  name: string;
  code?: string;
  address?: string;
  isWarehouse?: boolean;
}

export interface AdminUser {
  id?: string;
  fullName?: string;
  email?: string;
  roleName?: string;
  role?: string;
  storeId?: string | null;
  dataScope?: string;
}

export interface AdminScopeContextValue {
  activeStoreId: string | null;
  setActiveStoreId: (storeId: string | null) => void;
  stores: StoreOption[];
  setStores: React.Dispatch<React.SetStateAction<StoreOption[]>>;
  activeStore: StoreOption | null;
  user: AdminUser | null | undefined;
  hasRole: (roles: string[]) => boolean;
}

const AdminScopeContext = createContext<AdminScopeContextValue | null>(null);

export function AdminScopeProvider({
  children,
  initialUser,
  initialStores = [],
}: {
  children: React.ReactNode;
  initialUser?: AdminUser | null;
  initialStores?: StoreOption[];
}) {
  const [activeStoreId, setActiveStoreIdState] = useState<string | null>(() => {
    return getStoredStoreScope() || initialUser?.storeId || null;
  });
  const [stores, setStores] = useState<StoreOption[]>(initialStores);

  useEffect(() => {
    if (!getStoredStoreScope() && initialUser?.storeId) {
      setStoredStoreScope(initialUser.storeId);
    }
  }, [initialUser?.storeId]);

  const setActiveStoreId = (id: string | null) => {
    setActiveStoreIdState(id);
    setStoredStoreScope(id);
  };

  const activeStore = stores.find((s) => s.id === activeStoreId) || null;

  const hasRole = (allowedRoles: string[]) => {
    if (!initialUser) return false;
    const userRole = (initialUser.roleName || initialUser.role || "").toUpperCase();
    return allowedRoles.map((r) => r.toUpperCase()).includes(userRole);
  };

  return (
    <AdminScopeContext.Provider
      value={{
        activeStoreId,
        setActiveStoreId,
        stores,
        setStores,
        activeStore,
        user: initialUser,
        hasRole,
      }}
    >
      {children}
    </AdminScopeContext.Provider>
  );
}

export function useAdminScope() {
  const context = useContext(AdminScopeContext);
  if (!context) {
    throw new Error("useAdminScope must be used within an AdminScopeProvider");
  }
  return context;
}
