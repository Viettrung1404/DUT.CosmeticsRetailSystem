import "server-only";
import { z } from "zod";

const httpUrl = z.url().refine((value) => {
  const url = new URL(value);
  return (
    ["http:", "https:"].includes(url.protocol) &&
    !url.username &&
    !url.password &&
    !url.search &&
    !url.hash
  );
}, "Expected an HTTP(S) URL without credentials, query or fragment");

const schema = z.object({
  BACKEND_API_BASE_URL: httpUrl.default("http://localhost:3000/api/v1"),
  SITE_URL: httpUrl
    .default("http://localhost:3001")
    .refine((value) => new URL(value).pathname === "/", "SITE_URL must be an origin"),
  BACKEND_TIMEOUT_MS: z.coerce.number().int().min(100).max(30000).default(5000),
  FE_DIAGNOSTICS: z.enum(["true", "false"]).default("false"),
  SEO_INDEXING_ENABLED: z.enum(["true", "false"]).default("false"),
});

export function getServerEnv() {
  // Do not print Zod input: environment values may contain credentials.
  const result = schema.safeParse({
    BACKEND_API_BASE_URL: process.env.BACKEND_API_BASE_URL,
    SITE_URL: process.env.SITE_URL,
    BACKEND_TIMEOUT_MS: process.env.BACKEND_TIMEOUT_MS,
    FE_DIAGNOSTICS: process.env.FE_DIAGNOSTICS,
    SEO_INDEXING_ENABLED: process.env.SEO_INDEXING_ENABLED,
  });
  if (!result.success) throw new Error("Invalid frontend server configuration");
  return result.data;
}
