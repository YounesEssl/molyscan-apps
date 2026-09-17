import { ChatService } from '../chat.service';

describe('Product context in non-streaming chat', () => {
  let service: ChatService;
  let rag: any;
  let documents: any;
  const product = { scannedBrand: 'Brand', scannedName: 'Product 68', molydalName: 'OLD GUESS', molydalReference: '' };

  beforeEach(() => {
    const prisma = {
      aIConversation: { findFirst: jest.fn().mockResolvedValue({ type: 'product', title: 'Scan chat', ...product }), update: jest.fn() },
      aIMessage: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockImplementation(async ({ data }) => ({ id: 'message', timestamp: new Date(), ...data })),
      },
    };
    rag = { generateResponse: jest.fn().mockResolvedValue({ text: 'Aucun équivalent.', sources: [] }) };
    documents = { answer: jest.fn().mockResolvedValue(null) };
    service = new ChatService(prisma as any, rag, {} as any, documents);
  });

  it('lets RAG check the scan expert decision even when the user does not repeat the product name', async () => {
    await service.sendMessage('conversation', 'user', 'Quel équivalent ?');
    expect(rag.generateResponse).toHaveBeenCalledWith({
      question: 'Quel équivalent ?', productContext: product, conversationHistory: [],
    });
  });

  it('keeps verified document replies ahead of RAG', async () => {
    documents.answer.mockResolvedValue({ text: 'Document vérifié', sources: [] });
    const response = await service.sendMessage('conversation', 'user', 'Et sa FT ?');
    expect(response.aiResponse.text).toBe('Document vérifié');
    expect(rag.generateResponse).not.toHaveBeenCalled();
  });
});
