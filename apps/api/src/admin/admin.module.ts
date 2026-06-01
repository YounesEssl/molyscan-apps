import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { DepartmentsModule } from '../departments/departments.module';

@Module({
  imports: [DepartmentsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
