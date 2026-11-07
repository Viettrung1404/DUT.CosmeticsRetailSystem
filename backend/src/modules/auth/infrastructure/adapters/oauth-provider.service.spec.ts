import { ConfigService } from '@nestjs/config';
import { generateKeyPairSync } from 'crypto';
import * as jwt from 'jsonwebtoken';
import { OAuthProviderService } from './oauth-provider.service';

describe('OAuth provider verification', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });
  const config = () =>
    new ConfigService({
      GOOGLE_OAUTH_CLIENT_IDS: 'web-client,mobile-client',
      FACEBOOK_APP_ID: '123',
      FACEBOOK_APP_SECRET: 'test-app-secret',
      FACEBOOK_GRAPH_VERSION: 'v24.0',
    });
  const keys = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  function googleService() {
    const service = new OAuthProviderService(config());
    jest
      .spyOn((service as any).googleClient, 'getFederatedSignonCertsAsync')
      .mockResolvedValue({ certs: { test: keys.publicKey }, format: 'PEM' });
    return service;
  }
  function token(extra: Record<string, unknown> = {}) {
    return jwt.sign(
      {
        sub: 'subject-1',
        aud: 'web-client',
        iss: 'https://accounts.google.com',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 600,
        email: 'user@gmail.com',
        email_verified: true,
        ...extra,
      },
      keys.privateKey,
      { algorithm: 'RS256', keyid: 'test' },
    );
  }
  it('verifies real signatures with the Google library and accepts allowed Web/Mobile audiences', async () => {
    const service = googleService();
    await expect(service.google(token())).resolves.toMatchObject({
      subject: 'subject-1',
      emailAuthoritative: true,
    });
    await expect(service.google(token({ aud: 'mobile-client' }))).resolves.toMatchObject({
      subject: 'subject-1',
    });
  });
  it('rejects wrong signature, issuer, audience and expiration', async () => {
    const service = googleService();
    for (const value of [
      token({ aud: 'attacker-client' }),
      token({ iss: 'https://attacker.invalid' }),
      token({
        exp: Math.floor(Date.now() / 1000) - 600,
        iat: Math.floor(Date.now() / 1000) - 1200,
      }),
      jwt.sign({ sub: 'fake' }, 'wrong-key', { keyid: 'test' }),
    ])
      await expect(service.google(value)).rejects.toThrow('INVALID_GOOGLE_TOKEN');
  });
  it('requires email verification for third-party addresses even when Google email_verified is true', async () => {
    await expect(
      googleService().google(token({ email: 'user@third-party.test' })),
    ).resolves.toMatchObject({ emailAuthoritative: false });
    await expect(
      googleService().google(token({ email: 'user@workspace.test', hd: 'workspace.test' })),
    ).resolves.toMatchObject({ emailAuthoritative: true });
    await expect(googleService().google(token({ email: undefined }))).resolves.toMatchObject({
      emailAuthoritative: false,
    });
  });
  it('verifies Facebook app/user/type/expiry and uses appsecret_proof on the profile request', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            is_valid: true,
            type: 'USER',
            app_id: '123',
            user_id: 'fb-1',
            expires_at: Math.floor(Date.now() / 1000) + 600,
            data_access_expires_at: Math.floor(Date.now() / 1000) + 600,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'fb-1',
          name: 'Customer',
          email: 'user@example.test',
        }),
      });
    global.fetch = fetchMock;
    await expect(
      new OAuthProviderService(config()).facebook('test-user-token'),
    ).resolves.toMatchObject({ subject: 'fb-1', emailAuthoritative: false });
    expect(String(fetchMock.mock.calls[1][0])).toContain('appsecret_proof=');
    expect(fetchMock.mock.calls[0][1].redirect).toBe('error');
  });
  it('rejects Facebook wrong app, expired token, wrong user and provider failures', async () => {
    const valid = {
      is_valid: true,
      type: 'USER',
      app_id: '123',
      user_id: 'fb-1',
      expires_at: Math.floor(Date.now() / 1000) + 600,
      data_access_expires_at: Math.floor(Date.now() / 1000) + 600,
    };
    for (const extra of [
      { app_id: 'wrong' },
      { is_valid: false },
      { expires_at: 1 },
      { data_access_expires_at: 1 },
      { type: 'PAGE' },
    ]) {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { ...valid, ...extra } }),
      });
      await expect(new OAuthProviderService(config()).facebook('test-user-token')).rejects.toThrow(
        'INVALID_FACEBOOK_TOKEN',
      );
    }
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: valid }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'attacker' }),
      });
    await expect(new OAuthProviderService(config()).facebook('test-user-token')).rejects.toThrow(
      'INVALID_FACEBOOK_TOKEN',
    );
    global.fetch = jest.fn().mockRejectedValue(new Error('network'));
    await expect(new OAuthProviderService(config()).facebook('test-user-token')).rejects.toThrow(
      'OAUTH_PROVIDER_UNAVAILABLE',
    );
  });
  it('fails closed without provider configuration', async () => {
    const service = new OAuthProviderService(new ConfigService());
    await expect(service.google('token')).rejects.toThrow('GOOGLE_OAUTH_NOT_CONFIGURED');
    await expect(service.facebook('token')).rejects.toThrow('FACEBOOK_OAUTH_NOT_CONFIGURED');
  });
});
