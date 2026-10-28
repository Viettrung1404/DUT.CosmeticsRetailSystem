import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { createHmac } from 'crypto';

export interface VerifiedIdentity {
  provider: 'google' | 'facebook';
  subject: string;
  email?: string;
  emailAuthoritative: boolean;
  fullName: string;
}

@Injectable()
export class OAuthProviderService {
  private readonly googleClient = new OAuth2Client();
  constructor(private readonly config: ConfigService) {
    this.googleClient.transporter.defaults = { timeout: 5000, retry: false };
  }
  async google(idToken: string): Promise<VerifiedIdentity> {
    const audience = this.config
      .get<string>('GOOGLE_OAUTH_CLIENT_IDS', '')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
    if (!audience.length) throw new ServiceUnavailableException('GOOGLE_OAUTH_NOT_CONFIGURED');
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience,
      });
      const payload = ticket.getPayload();
      if (
        !payload?.sub ||
        !payload.exp ||
        !['accounts.google.com', 'https://accounts.google.com'].includes(payload.iss)
      )
        throw new Error();
      const email = payload.email?.trim().toLowerCase();
      return {
        provider: 'google',
        subject: payload.sub,
        email,
        emailAuthoritative:
          payload.email_verified === true &&
          !!email &&
          (email.endsWith('@gmail.com') || !!payload.hd),
        fullName: (payload.name || 'Customer').slice(0, 100),
      };
    } catch (error) {
      // Network/provider errors are retryable; never log the token or SDK request.
      if (
        Number((error as { response?: { status?: number } }).response?.status) >= 500 ||
        (error as Error).name === 'AbortError' ||
        ['ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET'].includes(String((error as { code?: string }).code))
      )
        throw new ServiceUnavailableException('OAUTH_PROVIDER_UNAVAILABLE');
      throw new UnauthorizedException('INVALID_GOOGLE_TOKEN');
    }
  }
  private async graph(path: string, token: string, params: Record<string, string>) {
    const version = this.config.get<string>('FACEBOOK_GRAPH_VERSION', '');
    if (!/^v\d+\.\d+$/.test(version))
      throw new ServiceUnavailableException('FACEBOOK_GRAPH_VERSION_REQUIRED');
    const url = new URL(`https://graph.facebook.com/${version}/${path}`);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    let response: Response;
    try {
      response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(5000),
        redirect: 'error',
      });
    } catch {
      throw new ServiceUnavailableException('OAUTH_PROVIDER_UNAVAILABLE');
    }
    if (response.status >= 500 || response.status === 429)
      throw new ServiceUnavailableException('OAUTH_PROVIDER_UNAVAILABLE');
    if (!response.ok) throw new UnauthorizedException('INVALID_FACEBOOK_TOKEN');
    try {
      return await response.json();
    } catch {
      throw new ServiceUnavailableException('OAUTH_PROVIDER_UNAVAILABLE');
    }
  }
  async facebook(accessToken: string): Promise<VerifiedIdentity> {
    const appId = this.config.get<string>('FACEBOOK_APP_ID');
    const secret = this.config.get<string>('FACEBOOK_APP_SECRET');
    if (!appId || !secret) throw new ServiceUnavailableException('FACEBOOK_OAUTH_NOT_CONFIGURED');
    const result = await this.graph('debug_token', `${appId}|${secret}`, {
      input_token: accessToken,
    });
    const data = result?.data;
    const now = Math.floor(Date.now() / 1000);
    if (
      !data?.is_valid ||
      data.type !== 'USER' ||
      String(data.app_id) !== appId ||
      !data.user_id ||
      !(data.expires_at > now) ||
      !(data.data_access_expires_at > now)
    )
      throw new UnauthorizedException('INVALID_FACEBOOK_TOKEN');
    const profile = await this.graph('me', accessToken, {
      fields: 'id,name,email',
      appsecret_proof: createHmac('sha256', secret).update(accessToken).digest('hex'),
    });
    if (String(profile.id) !== String(data.user_id))
      throw new UnauthorizedException('INVALID_FACEBOOK_TOKEN');
    return {
      provider: 'facebook',
      subject: String(profile.id),
      email: typeof profile.email === 'string' ? profile.email.trim().toLowerCase() : undefined,
      emailAuthoritative: false,
      fullName: String(profile.name || 'Customer').slice(0, 100),
    };
  }
}
