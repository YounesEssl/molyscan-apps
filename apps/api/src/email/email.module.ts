import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';

/**
 * Module global : EmailService est disponible par injection dans n'importe
 * quel autre module sans import explicite (cf. NotificationsModule/PushService).
 */
@Global()
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
