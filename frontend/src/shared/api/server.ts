import "server-only";
import { z } from "zod";
import { getServerEnv } from "@/shared/config/env";
import type { paths } from "./generated/openapi";
import { readApiResponse } from "./response";
import { fetchWithTimeout } from "./transport";

// Fixed upstream allowlist. Extend with endpoint-specific runtime schemas in each phase.
const healthPaths = {
  live: "/api/v1/health/live",
  ready: "/api/v1/health/ready",
} as const satisfies Record<string, keyof paths>;

export async function getBackendHealth(kind: keyof typeof healthPaths = "live") {
  const env = getServerEnv();
  const path = healthPaths[kind].replace(/^\/api\/v1/, "");
  const response = await fetchWithTimeout(
    `${env.BACKEND_API_BASE_URL.replace(/\/$/, "")}${path}`,
    {
      headers: { Accept: "application/json", "X-Request-Id": crypto.randomUUID() },
    },
    env.BACKEND_TIMEOUT_MS,
  );
  return readApiResponse(
    response,
    z.object({ status: z.literal(kind === "live" ? "ok" : "ready") }),
  );
}
