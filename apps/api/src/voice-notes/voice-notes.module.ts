import { Module } from '@nestjs/common';
import { VoiceNotesController } from './voice-notes.controller';
import { VoiceNotesService } from './voice-notes.service';
import { TranscriptionService } from './transcription/transcription.service';

@Module({
  controllers: [VoiceNotesController],
  providers: [VoiceNotesService, TranscriptionService],
})
export class VoiceNotesModule {}
