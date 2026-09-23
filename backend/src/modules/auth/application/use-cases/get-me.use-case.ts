import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IUserRepository, USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';

export interface GetMeOutput {
  id: string;
  email: string;
  fullName: string;
  phone: string | null | undefined;
  avatarUrl: string | null | undefined;
  roleName: string | undefined;
  dataScope: string | undefined;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: Date | undefined;
}

@Injectable()
export class GetMeUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
  ) {}

  async execute(userId: string): Promise<GetMeOutput> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException('Không tìm thấy thông tin tài khoản');
    }

    return {
      id: user.id!,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      roleName: user.roleName,
      dataScope: user.dataScope,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      createdAt: user.createdAt,
    };
  }
}
