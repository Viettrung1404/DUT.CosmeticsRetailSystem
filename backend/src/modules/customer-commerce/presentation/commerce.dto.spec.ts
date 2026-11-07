import { validate } from 'class-validator';
import { DeviceDto } from './commerce.dto';

describe('Native FCM device registration contract', () => {
  it('rejects Expo Push Service tokens before creating an undeliverable FCM device', async () => {
    for (const deviceToken of ['ExpoPushToken[example]', 'ExponentPushToken[example]']) {
      const errors = await validate(
        Object.assign(new DeviceDto(), { deviceToken, platform: 'ANDROID' }),
      );
      expect(errors.find((error) => error.property === 'deviceToken')?.constraints?.matches).toBe(
        'FCM_REGISTRATION_TOKEN_REQUIRED',
      );
    }
  });
  it('accepts the native FCM token shape without pretending to verify delivery', async () => {
    expect(
      await validate(
        Object.assign(new DeviceDto(), {
          deviceToken: 'native-fcm-registration-token-fixture',
          platform: 'ANDROID',
        }),
      ),
    ).toEqual([]);
  });
});
