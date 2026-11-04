import { describe, expect, it } from "vitest";
import { metadataTitle } from "@/shared/config/metadata";

describe("metadata titles from managed content", () => {
  it.each([
    ["  Chăm sóc da | GlowUp  ", "Chăm sóc da"],
    ["Chăm sóc da | GlowUp | GlowUp", "Chăm sóc da"],
    ["Chăm sóc da – GlowUp", "Chăm sóc da"],
    ["Chăm sóc da - glowup", "Chăm sóc da"],
    ["GlowUp Cầu Giấy", "GlowUp Cầu Giấy"],
    ["Serum | Dưỡng ẩm", "Serum | Dưỡng ẩm"],
    ["Làm đẹp cùng GlowUp", "Làm đẹp cùng GlowUp"],
  ])("normalizes %s without changing the content name", (input, expected) => {
    expect(metadataTitle(input, "Nội dung")).toBe(expected);
  });

  it.each([null, undefined, "", "   ", " | GlowUp"])(
    "falls back when the managed title is empty: %s",
    (input) => {
      expect(metadataTitle(input, "Chính sách giao hàng")).toBe("Chính sách giao hàng");
    },
  );

  it("also removes an existing suffix from the fallback content title", () => {
    expect(metadataTitle(" | GlowUp", "Chăm sóc da | GlowUp")).toBe("Chăm sóc da");
  });
});
