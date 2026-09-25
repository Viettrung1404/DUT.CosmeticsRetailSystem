import { PartialType } from '@nestjs/swagger';
import { CreateBrandRequestDto } from './create-brand-request.dto';

export class UpdateBrandRequestDto extends PartialType(CreateBrandRequestDto) {}
