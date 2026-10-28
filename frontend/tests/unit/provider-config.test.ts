import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { oauthProviders } from "@/shared/auth/provider-config";

afterEach(() => vi.unstubAllEnvs());
describe("OAuth provider availability", () => {
  it("requires explicit enablement and valid public identifiers", () => {
    vi.stubEnv("OAUTH_GOOGLE_ENABLED", "true");
    vi.stubEnv("GOOGLE_OAUTH_CLIENT_ID", "123-test.apps.googleusercontent.com");
    vi.stubEnv("OAUTH_FACEBOOK_ENABLED", "true");
    vi.stubEnv("FACEBOOK_APP_ID", "123456");
    vi.stubEnv("FACEBOOK_GRAPH_VERSION", "v25.0");
    expect(oauthProviders()).toEqual({ google: { clientId: "123-test.apps.googleusercontent.com" }, facebook: { appId: "123456", version: "v25.0" } });
    vi.stubEnv("OAUTH_GOOGLE_ENABLED", "false");
    vi.stubEnv("FACEBOOK_GRAPH_VERSION", "");
    expect(oauthProviders()).toEqual({ google: null, facebook: null });
    vi.stubEnv("OAUTH_GOOGLE_ENABLED", "true");
    vi.stubEnv("GOOGLE_OAUTH_CLIENT_ID", "");
    expect(oauthProviders().google).toBeNull();
  });
});
