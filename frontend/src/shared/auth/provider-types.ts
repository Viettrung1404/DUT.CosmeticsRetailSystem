export interface OAuthProviders {
  google: { clientId: string } | null;
  facebook: { appId: string; version: string } | null;
}
export type OAuthProvider = keyof OAuthProviders;
