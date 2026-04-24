import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { RagModule } from './rag/rag.module';
import { TranscriptionService } from '../voice-notes/transcription/transcription.service';

@Module({
  imports: [RagModule],
  controllers: [ChatController],
  providers: [ChatService, TranscriptionService],
})
export class ChatModule {}
