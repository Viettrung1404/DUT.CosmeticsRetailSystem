export const USER_SESSION_REPOSITORY = Symbol('IUserSessionRepository');

export interface IUserSessionRepository {
  create(data: {
    userId: string;
    refreshToken: string;
    deviceInfo?: string;
    ipAddress?: string;
    expiresAt: Date;
    expectedPasswordHash?: string;
  }): Promise<{ id: string }>;

  findByRefreshToken(refreshToken: string): Promise<{
    id: string;
    userId: string;
    refreshToken: string;
    isRevoked: boolean;
    expiresAt: Date;
  } | null>;

  revokeById(id: string): Promise<void>;

  rotateActive(
    oldToken: string,
    newToken: string,
    expiresAt: Date,
  ): Promise<{ id: string; userId: string } | null>;

  /** Revoke all active sessions of a user (force re-login on all devices) */
  revokeAllByUserId(userId: string): Promise<void>;

  /** Revoke all active sessions of a user except current session */
  revokeAllByUserIdExcept(
    userId: string,
    exceptSessionId: string,
  ): Promise<void>;
}
