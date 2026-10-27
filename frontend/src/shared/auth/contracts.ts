import { z } from "zod";

const email = z.email("Địa chỉ email không hợp lệ.").max(255);
const password = z.string().min(8, "Mật khẩu cần ít nhất 8 ký tự.").max(256)
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Cần có chữ hoa, chữ thường và chữ số.");
export const authInputs = {
  login: z.object({ email, password: z.string().min(1, "Vui lòng nhập mật khẩu.").max(256) }).strict(),
  register: z.object({ email, password, fullName: z.string().trim().min(1, "Vui lòng nhập họ tên.").max(100), phone: z.string().regex(/^[0-9]{10,11}$/, "Số điện thoại gồm 10–11 chữ số.").optional() }).strict(),
  "forgot-password": z.object({ email }).strict(),
  "resend-verification": z.object({ email }).strict(),
  "verify-email": z.object({ token: z.string().min(1).max(2048) }).strict(),
  "reset-password": z.object({ token: z.string().min(1).max(2048), newPassword: password }).strict(),
};
export type AuthAction = keyof typeof authInputs;
export const userSchema = z.object({ id: z.string().min(1), email, fullName: z.string(), avatarUrl: z.string().nullable().optional(), roleName: z.string().optional() });
export type AuthUser = z.infer<typeof userSchema>;
export const tokensSchema = z.object({ accessToken: z.string().min(1), refreshToken: z.string().min(1) });
export const loginSchema = tokensSchema.extend({ user: userSchema });
export const messageSchema = z.object({ message: z.string() });

export function safeReturnTo(value: unknown): string {
  if (typeof value !== "string" || !/^\/(?!\/)/.test(value) || /[\\%\s\u0000-\u001f]/.test(value)) return "/account";
  const url = new URL(value, "https://glowup.invalid");
  if (url.origin !== "https://glowup.invalid") return "/account";
  return /^(?:\/$|\/account(?:\/|$)|\/checkout$|\/cart$|\/oauth\/continue$|\/products(?:\/|$))/.test(url.pathname) ? url.pathname + url.search + url.hash : "/account";
}
