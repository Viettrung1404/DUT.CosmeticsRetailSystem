import React from "react";
import { requireAdminUser } from "@/shared/auth/admin-server-guard";
import { AdminScopeProvider } from "@/shared/auth/admin-guard";
import { AdminShell } from "./admin-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdminUser("/admin");

  return (
    <AdminScopeProvider initialUser={user}>
      <AdminShell>{children}</AdminShell>
    </AdminScopeProvider>
  );
}
