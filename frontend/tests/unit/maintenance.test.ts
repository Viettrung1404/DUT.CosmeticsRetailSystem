import { expect, it } from "vitest";
import { maintenanceResponse } from "@/shared/ui/maintenance-document";
it("returns a standalone no-store 503 document and escapes configured messages", async () => {
  const response = maintenanceResponse('<script>alert("x")</script>', "120");
  expect(response.status).toBe(503); expect(response.headers.get("retry-after")).toBe("120"); expect(response.headers.get("cache-control")).toBe("no-store");
  const body = await response.text(); expect(body).toContain('lang="vi"'); expect(body).toContain("&lt;script&gt;"); expect(body).not.toContain("<script>");
  expect(maintenanceResponse(undefined, "invalid").headers.get("retry-after")).toBe("300");
});
