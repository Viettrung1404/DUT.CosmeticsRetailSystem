import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { customerContext } from '../infrastructure/commands';

@Injectable()
export class CustomerOnlyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    req.customerId = await customerContext(this.prisma, req.user?.userId);
    return true;
  }
}
