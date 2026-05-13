import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../prisma/prisma.service';
import { RagService } from './rag/rag.service';
import { StorageService } from '../storage/storage.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import type { AttachmentEntry } from './attachment.store';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private prisma: PrismaService,
    private ragService: RagService,
    private storage: StorageService,
  ) {}

  // ── Helpers ────────────────────────────────────────────────────

  private formatConversation(c: any) {
    return {
      id: c.id,
      type: c.type,
      title: c.title,
      scanId: c.scanId,
      product: c.scannedName
        ? {
            scannedName: c.scannedName,
            scannedBrand: c.scannedBrand,
            molydalName: c.molydalName,
            molydalReference: c.molydalReference,
          }
        : null,
      lastMessage: c.messages?.[0]
        ? {
            role: c.messages[0].role,
            text: c.messages[0].text,
            timestamp: c.messages[0].timestamp.toISOString(),
          }
        : null,
      messageCount: c._count?.messages ?? 0,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    };
  }

  private formatMessage(m: any) {
    return {
      id: m.id,
      conversationId: m.conversationId,
      role: m.role,
      text: m.text,
      timestamp: m.timestamp.toISOString(),
      sources: m.sources,
    };
  }

  // ── Conversations ──────────────────────────────────────────────

  async getConversations(userId: string) {
    const conversations = await this.prisma.aIConversation.findMany({
      where: { userId },
      include: {
        messages: { orderBy: { timestamp: 'desc' }, take: 1 },
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return conversations.map((c) => this.formatConversation(c));
  }

  async getConversationById(id: string, userId: string) {
    const conversation = await this.prisma.aIConversation.findFirst({
      where: { id, userId },
      include: {
        scan: true,
        messages: { orderBy: { timestamp: 'desc' }, take: 1 },
        _count: { select: { messages: true } },
      },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');

    const base = this.formatConversation(conversation);
    const scan = conversation.scan;

    if (!scan) return { ...base, scanContext: null };

    let photoUrl: string | null = null;
    if (scan.photoKey) {
      try {
        photoUrl = await this.storage.getPresignedUrl(scan.photoKey, 60 * 60 * 6);
      } catch (error) {
        this.logger.warn(`Failed to sign scan photo for conversation ${id}: ${error}`);
      }
    }

    return {
      ...base,
      scanContext: {
        id: scan.id,
        photoUrl,
        identifiedName: scan.identifiedName,
        identifiedBrand: scan.identifiedBrand,
        identifiedType: scan.identifiedType,
        identifiedSpecs: scan.identifiedSpecs,
        equivalents: (scan.equivalentsJson as any[]) || [],
        analysisText: scan.analysisText,
        scannedAt: scan.scannedAt.toISOString(),
      },
    };
  }

  async createConversation(userId: string, dto: CreateConversationDto) {
    const conversation = await this.prisma.aIConversation.create({
      data: {
        type: 'product',
        title: `${dto.product.scannedName} → ${dto.product.molydalName}`,
        scanId: dto.scanId,
        scannedName: dto.product.scannedName,
        scannedBrand: dto.product.scannedBrand,
        molydalName: dto.product.molydalName,
        molydalReference: dto.product.molydalReference,
        userId,
      },
      include: {
        messages: { orderBy: { timestamp: 'desc' }, take: 1 },
        _count: { select: { messages: true } },
      },
    });

    return this.formatConversation(conversation);
  }

  async createFreeConversation(userId: string, title?: string) {
    const conversation = await this.prisma.aIConversation.create({
      data: {
        type: 'free',
        title: title || 'Nouvelle conversation',
        userId,
      },
      include: {
        messages: { orderBy: { timestamp: 'desc' }, take: 1 },
        _count: { select: { messages: true } },
      },
    });

    return this.formatConversation(conversation);
  }

  async deleteConversation(id: string, userId: string) {
    const conv = await this.prisma.aIConversation.findFirst({
      where: { id, userId },
    });
    if (!conv) throw new NotFoundException('Conversation not found');

    await this.prisma.aIConversation.delete({ where: { id } });
    return { deleted: true };
  }

  async submitConversationForAnalysis(id: string, userId: string) {
    const conv = await this.prisma.aIConversation.findFirst({
      where: { id, userId },
    });
    if (!conv) throw new NotFoundException('Conversation not found');

    const submission = await this.prisma.conversationSubmission.create({
      data: { conversationId: id, userId },
    });

    return {
      id: submission.id,
      conversationId: submission.conversationId,
      createdAt: submission.createdAt.toISOString(),
    };
  }

  // ── Messages ───────────────────────────────────────────────────

  async getMessages(conversationId: string, userId: string) {
    const conversation = await this.prisma.aIConversation.findFirst({
      where: { id: conversationId, userId },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');

    const messages = await this.prisma.aIMessage.findMany({
      where: { conversationId },
      orderBy: { timestamp: 'asc' },
    });

    return messages.map((m) => this.formatMessage(m));
  }

  async sendMessage(conversationId: string, userId: string, text: string) {
    const conversation = await this.prisma.aIConversation.findFirst({
      where: { id: conversationId, userId },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');

    // Fetch history BEFORE saving the current user message to avoid duplicating
    // it in the messages array sent to Anthropic (history + explicit question)
    const history = await this.prisma.aIMessage.findMany({
      where: { conversationId },
      orderBy: { timestamp: 'asc' },
      take: 20,
    });

    // Save user message
    const userMessage = await this.prisma.aIMessage.create({
      data: { conversationId, role: 'user', text, sources: [] },
    });

    // Generate AI response
    const aiResult = await this.ragService.generateResponse({
      question: text,
      conversationHistory: history.map((m) => ({
        role: m.role as 'user' | 'assistant',
        text: m.text,
      })),
    });

    // Save AI response
    const aiMessage = await this.prisma.aIMessage.create({
      data: {
        conversationId,
        role: 'assistant',
        text: aiResult.text,
        sources: aiResult.sources,
      },
    });

    // Update conversation title + timestamp
    await this.updateConversationMeta(conversationId, text, conversation.title);

    return {
      userMessage: this.formatMessage(userMessage),
      aiResponse: this.formatMessage(aiMessage),
    };
  }

  // ── Streaming ──────────────────────────────────────────────────

  async streamMessage(
    conversationId: string,
    userId: string,
    text: string,
    attachment?: AttachmentEntry,
  ): Promise<{
    stream: ReturnType<Anthropic['messages']['stream']>;
    sources: string[];
  }> {
    const conversation = await this.prisma.aIConversation.findFirst({
      where: { id: conversationId, userId },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');

    // Fetch history BEFORE saving the current user message (same fix as sendMessage)
    const history = await this.prisma.aIMessage.findMany({
      where: { conversationId },
      orderBy: { timestamp: 'asc' },
      take: 20,
    });

    // Save user message
    await this.prisma.aIMessage.create({
      data: { conversationId, role: 'user', text, sources: [] },
    });

    // Update conversation title
    await this.updateConversationMeta(conversationId, text, conversation.title);

    // For product-linked conversations, inject the full scan context into the
    // RAG system prompt so Claude knows exactly what was scanned and why each
    // equivalent was proposed — same data shown in the UI toggle card.
    let productContext: Parameters<typeof this.ragService.generateStreamingResponse>[2] | undefined;

    if (conversation.type === 'product') {
      let scan: any = null;
      if (conversation.scanId) {
        scan = await this.prisma.scan.findUnique({
          where: { id: conversation.scanId },
          select: {
            identifiedType: true,
            identifiedSpecs: true,
            equivalentsJson: true,
            analysisText: true,
          },
        });
      }

      productContext = {
        scannedName: conversation.scannedName,
        scannedBrand: conversation.scannedBrand,
        molydalName: conversation.molydalName,
        molydalReference: conversation.molydalReference,
        identifiedType: scan?.identifiedType ?? null,
        identifiedSpecs: scan?.identifiedSpecs ?? null,
        equivalents: (scan?.equivalentsJson as any[] | null) ?? [],
        analysisText: scan?.analysisText ?? null,
      };
    }

    return this.ragService.generateStreamingResponse(
      text,
      history.map((m) => ({ role: m.role, text: m.text })),
      productContext,
      attachment,
    );
  }

  async saveAssistantMessage(
    conversationId: string,
    text: string,
    sources: string[],
  ) {
    await this.prisma.aIMessage.create({
      data: { conversationId, role: 'assistant', text, sources },
    });

    await this.prisma.aIConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
  }

  // ── Private ────────────────────────────────────────────────────

  private async updateConversationMeta(
    conversationId: string,
    userText: string,
    currentTitle: string,
  ) {
    const data: Record<string, unknown> = { updatedAt: new Date() };

    if (currentTitle === 'Nouvelle conversation' && userText) {
      data.title =
        userText.length > 60 ? userText.slice(0, 60) + '...' : userText;
    }

    await this.prisma.aIConversation.update({
      where: { id: conversationId },
      data,
    });
  }
}
