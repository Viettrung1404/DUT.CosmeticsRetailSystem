import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { BcryptService } from '../../infrastructure/adapters/bcrypt.service';
import { UserEntity } from '../../domain/entities/user.entity';
@Injectable()
export class ChangePasswordUseCase {
  constructor(
    private readonly db: PrismaService,
    private readonly bcrypt: BcryptService,
  ) {}
  async execute(
    userId: string,
    sid: string | undefined,
    oldPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    if (!sid)
      throw new UnauthorizedException(
        'Vui lòng refresh hoặc đăng nhập lại trước khi đổi mật khẩu',
      );
    const check = UserEntity.validatePassword(newPassword);
    if (!check.valid) throw new BadRequestException(check.message);
    const snapshot = await this.db.user.findUnique({ where: { id: userId } });
    if (
      !snapshot?.passwordHash ||
      !(await this.bcrypt.compare(oldPassword, snapshot.passwordHash))
    )
      throw new BadRequestException('Mật khẩu hiện tại không đúng');
    const passwordHash = await this.bcrypt.hash(newPassword);
    await this.db.transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id=${userId}::uuid FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM user_sessions WHERE id=${sid}::uuid FOR UPDATE`;
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      const active = await tx.userSession.findFirst({
        where: {
          id: sid,
          userId,
          isRevoked: false,
          expiresAt: { gt: new Date() },
        },
      });
      if (!active || user.status !== 'ACTIVE')
        throw new UnauthorizedException('Phiên đăng nhập không còn hợp lệ');
      if (user.passwordHash !== snapshot.passwordHash)
        throw new BadRequestException(
          'Mật khẩu vừa thay đổi. Vui lòng thử lại.',
        );
      await tx.user.update({ where: { id: userId }, data: { passwordHash } });
      await tx.userSession.updateMany({
        where: { userId, id: { not: sid }, isRevoked: false },
        data: { isRevoked: true },
      });
      await tx.verificationToken.updateMany({
        where: { userId, type: 'PASSWORD_RESET', isUsed: false },
        data: { isUsed: true },
      });
      await tx.emailOutbox.create({
        data: {
          userId,
          eventKey: `PASSWORD_CHANGED:${randomUUID()}`,
          recipient: user.email,
          subject: 'Mật khẩu đã thay đổi',
          text: 'Mật khẩu GlowUp của bạn đã thay đổi. Các phiên đăng nhập khác đã được thu hồi.',
        },
      });
    });
    return { message: 'Đổi mật khẩu thành công' };
  }
}
