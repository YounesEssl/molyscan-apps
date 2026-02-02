import {
  Controller, Get, Post, Patch, Body, Param, UseGuards, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../common/guards/permissions.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { VoiceNotesService } from './voice-notes.service';
import { CreateVoiceNoteDto } from './dto/create-voice-note.dto';
import { UpdateVoiceNoteDto } from './dto/update-voice-note.dto';

@ApiTags('Voice Notes')
@Controller('voice-notes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('canUpdateCRM')
@ApiBearerAuth()
export class VoiceNotesController {
  constructor(private voiceNotesService: VoiceNotesService) {}

  @Get()
  @ApiOperation({ summary: 'List voice notes' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.voiceNotesService.findAll(user.sub);
  }

  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('audio'))
  @ApiOperation({ summary: 'Create voice note with audio upload' })
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateVoiceNoteDto,
    @UploadedFile() audio?: Express.Multer.File,
  ) {
    return this.voiceNotesService.create(user.sub, dto, audio);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get voice note details' })
  findById(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.voiceNotesService.findById(id, user.sub);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update voice note CRM fields' })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateVoiceNoteDto,
  ) {
    return this.voiceNotesService.update(id, user.sub, dto);
  }
}
