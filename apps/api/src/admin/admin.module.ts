import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminInsightsService } from './admin-insights.service';
import { DepartmentsModule } from '../departments/departments.module';

@Module({
  imports: [DepartmentsModule],
  controllers: [AdminController],
  providers: [AdminService, AdminInsightsService],
})
export class AdminModule {}
