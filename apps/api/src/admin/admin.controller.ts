import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { ApproveAccessRequestDto } from './dto/approve-access-request.dto';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('departments')
  @ApiOperation({ summary: 'List all departments' })
  listDepartments() {
    return this.adminService.listDepartments();
  }

  @Post('departments')
  @ApiOperation({ summary: 'Create a department' })
  createDepartment(@Body() dto: CreateDepartmentDto) {
    return this.adminService.createDepartment(dto.name);
  }

  @Get('access-requests')
  @ApiOperation({ summary: 'List pending account requests' })
  listAccessRequests() {
    return this.adminService.listAccessRequests();
  }

  @Post('access-requests/:id/approve')
  @ApiOperation({
    summary: 'Approve a pending account and assign departments',
  })
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveAccessRequestDto,
  ) {
    return this.adminService.approveAccessRequest(id, dto.departmentIds);
  }

  @Post('access-requests/:id/reject')
  @ApiOperation({ summary: 'Reject a pending account' })
  reject(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.rejectAccessRequest(id);
  }

  @Get('users')
  @ApiOperation({ summary: 'List users (filter by search, status, role)' })
  listUsers(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('role') role?: string,
  ) {
    return this.adminService.listUsers({ search, status, role });
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Update a user role, status or departments' })
  updateUser(
    @CurrentUser('sub') adminId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.adminService.updateUser(adminId, id, dto);
  }

  @Get('price-requests')
  @ApiOperation({
    summary: 'List price requests with distributor, department and recipients',
  })
  listPriceRequests() {
    return this.adminService.listPriceRequests();
  }
}
