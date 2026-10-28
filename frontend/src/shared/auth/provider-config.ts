import "server-only";
import type { OAuthProviders } from "./provider-types";

// Only these public identifiers cross the RSC boundary. Provider secrets stay in Nest.
export function oauthProviders(): OAuthProviders {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() || "";
  const appId = process.env.FACEBOOK_APP_ID?.trim() || "";
  const version = process.env.FACEBOOK_GRAPH_VERSION?.trim() || "";
  return {
    google:
      process.env.OAUTH_GOOGLE_ENABLED === "true" &&
      /^\d+-[\w-]+\.apps\.googleusercontent\.com$/.test(clientId)
        ? { clientId }
        : null,
    facebook:
      process.env.OAUTH_FACEBOOK_ENABLED === "true" &&
      /^\d+$/.test(appId) &&
      /^v\d+\.\d+$/.test(version)
        ? { appId, version }
        : null,
  };
}
