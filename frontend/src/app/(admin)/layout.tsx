import React from "react";
import { requireAdminUser } from "@/shared/auth/admin-server-guard";
import { AdminScopeProvider } from "@/shared/auth/admin-guard";
import { AdminSidebar } from "./admin-sidebar";
import { AdminHeader } from "./admin-header";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdminUser("/admin");

  return (
    <AdminScopeProvider initialUser={user}>
      <div className="min-h-screen bg-slate-50 flex flex-row">
        {/* Sidebar Left */}
        <AdminSidebar />

        {/* Content Right */}
        <div className="flex-1 flex flex-col min-w-0">
          <AdminHeader />
          <main className="flex-1 p-6 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </AdminScopeProvider>
  );
}
