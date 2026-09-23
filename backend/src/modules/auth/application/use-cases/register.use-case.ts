import { Inject, Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { UserEntity } from '../../domain/entities/user.entity';
import { USER_REPOSITORY, IUserRepository } from '../../domain/repositories/user.repository.interface';
import {
  VERIFICATION_TOKEN_REPOSITORY,
  IVerificationTokenRepository,
} from '../../domain/repositories/verification-token.repository.interface';
import { EMAIL_SERVICE, IEmailService } from '../ports/email.port';
import { BcryptService } from '../../infrastructure/adapters/bcrypt.service';
import { UNIT_OF_WORK, IUnitOfWork } from '@core/database/unit-of-work.interface';
import * as crypto from 'crypto';

export const DEFAULT_CUSTOMER_ROLE_ID = 6;
export const EMAIL_VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}

export interface RegisterOutput {
  userId: string;
  email: string;
  fullName: string;
  message: string;
}

@Injectable()
export class RegisterUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(VERIFICATION_TOKEN_REPOSITORY) private readonly tokenRepo: IVerificationTokenRepository,
    @Inject(EMAIL_SERVICE) private readonly emailService: IEmailService,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
    private readonly bcryptService: BcryptService,
  ) {}

  async execute(input: RegisterInput): Promise<RegisterOutput> {
    // 1. Validate email format
    if (!UserEntity.validateEmail(input.email)) {
      throw new BadRequestException('Email không hợp lệ');
    }

    // 2. Validate password strength
    const passwordCheck = UserEntity.validatePassword(input.password);
    if (!passwordCheck.valid) {
      throw new BadRequestException(passwordCheck.message);
    }

    // 3. Check email uniqueness
    const existingUser = await this.userRepo.findByEmail(input.email);
    if (existingUser) {
      throw new ConflictException('Email đã được sử dụng');
    }

    // 4. Hash password
    const passwordHash = await this.bcryptService.hash(input.password);

    // 5. Create User entity
    const user = new UserEntity({
      roleId: DEFAULT_CUSTOMER_ROLE_ID,
      email: input.email,
      passwordHash,
      phone: input.phone || null,
      fullName: input.fullName,
      status: 'ACTIVE',
      emailVerified: false,
      phoneVerified: false,
      extraPermissions: BigInt(0),
      revokedPermissions: BigInt(0),
    });

    // 6, 7, 8. Persist User, link/create Customer, and create Verification Token within an atomic transaction
    const { userId, rawToken } = await this.unitOfWork.runInTransaction(async () => {
      const createdUser = await this.userRepo.create(user);
      const uId = createdUser.id!;

      if (input.phone) {
        const existingCustomer = await this.userRepo.findCustomerByPhone(input.phone);
        if (existingCustomer && !existingCustomer.userId) {
          // Merge: link existing POS walk-in customer profile to new user
          await this.userRepo.linkCustomerToUser(existingCustomer.id, uId);
        } else if (!existingCustomer) {
          await this.userRepo.createCustomerForUser(uId, input.phone);
        }
      } else {
        await this.userRepo.createCustomerForUser(uId);
      }

      const rToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rToken).digest('hex');
      const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_TTL_MS);

      await this.tokenRepo.create({
        userId: uId,
        tokenHash,
        type: 'EMAIL_VERIFICATION',
        expiresAt,
      });

      return { userId: uId, rawToken: rToken };
    });

    // 9. Send verification email after transaction successfully commits
    await this.emailService.sendVerificationEmail(input.email, input.fullName, rawToken);

    return {
      userId,
      email: input.email,
      fullName: input.fullName,
      message: 'Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.',
    };
  }
}

