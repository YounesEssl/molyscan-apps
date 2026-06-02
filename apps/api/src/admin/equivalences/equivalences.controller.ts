import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { EquivalencesService } from './equivalences.service';
import { CreateEquivalenceDto } from './dto/create-equivalence.dto';
import { UpdateEquivalenceDto } from './dto/update-equivalence.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Admin - Équivalences')
@ApiBearerAuth()
@Controller('admin/equivalences')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class EquivalencesController {
  constructor(private readonly equivalencesService: EquivalencesService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les équivalences validées' })
  list(@Query('search') search?: string) {
    return this.equivalencesService.list(search);
  }

  @Get('pending')
  @ApiOperation({
    summary: 'Concurrents scannés sans équivalence validée (file à valider)',
  })
  pending() {
    return this.equivalencesService.listPending();
  }

  @Post()
  @ApiOperation({ summary: 'Créer une équivalence' })
  create(
    @Body() dto: CreateEquivalenceDto,
    @CurrentUser('email') email: string,
  ) {
    return this.equivalencesService.create(dto, email);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier une équivalence' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEquivalenceDto,
    @CurrentUser('email') email: string,
  ) {
    return this.equivalencesService.update(id, dto, email);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une équivalence' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.equivalencesService.remove(id);
  }
}
