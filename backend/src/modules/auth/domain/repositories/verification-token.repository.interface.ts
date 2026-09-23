export const VERIFICATION_TOKEN_REPOSITORY = Symbol('IVerificationTokenRepository');

export interface IVerificationTokenRepository {
  create(data: {
    userId: string;
    tokenHash: string;
    type: string;
    expiresAt: Date;
  }): Promise<{ id: string }>;

  findByTokenHash(tokenHash: string, type: string): Promise<{
    id: string;
    userId: string | null;
    tokenHash: string;
    type: string;
    expiresAt: Date;
    isUsed: boolean;
  } | null>;

  markAsUsed(id: string): Promise<void>;

  /** Count tokens created within a timeframe, used for rate limiting */
  countRecentByUserId(userId: string, type: string, since: Date): Promise<number>;

  /** Invalidate all unused tokens for a user by type */
  invalidateAllByUserId(userId: string, type: string): Promise<void>;
}
