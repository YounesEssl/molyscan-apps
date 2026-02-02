import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Expo, { ExpoPushMessage } from 'expo-server-sdk';

@Injectable()
export class PushService {
  private expo: Expo;
  private readonly logger = new Logger(PushService.name);

  constructor(private configService: ConfigService) {
    const accessToken = this.configService.get<string>('EXPO_PUSH_ACCESS_TOKEN');
    this.expo = new Expo({ accessToken: accessToken || undefined });
  }

  async sendPush(
    pushToken: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ) {
    if (!Expo.isExpoPushToken(pushToken)) {
      this.logger.warn(`Invalid Expo push token: ${pushToken}`);
      return;
    }

    const message: ExpoPushMessage = {
      to: pushToken,
      sound: 'default',
      title,
      body,
      data: data || {},
    };

    try {
      const [ticket] = await this.expo.sendPushNotificationsAsync([message]);
      this.logger.log(`Push sent: ${JSON.stringify(ticket)}`);
    } catch (error) {
      this.logger.error(`Push failed: ${error}`);
    }
  }
}
