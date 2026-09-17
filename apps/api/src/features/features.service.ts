import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FeaturesService {
  constructor(private readonly config: ConfigService) {}

  isCrmHistoryEditingEnabled(): boolean {
    // This is an operator setting, never a permission supplied by the client.
    // Missing or malformed configuration keeps the paid feature disabled.
    const value = this.config.get<unknown>('CRM_HISTORY_EDITING_ENABLED');
    return typeof value === 'string' && value.trim().toLowerCase() === 'true';
  }

  getFeatures() {
    return { crmHistoryEditingEnabled: this.isCrmHistoryEditingEnabled() };
  }

  assertCrmHistoryEditingEnabled(): void {
    if (!this.isCrmHistoryEditingEnabled()) {
      throw new ForbiddenException({
        code: 'CRM_HISTORY_EDITING_DISABLED',
        message: 'CRM history editing is not enabled',
      });
    }
  }
}
