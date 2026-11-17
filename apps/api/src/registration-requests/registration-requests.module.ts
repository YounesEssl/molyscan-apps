import { Module } from '@nestjs/common';
import { RegistrationApprovalService } from './registration-approval.service';
import { RegistrationRequestsController } from './registration-requests.controller';

@Module({
  controllers: [RegistrationRequestsController],
  providers: [RegistrationApprovalService],
  exports: [RegistrationApprovalService],
})
export class RegistrationRequestsModule {}
