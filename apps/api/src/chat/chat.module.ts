import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { RagModule } from './rag/rag.module';
import { TranscriptionService } from '../voice-notes/transcription/transcription.service';
import { AttachmentStore } from './attachment.store';
import { ProductsModule } from '../products/products.module';
import { ChatDocumentsService } from './chat-documents.service';

@Module({
  imports: [RagModule, ProductsModule],
  controllers: [ChatController],
  providers: [ChatService, TranscriptionService, AttachmentStore, ChatDocumentsService],
})
export class ChatModule {}
