import { Injectable } from '@nestjs/common';
import { RfmService } from '@modules/reports/application/services/rfm.service';
import { ICustomerSegmentPort } from '../../application/ports/customer-segment.port';

@Injectable()
export class RfmCustomerSegmentAdapter implements ICustomerSegmentPort {
  constructor(private readonly rfm: RfmService) {}

  async customerIdsBySegments(segments: string[]): Promise<string[]> {
    const { customers } = await this.rfm.computeAllStores();
    return customers.filter((c) => segments.includes(c.segment)).map((c) => c.customerId);
  }
}
