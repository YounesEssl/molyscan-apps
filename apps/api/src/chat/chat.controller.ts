import {
  Controller, Get, Post, Delete, Body, Param, Res, UseGuards,
  UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { ApiBearerAuth, ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { ChatService } from './chat.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CreateFreeConversationDto } from './dto/create-free-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { TranscriptionService } from '../voice-notes/transcription/transcription.service';
import { AttachmentStore } from './attachment.store';
import { UploadAttachmentDto } from './dto/upload-attachment.dto';

@ApiTags('Chat')
@Controller('chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatController {
  constructor(
    private chatService: ChatService,
    private transcriptionService: TranscriptionService,
    private attachmentStore: AttachmentStore,
  ) {}

  // ── Voice-to-text ──────────────────────────────────────────────

  @Post('transcribe')
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('audio'))
  @ApiOperation({ summary: 'Transcribe audio to text (for chat composer dictation)' })
  async transcribe(
    @UploadedFile() audio?: Express.Multer.File,
  ): Promise<{ transcription: string }> {
    if (!audio?.buffer) {
      throw new BadRequestException('Audio file required');
    }
    const transcription = await this.transcriptionService.transcribe(audio.buffer, audio.originalname);
    return { transcription: transcription ?? '' };
  }

  // ── File attachments ──────────────────────────────────────────

  @Post('attachments')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Upload a file (PDF) to attach to the next message' })
  uploadAttachment(@Body() body: UploadAttachmentDto): { attachmentId: string } {
    if (!body.base64) throw new BadRequestException('File required');

    const bytes = Buffer.from(body.base64, 'base64');
    const header = bytes.slice(0, 1024).toString('latin1');
    if (!header.includes('%PDF-')) {
      throw new BadRequestException('Invalid PDF — file is not a valid PDF document');
    }

    const attachmentId = this.attachmentStore.put(body.base64, body.mediaType, body.filename);
    return { attachmentId };
  }

  // ── Conversations (all types) ──────────────────────────────────

  @Get('conversations')
  @ApiOperation({ summary: 'List all AI conversations (free + product)' })
  getConversations(@CurrentUser() user: JwtPayload) {
    return this.chatService.getConversations(user.sub);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get a single conversation with scan context if linked' })
  getConversationById(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.chatService.getConversationById(id, user.sub);
  }

  @Post('conversations')
  @ApiOperation({ summary: 'Create a product-linked conversation' })
  createConversation(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateConversationDto,
  ) {
    return this.chatService.createConversation(user.sub, dto);
  }

  @Post('conversations/free')
  @ApiOperation({ summary: 'Create a free chat conversation' })
  createFreeConversation(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateFreeConversationDto,
  ) {
    return this.chatService.createFreeConversation(user.sub, dto.title);
  }

  @Delete('conversations/:id')
  @ApiOperation({ summary: 'Delete a conversation' })
  deleteConversation(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.chatService.deleteConversation(id, user.sub);
  }

  @Post('conversations/:id/submit')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Flag a conversation for analysis (stored in DB for review)' })
  submitConversation(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.chatService.submitConversationForAnalysis(id, user.sub);
  }

  // ── Messages ───────────────────────────────────────────────────

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get conversation messages' })
  getMessages(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.chatService.getMessages(id, user.sub);
  }

  @Post('conversations/:id/messages')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Send a message (non-streaming, product chat)' })
  sendMessage(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(id, user.sub, dto.text);
  }

  // ── Free chat SSE streaming ────────────────────────────────────

  @Post('conversations/:id/stream')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Send a message with SSE streaming response' })
  async streamMessage(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      const attachment = dto.attachmentId
        ? this.attachmentStore.get(dto.attachmentId)
        : undefined;

      const { stream, sources } = await this.chatService.streamMessage(
        id,
        user.sub,
        dto.text,
        attachment,
      );

      let fullContent = '';

      stream.on('text', (text: string) => {
        fullContent += text;
        res.write(
          `data: ${JSON.stringify({ type: 'text', content: text })}\n\n`,
        );
      });

      await stream.finalMessage();

      // Persist the AI response after streaming completes
      await this.chatService.saveAssistantMessage(id, fullContent, sources);
      if (dto.attachmentId) this.attachmentStore.remove(dto.attachmentId);

      res.write(
        `data: ${JSON.stringify({ type: 'sources', sources })}\n\n`,
      );
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Internal error';
      res.write(
        `data: ${JSON.stringify({ type: 'text', content: `Error: ${msg}` })}\n\n`,
      );
      res.end();
    }
  }
}
