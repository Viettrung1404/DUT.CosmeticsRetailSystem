import { SetMetadata } from '@nestjs/common';
export const RAW_RESPONSE = 'rawResponse';
export const RawResponse = () => SetMetadata(RAW_RESPONSE, true);
