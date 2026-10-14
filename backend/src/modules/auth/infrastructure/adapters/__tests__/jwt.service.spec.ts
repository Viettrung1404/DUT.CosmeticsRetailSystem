import { ConfigService } from '@nestjs/config';
import { JwtTokenService } from '../jwt.service';
import * as jwt from 'jsonwebtoken';
describe('Access token lifetime bound', () => {
  it('caps old configured 7 day access tokens at 15 minutes', () => {
    const service = new JwtTokenService(
      new ConfigService({ JWT_SECRET: 'test-secret', JWT_EXPIRES_IN: '7d' }),
    );
    const payload = jwt.decode(
      service.generateAccessToken({
        userId: 'test',
        sid: 'session',
        roleId: 6,
        roleName: 'Customer',
        dataScope: 'SELF',
        permissionCodes: [],
      }),
    ) as jwt.JwtPayload;
    expect(payload.exp! - payload.iat!).toBe(900);
    expect(payload.sid).toBe('session');
  });
});
