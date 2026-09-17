import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FeaturesService } from './features.service';

describe('Operator-controlled features', () => {
  const makeService = (value: unknown) => new FeaturesService({ get: () => value } as unknown as ConfigService);

  it.each([undefined, null, '', 'false', ' FALSE ', '0', '1', 'yes', 'enabled', true, false, 1, {}, []])(
    'keeps paid CRM editing disabled for absent or invalid configuration %p',
    (value) => {
      const service = makeService(value);
      expect(service.isCrmHistoryEditingEnabled()).toBe(false);
      expect(service.getFeatures()).toEqual({ crmHistoryEditingEnabled: false });
      expect(() => service.assertCrmHistoryEditingEnabled()).toThrow(ForbiddenException);
      try {
        service.assertCrmHistoryEditingEnabled();
      } catch (error) {
        expect((error as ForbiddenException).getStatus()).toBe(403);
        expect((error as ForbiddenException).getResponse()).toMatchObject({ code: 'CRM_HISTORY_EDITING_DISABLED' });
      }
    },
  );

  it.each(['true', 'TRUE', ' true '])('enables editing only for the explicit true setting %p', (value) => {
    const service = makeService(value);
    expect(service.isCrmHistoryEditingEnabled()).toBe(true);
    expect(service.getFeatures()).toEqual({ crmHistoryEditingEnabled: true });
    expect(() => service.assertCrmHistoryEditingEnabled()).not.toThrow();
  });

  it('reflects an operator change without rebuilding or recreating the feature service', () => {
    let configured: string | undefined;
    const service = new FeaturesService({ get: () => configured } as unknown as ConfigService);
    expect(service.getFeatures()).toEqual({ crmHistoryEditingEnabled: false });
    configured = 'true';
    expect(service.getFeatures()).toEqual({ crmHistoryEditingEnabled: true });
    configured = 'false';
    expect(service.getFeatures()).toEqual({ crmHistoryEditingEnabled: false });
  });
});
