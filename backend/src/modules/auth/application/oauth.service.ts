import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { JwtTokenService } from '../infrastructure/adapters/jwt.service';
import { GetUserEffectivePermissionsUseCase } from '@modules/permissions/application/use-cases/get-user-effective-permissions.use-case';
import { VerifiedIdentity } from '../infrastructure/adapters/oauth-provider.service';
import { EMAIL_SERVICE, IEmailService } from './ports/email.port';
import { OAuthChallengeDto, OAuthCompleteDto, OAuthEmailDto } from '../presentation/dtos/oauth.dto';
import { Cron } from '@nestjs/schedule';
import { LoginOutput } from './use-cases/login.use-case';

export type OAuthLoginResult =
  | (LoginOutput & { code?: never; challenge?: never; expiresIn?: never })
  | {
      code: 'ACCOUNT_LINK_REQUIRED' | 'EMAIL_VERIFICATION_REQUIRED';
      challenge: string;
      expiresIn: number;
      user?: never;
      accessToken?: never;
      refreshToken?: never;
    };

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const random = () => randomBytes(32).toString('hex');
type Client = { ipAddress?: string; deviceInfo?: string };

@Injectable()
export class OAuthService {
  constructor(
    private readonly db: PrismaService,
    private readonly jwt: JwtTokenService,
    private readonly permissions: GetUserEffectivePermissionsUseCase,
    @Inject(EMAIL_SERVICE) private readonly email: IEmailService,
  ) {}
  @Cron('0 * * * *')
  async cleanup() {
    const expired = await this.db.oAuthPendingIdentity.findMany({
      where: { expiresAt: { lt: new Date(Date.now() - 86400000) } },
      select: { id: true },
      orderBy: { expiresAt: 'asc' },
      take: 500,
    });
    if (expired.length)
      await this.db.oAuthPendingIdentity.deleteMany({
        where: { id: { in: expired.map((row) => row.id) } },
      });
  }
  private async lockIdentity(provider: string, subject: string) {
    await this.db
      .$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`oauth:${provider}:${subject}`},0))`;
  }
  private async lockEmail(email: string) {
    await this.db
      .$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`oauth-email:${email}`},0))`;
  }
  private identity(provider: string, subject: string) {
    return this.db.userOAuthAccount.findUnique({
      where: { provider_providerUserId: { provider, providerUserId: subject } },
    });
  }
  private async issue(userId: string, client: Client) {
    await this.db.$queryRaw`SELECT id FROM users WHERE id=${userId}::uuid FOR UPDATE`;
    const user = await this.db.user.findUniqueOrThrow({
      where: { id: userId },
      include: { role: true },
    });
    if (user.status !== 'ACTIVE' || !user.emailVerified)
      throw new ForbiddenException('ACCOUNT_NOT_ACTIVE');
    const refreshToken = this.jwt.generateRefreshToken(userId);
    const session = await this.db.userSession.create({
      data: {
        userId,
        refreshToken,
        deviceInfo: client.deviceInfo?.slice(0, 255),
        ipAddress: client.ipAddress,
        expiresAt: this.jwt.refreshExpiresAt(),
      },
    });
    const permissionCodes = await this.permissions.execute(userId);
    const accessToken = this.jwt.generateAccessToken({
      userId,
      sessionId: session.id,
      roleId: user.roleId,
      roleName: user.role.name,
      dataScope: user.role.dataScope,
      permissionCodes,
    });
    await this.db.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
    return {
      accessToken,
      refreshToken,
      user: {
        id: userId,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        roleName: user.role.name,
      },
    };
  }
  private async newUser(
    identity: Pick<VerifiedIdentity, 'provider' | 'subject' | 'fullName'>,
    email: string,
  ) {
    const user = await this.db.user.create({
      data: {
        email,
        fullName: identity.fullName,
        emailVerified: true,
        roleId: 6,
        customer: { create: { fullName: identity.fullName } },
        oauthAccounts: {
          create: {
            provider: identity.provider,
            providerUserId: identity.subject,
          },
        },
      },
    });
    await this.db.auditLog.create({
      data: {
        userId: user.id,
        action: 'OAUTH_IDENTITY_CREATED',
        entityType: 'UserOAuthAccount',
        entityId: user.id,
        newData: { provider: identity.provider },
      },
    });
    return user.id;
  }
  async login(
    identity: VerifiedIdentity,
    clientNonce: string,
    client: Client,
    retried = false,
  ): Promise<OAuthLoginResult> {
    try {
      return await this.db.runInTransaction(async () => {
        await this.lockIdentity(identity.provider, identity.subject);
        const linked = await this.identity(identity.provider, identity.subject);
        if (linked) return this.issue(linked.userId, client);
        if (identity.email) await this.lockEmail(identity.email);
        const existing = identity.email
          ? await this.db.user.findFirst({
              where: { email: { equals: identity.email, mode: 'insensitive' } },
            })
          : null;
        if (!existing && identity.email && identity.emailAuthoritative)
          return this.issue(await this.newUser(identity, identity.email), client);
        const challenge = random();
        await this.db.oAuthPendingIdentity.create({
          data: {
            provider: identity.provider,
            subject: identity.subject,
            fullName: identity.fullName,
            email: identity.email,
            targetUserId: existing?.id,
            challengeHash: hash(challenge),
            clientHash: hash(clientNonce),
            expiresAt: new Date(Date.now() + 600000),
          },
        });
        return {
          code: existing
            ? ('ACCOUNT_LINK_REQUIRED' as const)
            : ('EMAIL_VERIFICATION_REQUIRED' as const),
          challenge,
          expiresIn: 600,
        };
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002' && !retried)
        return this.login(identity, clientNonce, client, true);
      throw error;
    }
  }
  private async pending(input: OAuthChallengeDto) {
    const row = await this.db.oAuthPendingIdentity.findUnique({
      where: { challengeHash: hash(input.challenge) },
    });
    if (
      !row ||
      row.usedAt ||
      row.expiresAt <= new Date() ||
      row.clientHash !== hash(input.clientNonce)
    )
      throw new UnauthorizedException('OAUTH_CHALLENGE_INVALID');
    return row;
  }
  async sendEmail(input: OAuthEmailDto) {
    const verificationToken = random();
    const email = input.email.trim().toLowerCase();
    const row = await this.db.runInTransaction(async () => {
      const pending = await this.pending(input);
      await this.db
        .$queryRaw`SELECT id FROM oauth_pending_identities WHERE id=${pending.id}::uuid FOR UPDATE`;
      const current = await this.pending(input);
      if (current.verificationHash) throw new ConflictException('OAUTH_EMAIL_ALREADY_SENT');
      // Existing-account challenges cannot be redirected to an attacker-controlled inbox.
      if (current.targetUserId && current.email?.toLowerCase() !== email)
        throw new BadRequestException('OAUTH_EMAIL_MISMATCH');
      await this.lockEmail(email);
      const existing = await this.db.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
      });
      return this.db.oAuthPendingIdentity.update({
        where: { id: current.id },
        data: {
          email,
          targetUserId: existing?.id,
          verificationHash: hash(verificationToken),
        },
      });
    });
    try {
      if (!this.email.sendOAuthVerificationEmail)
        throw new Error('OAuth email adapter is unavailable');
      await this.email.sendOAuthVerificationEmail(email, verificationToken);
    } catch (error) {
      await this.db.oAuthPendingIdentity.updateMany({
        where: {
          id: row.id,
          usedAt: null,
          verificationHash: hash(verificationToken),
        },
        data: { verificationHash: null },
      });
      throw error;
    }
    return {
      message: 'OAUTH_VERIFICATION_EMAIL_SENT',
      expiresAt: row.expiresAt,
    };
  }
  async complete(input: OAuthCompleteDto, client: Client, linkingUserId?: string) {
    return this.db.runInTransaction(async () => {
      const pending = await this.pending(input);
      await this.lockIdentity(pending.provider, pending.subject);
      if (
        !pending.email ||
        !pending.verificationHash ||
        pending.verificationHash !== hash(input.verificationToken)
      )
        throw new UnauthorizedException('OAUTH_VERIFICATION_INVALID');
      await this.lockEmail(pending.email);
      const existing = await this.db.user.findFirst({
        where: { email: { equals: pending.email, mode: 'insensitive' } },
      });
      if (pending.targetUserId && pending.targetUserId !== existing?.id)
        throw new ForbiddenException('OAUTH_LINK_OWNER_MISMATCH');
      if (existing && linkingUserId !== existing.id)
        throw new ForbiddenException('ACCOUNT_LINK_REQUIRED');
      if (linkingUserId && (!existing || linkingUserId !== existing.id))
        throw new ForbiddenException('OAUTH_LINK_OWNER_MISMATCH');
      const used = await this.db.oAuthPendingIdentity.updateMany({
        where: { id: pending.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (used.count !== 1) throw new UnauthorizedException('OAUTH_CHALLENGE_INVALID');
      const linked = await this.identity(pending.provider, pending.subject);
      if (linked && linked.userId !== existing?.id)
        throw new ConflictException('OAUTH_IDENTITY_ALREADY_LINKED');
      let userId: string;
      if (existing) {
        if (!existing.emailVerified) throw new ForbiddenException('ACCOUNT_EMAIL_NOT_VERIFIED');
        userId = existing.id;
        if (!linked)
          await this.db.userOAuthAccount.create({
            data: {
              provider: pending.provider,
              providerUserId: pending.subject,
              userId,
            },
          });
      } else {
        userId = await this.newUser(
          {
            provider: pending.provider as VerifiedIdentity['provider'],
            subject: pending.subject,
            fullName: pending.fullName,
          },
          pending.email,
        );
      }
      await this.db.auditLog.create({
        data: {
          userId,
          action: 'OAUTH_IDENTITY_LINKED',
          entityType: 'UserOAuthAccount',
          entityId: userId,
          newData: { provider: pending.provider },
        },
      });
      return this.issue(userId, client);
    });
  }
}
