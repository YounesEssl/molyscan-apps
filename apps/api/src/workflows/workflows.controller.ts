import {
  Controller, Get, Post, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { WorkflowsService } from './workflows.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { ApproveWorkflowDto, RejectWorkflowDto } from './dto/review-workflow.dto';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { WorkflowStatus } from '@prisma/client';
import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

class WorkflowFiltersDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: WorkflowStatus })
  @IsOptional()
  @IsEnum(WorkflowStatus)
  status?: WorkflowStatus;
}

@ApiTags('Workflows')
@Controller('workflows')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class WorkflowsController {
  constructor(private workflowsService: WorkflowsService) {}

  @Get()
  @ApiOperation({ summary: 'List price workflows' })
  findAll(@CurrentUser() user: JwtPayload, @Query() filters: WorkflowFiltersDto) {
    return this.workflowsService.findAll(user.sub, user.role, filters, filters.status);
  }

  @Post()
  @ApiOperation({ summary: 'Create a price request workflow' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateWorkflowDto) {
    return this.workflowsService.create(user.sub, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get workflow details' })
  findById(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.workflowsService.findById(id, user.sub, user.role);
  }

  @Post(':id/approve')
  @Roles('admin')
  @ApiOperation({ summary: 'Approve a workflow (admin only)' })
  approve(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: ApproveWorkflowDto,
  ) {
    return this.workflowsService.approve(id, user.sub, dto);
  }

  @Post(':id/reject')
  @Roles('admin')
  @ApiOperation({ summary: 'Reject a workflow (admin only)' })
  reject(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: RejectWorkflowDto,
  ) {
    return this.workflowsService.reject(id, user.sub, dto);
  }
}
