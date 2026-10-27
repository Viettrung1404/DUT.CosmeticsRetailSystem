import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { authInputs, safeReturnTo } from "@/shared/auth/contracts";
import { mutationBody } from "@/shared/auth/http";
import { addressSchema } from "@/features/addresses/contracts";

describe("auth boundary", () => {
  it.each(["https://evil.test", "//evil.test", "/\\evil.test", "/%2f%2fevil.test", "/account%252f..", "/account/../evil", "/api/auth/logout", "/login", "javascript:alert(1)", "/account\n"]) ("rejects unsafe returnTo %s", (value) => expect(safeReturnTo(value)).toBe("/account"));
  it("retains safe account and checkout destinations", () => {
    expect(safeReturnTo("/account/orders?status=pending")).toBe("/account/orders?status=pending");
    expect(safeReturnTo("/checkout")).toBe("/checkout");
  });
  it("validates registration against the backend policy and rejects injected fields", () => {
    const data = { fullName: "Lan", email: "lan@example.com", password: "GlowUp2026" };
    expect(authInputs.register.safeParse(data).success).toBe(true);
    expect(authInputs.register.safeParse({ ...data, password: "password" }).success).toBe(false);
    expect(authInputs.register.safeParse({ ...data, role: "ADMIN" }).success).toBe(false);
    expect(authInputs.register.safeParse({ ...data, phone: "0123" }).success).toBe(false);
  });
  it("rejects absent/foreign Origin, cross-site requests and non-JSON bodies", async () => {
    const cases: Record<string, string>[] = [{}, { Origin: "https://evil.test", "Content-Type": "application/json" }, { Origin: "http://localhost:3001", "Content-Type": "text/plain" }, { Origin: "http://localhost:3001", "Content-Type": "application/json", "Sec-Fetch-Site": "cross-site" }];
    for (const headers of cases) {
      await expect(mutationBody(new Request("http://localhost:3001/api/auth/login", { method: "POST", body: "{}", headers }))).rejects.toHaveProperty("status");
    }
    const headers = { Origin: "http://localhost:3001", "Content-Type": "application/json; charset=utf-8" };
    await expect(mutationBody(new Request("http://localhost:3001/api/auth/login", { method: "POST", body: "{}", headers }))).resolves.toEqual({});
    await expect(mutationBody(new Request("http://localhost:3001/api/auth/login", { method: "POST", body: "x".repeat(25000), headers }))).rejects.toMatchObject({ status: 413 });
  });
  it("strips private address ownership fields from upstream responses", () => {
    const parsed = addressSchema.parse({ id: "c6f94be7-94d7-4a17-b0d0-11fc27c107af", recipientName: "Lan", phone: "0901234567", addressLine: "1 Đường A", ward: "Phường A", district: "Quận B", city: "Đà Nẵng", isDefault: true, customerId: "private", createdAt: "2026-10-27" });
    expect(parsed).not.toHaveProperty("customerId"); expect(parsed).not.toHaveProperty("createdAt");
  });
});
