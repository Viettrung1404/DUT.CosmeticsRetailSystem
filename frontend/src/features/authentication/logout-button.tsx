"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { authPost, authMessage } from "./client";
import { sessionChanged } from "./session-change";
import { useHydrated } from "@/shared/lib/use-hydrated";
export function LogoutButton() {
  const hydrated = useHydrated();
  const query = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <>
      <button
        className="text-button logout-button"
        disabled={!hydrated || busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await authPost("logout", {});
            await sessionChanged(query, "/login");
          } catch (e) {
            await query.cancelQueries();
            query.clear();
            setError(authMessage(e));
            setBusy(false);
          }
        }}
      >
        {busy ? "Đang đăng xuất…" : "Đăng xuất →"}
      </button>
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
    </>
  );
}
