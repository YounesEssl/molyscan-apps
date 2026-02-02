import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RagService } from './rag/rag.service';
import { CreateConversationDto } from './dto/create-conversation.dto';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private ragService: RagService,
  ) {}

  async getConversations(userId: string) {
    const conversations = await this.prisma.aIConversation.findMany({
      where: { userId },
      include: { messages: { orderBy: { timestamp: 'desc' }, take: 1 } },
      orderBy: { updatedAt: 'desc' },
    });

    return conversations.map((c) => ({
      id: c.id,
      scanId: c.scanId,
      product: {
        scannedName: c.scannedName,
        scannedBrand: c.scannedBrand,
        molydalName: c.molydalName,
        molydalReference: c.molydalReference,
      },
      messages: c.messages.map((m) => ({
        id: m.id,
        conversationId: m.conversationId,
        role: m.role,
        text: m.text,
        timestamp: m.timestamp.toISOString(),
        sources: m.sources,
      })),
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));
  }

  async createConversation(userId: string, dto: CreateConversationDto) {
    const conversation = await this.prisma.aIConversation.create({
      data: {
        scanId: dto.scanId,
        scannedName: dto.product.scannedName,
        scannedBrand: dto.product.scannedBrand,
        molydalName: dto.product.molydalName,
        molydalReference: dto.product.molydalReference,
        userId,
      },
    });

    return {
      id: conversation.id,
      scanId: conversation.scanId,
      product: {
        scannedName: conversation.scannedName,
        scannedBrand: conversation.scannedBrand,
        molydalName: conversation.molydalName,
        molydalReference: conversation.molydalReference,
      },
      messages: [],
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
    };
  }

  async getMessages(conversationId: string, userId: string) {
    const conversation = await this.prisma.aIConversation.findFirst({
      where: { id: conversationId, userId },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');

    const messages = await this.prisma.aIMessage.findMany({
      where: { conversationId },
      orderBy: { timestamp: 'asc' },
    });

    return messages.map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      role: m.role,
      text: m.text,
      timestamp: m.timestamp.toISOString(),
      sources: m.sources,
    }));
  }

  async sendMessage(conversationId: string, userId: string, text: string) {
    const conversation = await this.prisma.aIConversation.findFirst({
      where: { id: conversationId, userId },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');

    // Save user message
    const userMessage = await this.prisma.aIMessage.create({
      data: {
        conversationId,
        role: 'user',
        text,
        sources: [],
      },
    });

    // Get conversation history for context
    const history = await this.prisma.aIMessage.findMany({
      where: { conversationId },
      orderBy: { timestamp: 'asc' },
      take: 20,
    });

    // Generate AI response via RAG
    const aiResult = await this.ragService.generateResponse({
      question: text,
      conversationHistory: history.map((m) => ({
        role: m.role as 'user' | 'assistant',
        text: m.text,
      })),
      productContext: {
        scannedName: conversation.scannedName,
        scannedBrand: conversation.scannedBrand,
        molydalName: conversation.molydalName,
        molydalReference: conversation.molydalReference,
      },
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

    // Update conversation timestamp
    await this.prisma.aIConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return {
      userMessage: {
        id: userMessage.id,
        conversationId: userMessage.conversationId,
        role: userMessage.role,
        text: userMessage.text,
        timestamp: userMessage.timestamp.toISOString(),
        sources: userMessage.sources,
      },
      aiResponse: {
        id: aiMessage.id,
        conversationId: aiMessage.conversationId,
        role: aiMessage.role,
        text: aiMessage.text,
        timestamp: aiMessage.timestamp.toISOString(),
        sources: aiMessage.sources,
      },
    };
  }
}
