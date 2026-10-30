import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import {
  ADMIN_USER_REPOSITORY,
  IAdminUserRepository,
} from '../../domain/repositories/admin-user.repository.interface';
import { AdminUser, EmployeeProfileInput } from '../../domain/entities/admin-user.entity';
import { IStaffMailer, STAFF_MAILER } from '../ports/staff-mailer.port';

const CUSTOMER_ROLE_ID = 6;
const ACTIVATION_TTL_MS = 72 * 60 * 60 * 1000;

export interface CreateAdminUserInput {
  email: string;
  fullName: string;
  phone?: string | null;
  roleId: number;
  storeIds?: string[];
  employee?: EmployeeProfileInput;
}

export interface CreateAdminUserResult {
  user: AdminUser;
  activationEmailSent: boolean;
}

// Dùng chung cho POST /admin/users và POST /admin/employees (H1): tài khoản chưa có mật khẩu, nhân viên tự đặt qua email
@Injectable()
export class CreateAdminUserUseCase {
  private readonly logger = new Logger(CreateAdminUserUseCase.name);

  constructor(
    @Inject(ADMIN_USER_REPOSITORY) private readonly repository: IAdminUserRepository,
    @Inject(STAFF_MAILER) private readonly mailer: IStaffMailer,
  ) {}

  async execute(input: CreateAdminUserInput): Promise<CreateAdminUserResult> {
    const email = input.email.trim().toLowerCase();
    const fullName = input.fullName.trim();
    const phone = input.phone?.trim() || null;

    if (input.roleId === CUSTOMER_ROLE_ID) {
      throw new BadRequestException('Tài khoản khách hàng tự đăng ký, không tạo ở trang quản trị');
    }
    if (!(await this.repository.findRoleById(input.roleId))) {
      throw new BadRequestException('Vai trò không tồn tại');
    }
    if (await this.repository.findByEmail(email)) {
      throw new ConflictException('Email đã được sử dụng');
    }
    if (phone && (await this.repository.findByPhone(phone))) {
      throw new ConflictException('Số điện thoại đã được sử dụng');
    }

    const storeIds = [
      ...new Set([
        ...(input.storeIds ?? []),
        ...(input.employee?.storeId ? [input.employee.storeId] : []),
      ]),
    ];
    if (storeIds.length > 0) {
      const found = await this.repository.findExistingStoreIds(storeIds);
      if (found.length !== storeIds.length) {
        throw new BadRequestException('Có cửa hàng không tồn tại');
      }
    }
    if (input.employee && (await this.repository.findEmployeeCodeOwner(input.employee.employeeCode))) {
      throw new ConflictException('Mã nhân viên đã được sử dụng');
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const user = await this.repository.createStaff({
      email,
      fullName,
      phone,
      roleId: input.roleId,
      storeIds,
      tokenHash: crypto.createHash('sha256').update(rawToken).digest('hex'),
      tokenExpiresAt: new Date(Date.now() + ACTIVATION_TTL_MS),
      employee: input.employee,
    });

    let activationEmailSent = false;
    try {
      activationEmailSent = await this.mailer.sendActivationEmail(email, fullName, rawToken);
    } catch (error) {
      activationEmailSent = false;
      this.logger.error(`Không gửi được email kích hoạt cho ${email}: ${(error as Error).message}`);
    }
    return { user, activationEmailSent };
  }
}
