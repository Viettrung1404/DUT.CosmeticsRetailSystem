"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  MailCheck,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { authInputs, safeReturnTo, type AuthAction } from "@/shared/auth/contracts";
import { ApiError } from "@/shared/api/errors";
import { FormField } from "@/shared/ui/form-field";
import { authPost, authMessage, retryDelay } from "./client";
import { sessionChanged } from "./session-change";
import { useHydrated } from "@/shared/lib/use-hydrated";
import { SocialAuth } from "./social-auth";
import type { OAuthProviders } from "@/shared/auth/provider-types";

const copy: Record<
  AuthAction,
  { title: string; description: string; submit: string; success: string }
> = {
  login: {
    title: "Chào mừng trở lại!",
    description: "Đăng nhập để nhận các ưu đãi dành riêng và quản lý đơn hàng của bạn.",
    submit: "Đăng nhập",
    success: "Đăng nhập thành công.",
  },
  register: {
    title: "Tạo tài khoản GlowUp",
    description:
      "Đăng ký thành viên để khám phá thế giới làm đẹp và theo dõi hành trình mua sắm của riêng bạn.",
    submit: "Tạo tài khoản",
    success:
      "Đăng ký thành công. Vui lòng mở liên kết xác thực trong email để kích hoạt tài khoản.",
  },
  "forgot-password": {
    title: "Bạn quên mật khẩu đăng nhập?",
    description:
      "Đừng lo lắng! Nhập email đã đăng ký tại GlowUp, chúng tôi sẽ gửi liên kết để bạn khởi tạo mật khẩu mới. Liên kết có hiệu lực trong 30 phút.",
    submit: "Gửi liên kết đặt lại",
    success: "Nếu email thuộc một tài khoản, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.",
  },
  "reset-password": {
    title: "Đặt lại mật khẩu",
    description: "Chọn mật khẩu mới cho tài khoản của bạn.",
    submit: "Lưu mật khẩu mới",
    success: "Mật khẩu đã được thay đổi. Bạn có thể đăng nhập bằng mật khẩu mới.",
  },
  "verify-email": {
    title: "Xác nhận địa chỉ email của bạn",
    description:
      "Xác nhận liên kết nhận qua email để kích hoạt tài khoản GlowUp. Vui lòng kiểm tra cả hộp thư đến và thư mục Spam/Quảng cáo.",
    submit: "Xác thực email",
    success: "Email đã được xác thực. Chào mừng bạn đến với GlowUp!",
  },
  "resend-verification": {
    title: "Gửi lại email xác thực",
    description: "Nhập email đã đăng ký để nhận một liên kết xác thực mới.",
    submit: "Gửi lại liên kết",
    success:
      "Nếu tài khoản cần xác thực, một liên kết mới đã được gửi. Vui lòng kiểm tra cả thư rác.",
  },
};

function AuthHeading({
  mode,
  compact,
  success,
}: {
  mode: AuthAction;
  compact: boolean;
  success: boolean;
}) {
  const recovery = mode === "forgot-password" || mode === "reset-password";
  const Icon = success ? Check : mode === "verify-email" ? MailCheck : ShieldCheck;
  return (
    <>
      {recovery && (
        <ol className="recovery-steps" aria-label="Các bước đặt lại mật khẩu">
          <li aria-current={mode === "forgot-password" ? "step" : undefined}>
            <MailCheck size={18} />
            1. Yêu cầu gửi link
          </li>
          <li aria-current={mode === "reset-password" ? "step" : undefined}>
            <LockKeyhole size={18} />
            2. Đặt lại mật khẩu
          </li>
        </ol>
      )}
      {compact && !recovery && (
        <Image
          className="auth-emblem"
          src="/images/stitch/glowup-logo.webp"
          width={64}
          height={64}
          alt="GlowUp"
        />
      )}
      {compact && (
        <span className={`auth-state-icon ${success ? "is-success" : ""}`}>
          <Icon size={30} />
        </span>
      )}
      <p className="eyebrow">
        {mode === "login" ? (
          <>
            <LockKeyhole size={16} /> Cổng đăng nhập an toàn
          </>
        ) : mode === "register" ? (
          "●  TRẢI NGHIỆM CÁ NHÂN HÓA"
        ) : (
          "BẢO MẬT TÀI KHOẢN GLOWUP"
        )}
      </p>
      <h1>{copy[mode].title}</h1>
      <p className="muted">{copy[mode].description}</p>
    </>
  );
}

function PasswordStrength({ value }: { value: string }) {
  const score = [
    value.length >= 8,
    /[a-z]/.test(value) && /[A-Z]/.test(value),
    /\d/.test(value),
  ].filter(Boolean).length;
  return (
    <div className="password-strength">
      <span>Độ mạnh mật khẩu:</span>
      <strong>
        {!value ? "Chưa nhập" : score === 3 ? "Mạnh" : score === 2 ? "Trung bình" : "Yếu"}
      </strong>
      <div className="strength-bars" aria-hidden="true">
        {[1, 2, 3].map((level) => (
          <i className={score >= level ? "filled" : ""} key={level} />
        ))}
      </div>
    </div>
  );
}
export function AuthForm({
  action,
  token = "",
  returnTo,
  providers,
}: {
  action: AuthAction;
  token?: string;
  returnTo?: string;
  providers?: OAuthProviders;
}) {
  const hydrated = useHydrated();
  const [mode, setMode] = useState<AuthAction>(action);
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [oauthBusy, setOauthBusy] = useState(false);
  const query = useQueryClient();
  const {
    register,
    control,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<Record<string, string>>();
  const passwordValue = useWatch({
    control,
    name: mode === "reset-password" ? "newPassword" : "password",
    defaultValue: "",
  });
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  useEffect(() => {
    if (token) window.history.replaceState(null, "", window.location.pathname);
  }, [token]);
  useEffect(() => {
    if (message) document.getElementById("auth-feedback")?.focus();
  }, [message]);
  const needsToken = mode === "verify-email" || mode === "reset-password";
  const hasPassword = ["login", "register", "reset-password"].includes(mode);
  const passwordName = mode === "reset-password" ? "newPassword" : "password";
  async function submit(values: Record<string, string>) {
    if (oauthBusy) return;
    clearErrors();
    setMessage("");
    const body: Record<string, string> = {};
    if (!needsToken) body.email = values.email ?? "";
    if (hasPassword) body[passwordName] = values[passwordName] ?? "";
    if (mode === "register") {
      body.fullName = values.fullName ?? "";
      if (values.phone) body.phone = values.phone;
    }
    if (needsToken) body.token = token;
    const parsed = authInputs[mode].safeParse(body);
    if (!parsed.success) {
      for (const issue of parsed.error.issues)
        setError(String(issue.path[0]), { message: issue.message }, { shouldFocus: true });
      return;
    }
    if (
      ["register", "reset-password"].includes(mode) &&
      values.confirmPassword !== values[passwordName]
    ) {
      setError(
        "confirmPassword",
        { message: "Mật khẩu xác nhận chưa khớp." },
        { shouldFocus: true },
      );
      return;
    }
    try {
      const result = await authPost(mode, parsed.data);
      if (mode === "login") {
        await sessionChanged(
          query,
          result.cart === "pending" ? "/account?cartMerge=pending" : safeReturnTo(returnTo),
        );
        return;
      }
      setSuccess(true);
      setMessage(copy[mode].success);
    } catch (error) {
      setMessage(authMessage(error, mode === "login"));
      if (error instanceof ApiError && error.status === 429)
        setCooldown(retryDelay(error.retryAfter));
    }
  }
  return (
    <section className="auth-form" aria-busy={!hydrated || isSubmitting}>
      <AuthHeading
        mode={mode}
        compact={!["login", "register"].includes(action)}
        success={success}
      />
      {message && (
        <div
          id="auth-feedback"
          tabIndex={-1}
          role={success ? "status" : "alert"}
          className={`notice ${success ? "notice-success" : "notice-error"}`}
        >
          {message}
        </div>
      )}
      {needsToken && !token ? (
        <div className="notice" role="status">
          Liên kết không hợp lệ hoặc thiếu mã xác thực. Vui lòng yêu cầu liên kết mới.
        </div>
      ) : (
        !success && (
          <form
            method="post"
            action={`/api/auth/${mode}`}
            onSubmit={(event) => {
              void handleSubmit(submit)(event);
            }}
            noValidate
          >
            {mode === "register" && (
              <FormField
                id="fullName"
                label="Họ và tên"
                placeholder="Nhập họ và tên của bạn"
                icon={<UserRound size={19} />}
                autoComplete="name"
                required
                error={errors.fullName?.message}
                {...register("fullName")}
              />
            )}
            {!needsToken && (
              <FormField
                id="email"
                label="Địa chỉ email"
                type="email"
                placeholder="Nhập địa chỉ email của bạn"
                icon={<Mail size={19} />}
                autoComplete="email"
                required
                error={errors.email?.message}
                {...register("email")}
              />
            )}
            {mode === "register" && (
              <FormField
                id="phone"
                label="Số điện thoại (không bắt buộc)"
                placeholder="09xx xxx xxx"
                icon={<Phone size={19} />}
                type="tel"
                autoComplete="tel"
                error={errors.phone?.message}
                {...register("phone")}
              />
            )}
            {hasPassword && (
              <>
                <FormField
                  id={passwordName}
                  label={mode === "reset-password" ? "Mật khẩu mới" : "Mật khẩu"}
                  placeholder="••••••••••••"
                  icon={<LockKeyhole size={19} />}
                  labelAside={
                    mode === "login" && (
                      <Link className="forgot-link" href="/forgot-password">
                        Quên mật khẩu?
                      </Link>
                    )
                  }
                  endAdornment={
                    <button
                      className="reveal"
                      type="button"
                      aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      aria-pressed={visible}
                      onClick={() => setVisible(!visible)}
                    >
                      {visible ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  }
                  type={visible ? "text" : "password"}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  required
                  error={errors[passwordName]?.message}
                  {...register(passwordName)}
                />
                {mode !== "login" && (
                  <>
                    <PasswordStrength value={passwordValue} />
                    <p className="hint">Ít nhất 8 ký tự, gồm chữ hoa, chữ thường và chữ số.</p>
                    <FormField
                      id="confirmPassword"
                      label="Xác nhận mật khẩu"
                      icon={<ShieldCheck size={19} />}
                      placeholder="Nhập lại mật khẩu"
                      type={visible ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      error={errors.confirmPassword?.message}
                      {...register("confirmPassword")}
                    />
                  </>
                )}
              </>
            )}
            <button
              className="button full"
              disabled={!hydrated || isSubmitting || oauthBusy || cooldown > 0}
            >
              {isSubmitting ? (
                "Đang xử lý…"
              ) : cooldown ? (
                `Vui lòng chờ ${cooldown}s`
              ) : (
                <>
                  {copy[mode].submit}
                  <ArrowRight size={19} />
                </>
              )}
            </button>
          </form>
        )
      )}
      {!success && providers && ["login", "register"].includes(mode) && (
        <SocialAuth
          providers={providers}
          returnTo={returnTo}
          disabled={!hydrated || isSubmitting}
          onBusyChange={setOauthBusy}
        />
      )}
      <div className="auth-links">
        {mode === "login" ? (
          <p>
            Bạn chưa có tài khoản GlowUp?{" "}
            <Link href={`/register?returnTo=${encodeURIComponent(safeReturnTo(returnTo))}`}>
              Đăng ký ngay →
            </Link>
          </p>
        ) : (
          <Link href={`/login?returnTo=${encodeURIComponent(safeReturnTo(returnTo))}`}>
            {mode === "register" ? "Đã có tài khoản GlowUp? Đăng nhập" : "← Quay lại đăng nhập"}
          </Link>
        )}
        {["login", "register", "verify-email"].includes(mode) && (
          <button
            className="text-button"
            onClick={() => {
              setMode("resend-verification");
              setMessage("");
              setSuccess(false);
              clearErrors();
            }}
          >
            Gửi lại email xác thực
          </button>
        )}
        {mode === "reset-password" && <Link href="/forgot-password">Yêu cầu liên kết mới</Link>}
      </div>
    </section>
  );
}
