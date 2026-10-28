"use client";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { safeReturnTo } from "@/shared/auth/contracts";
import type { OAuthProvider, OAuthProviders } from "@/shared/auth/provider-types";
import { ApiError } from "@/shared/api/errors";
import { authMessage, authPost } from "./client";
import { sessionChanged } from "./session-change";

interface GoogleIdentity {
  initialize(options: {
    client_id: string;
    callback: (response: { credential?: string }) => void;
    auto_select: boolean;
    ux_mode: "popup";
  }): void;
  renderButton(
    element: HTMLElement,
    options: {
      theme: "outline";
      size: "large";
      shape: "pill";
      text: "continue_with";
      locale: "vi";
      width: number;
    },
  ): void;
}
interface FacebookIdentity {
  init(options: { appId: string; version: string; cookie: boolean; xfbml: boolean }): void;
  login(
    callback: (response: { authResponse?: { accessToken?: string } }) => void,
    options: { scope: string; return_scopes: boolean },
  ): void;
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdentity } };
    FB?: FacebookIdentity;
  }
}

export function SocialAuth({
  providers,
  returnTo,
  disabled,
  onBusyChange,
}: {
  providers: OAuthProviders;
  returnTo?: string;
  disabled: boolean;
  onBusyChange: (busy: boolean) => void;
}) {
  const googleButton = useRef<HTMLDivElement>(null);
  const exchanging = useRef(false);
  const mounted = useRef(true);
  const [googleReady, setGoogleReady] = useState(false);
  const [facebookReady, setFacebookReady] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const query = useQueryClient();
  const router = useRouter();
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  async function exchange(provider: OAuthProvider, credential: string) {
    if (!mounted.current || disabled || exchanging.current) return;
    exchanging.current = true;
    setBusy(true);
    onBusyChange(true);
    setMessage("");
    try {
      const result = await authPost(
        `oauth/${provider}`,
        provider === "google" ? { idToken: credential } : { accessToken: credential },
      );
      const destination = safeReturnTo(returnTo);
      if (result.code) router.push(`/oauth/continue?returnTo=${encodeURIComponent(destination)}`);
      else
        await sessionChanged(
          query,
          result.cart === "pending" ? "/account?cartMerge=pending" : destination,
        );
    } catch (error) {
      setMessage(
        error instanceof ApiError && error.status === 401
          ? "Không thể xác thực với nhà cung cấp. Vui lòng đăng nhập lại."
          : authMessage(error),
      );
    } finally {
      exchanging.current = false;
      if (mounted.current) {
        setBusy(false);
        onBusyChange(false);
      }
    }
  }
  // SDK handlers outlive the render that loaded the script. Read current hydration,
  // password-submit state and returnTo when the provider eventually calls back.
  const exchangeRef = useRef(exchange);
  useEffect(() => {
    exchangeRef.current = exchange;
  });

  function initializeGoogle() {
    try {
      if (!providers.google || !googleButton.current || !window.google) throw new Error();
      const identity = window.google.accounts.id;
      identity.initialize({
        client_id: providers.google.clientId,
        auto_select: false,
        ux_mode: "popup",
        callback: (response) => {
          if (response.credential) void exchangeRef.current("google", response.credential);
          else setMessage("Google chưa trả về thông tin xác thực. Vui lòng thử lại.");
        },
      });
      identity.renderButton(googleButton.current, {
        theme: "outline",
        size: "large",
        shape: "pill",
        text: "continue_with",
        locale: "vi",
        width: Math.min(400, googleButton.current.clientWidth),
      });
      setGoogleReady(true);
    } catch {
      setMessage(
        "Chưa thể tải đăng nhập Google. Vui lòng tải lại trang hoặc đăng nhập bằng email.",
      );
    }
  }

  function initializeFacebook() {
    try {
      if (!providers.facebook || !window.FB) throw new Error();
      window.FB.init({ ...providers.facebook, cookie: false, xfbml: false });
      setFacebookReady(true);
    } catch {
      setMessage(
        "Chưa thể tải đăng nhập Facebook. Vui lòng tải lại trang hoặc đăng nhập bằng email.",
      );
    }
  }

  function loginFacebook() {
    // Let the provider enforce its transport policy; keep its refusal visible even
    // when the SDK only logs a warning and never invokes the callback.
    setMessage(
      window.location.protocol === "https:"
        ? ""
        : "Facebook yêu cầu HTTPS. Hãy mở https://localhost:3001 sau khi chạy npm run dev:https.",
    );
    try {
      window.FB?.login(
        (response) => {
          if (!mounted.current) return;
          const token = response.authResponse?.accessToken;
          if (token) void exchange("facebook", token);
          else setMessage("Bạn đã hủy đăng nhập Facebook. Bạn có thể thử lại hoặc dùng email.");
        },
        { scope: "public_profile,email", return_scopes: true },
      );
    } catch {
      setMessage("Không mở được đăng nhập Facebook. Vui lòng cho phép cửa sổ bật lên và thử lại.");
    }
  }

  return (
    <div className="social-auth" aria-label="Đăng nhập bằng tài khoản khác" aria-busy={busy}>
      <div className="auth-divider">
        <span>Hoặc tiếp tục với</span>
      </div>
      <div className="social-providers" inert={disabled || busy}>
        <div className="google-provider">
          {!googleReady && (
            <button type="button" className="social-button" disabled>
              Google{providers.google ? " · Đang tải…" : " · Chưa khả dụng"}
            </button>
          )}
          <div ref={googleButton} />
        </div>
        <button
          type="button"
          className="social-button facebook-button"
          disabled={!facebookReady}
          onClick={loginFacebook}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          Tiếp tục với Facebook
          {!providers.facebook ? " · Chưa khả dụng" : !facebookReady ? " · Đang tải…" : ""}
        </button>
      </div>
      {busy && (
        <p role="status" className="hint">
          Đang xác thực tài khoản…
        </p>
      )}
      {message && (
        <p role="alert" className="notice notice-error">
          {message}
        </p>
      )}
      {(!providers.google || !providers.facebook) && (
        <p className="hint">
          Một số phương thức đăng nhập hiện chưa khả dụng. Bạn vẫn có thể sử dụng email.
        </p>
      )}
      {providers.google && (
        <Script
          id="google-identity"
          src="https://accounts.google.com/gsi/client?hl=vi"
          onReady={initializeGoogle}
          onError={() =>
            setMessage(
              "Chưa thể tải đăng nhập Google. Vui lòng tải lại trang hoặc đăng nhập bằng email.",
            )
          }
        />
      )}
      {providers.facebook && (
        <Script
          id="facebook-identity"
          src="https://connect.facebook.net/vi_VN/sdk.js"
          onReady={initializeFacebook}
          onError={() =>
            setMessage(
              "Chưa thể tải đăng nhập Facebook. Vui lòng tải lại trang hoặc đăng nhập bằng email.",
            )
          }
        />
      )}
    </div>
  );
}
