import { ConfigService } from '@nestjs/config';
import { DlqAlertService, DlqAlertPayload } from '../dlq-alert.service';

describe('DlqAlertService (EP12-T02)', () => {
  let service: DlqAlertService;
  let mockConfigService: any;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
    } as any);

    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'DISCORD_DLQ_WEBHOOK_URL') return 'https://discord.com/api/webhooks/test';
        if (key === 'SLACK_DLQ_WEBHOOK_URL') return 'https://hooks.slack.com/services/test';
        return undefined;
      }),
    };

    service = new DlqAlertService(mockConfigService as ConfigService);
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should dispatch alert to both Discord and Slack when both webhook URLs are configured (AC2)', async () => {
    const payload: DlqAlertPayload = {
      carrierCode: 'GHN',
      eventId: 'evt-dlq-001',
      trackingCode: 'GHN123456',
      errorMessage: 'Network timeout during carrier status update',
      queueName: 'glowup-logistics-webhooks-dlq',
      occurredAt: new Date(),
    };

    const result = await service.notifyDlq(payload);

    expect(result.sent).toBe(true);
    expect(result.channel).toBe('BOTH');
    expect(global.fetch).toHaveBeenCalledTimes(2);

    // Verify Discord call
    const discordCall = (global.fetch as jest.Mock).mock.calls.find((c) =>
      c[0].includes('discord.com'),
    );
    expect(discordCall).toBeDefined();
    const discordBody = JSON.parse(discordCall[1].body);
    expect(discordBody.embeds[0].title).toContain('GHN Event');
    expect(discordBody.embeds[0].fields[0].value).toBe('GHN');

    // Verify Slack call
    const slackCall = (global.fetch as jest.Mock).mock.calls.find((c) =>
      c[0].includes('slack.com'),
    );
    expect(slackCall).toBeDefined();
    const slackBody = JSON.parse(slackCall[1].body);
    expect(slackBody.text).toContain('GHN123456');
  });

  it('should gracefully skip HTTP calls if no webhook URLs are configured', async () => {
    mockConfigService.get.mockReturnValue(undefined);
    const unconfiguredService = new DlqAlertService(mockConfigService as ConfigService);

    const payload: DlqAlertPayload = {
      carrierCode: 'AHAMOVE',
      eventId: 'evt-dlq-002',
      errorMessage: 'Invalid payload format',
    };

    const result = await unconfiguredService.notifyDlq(payload);

    expect(result.sent).toBe(false);
    expect(result.channel).toBe('NONE');
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
