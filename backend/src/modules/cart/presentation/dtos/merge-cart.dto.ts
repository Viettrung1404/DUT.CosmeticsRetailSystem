import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class MergeCartDto {
  @ApiProperty({ description: 'Session ID của khách vãng lai cần gộp vào tài khoản hiện tại' })
  @IsString({ message: 'sessionId phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'sessionId không được để trống' })
  sessionId: string;
}
