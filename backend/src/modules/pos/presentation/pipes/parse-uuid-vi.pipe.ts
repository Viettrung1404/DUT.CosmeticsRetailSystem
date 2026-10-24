import { BadRequestException, ParseUUIDPipe } from '@nestjs/common';

export const parseUuidVi = new ParseUUIDPipe({
  exceptionFactory: () => new BadRequestException('Mã không đúng định dạng'),
});
