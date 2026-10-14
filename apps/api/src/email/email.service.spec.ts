import { EmailService } from './email.service';

const mockSend = jest.fn();
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({ emails: { send: mockSend } })),
}));

describe('completed scan email', () => {
  let service: EmailService;

  beforeEach(() => {
    mockSend.mockReset();
    mockSend.mockResolvedValue({ data: { id: 'email-1' }, error: null });
    service = new EmailService({
      get: (key: string, fallback?: string) => key === 'RESEND_API_KEY' ? 'test-key' : fallback,
    } as any);
  });

  it('sends the full scan answer as escaped, full-width HTML and plain text', async () => {
    await service.sendCompletedScanToCommercials({
      scanId: 'scan-1', scannedAt: new Date('2026-10-12T10:00:00Z'),
      recipients: ['one@molydal.com', 'two@molydal.com'],
      distributor: {
        firstName: 'Jean', lastName: 'Dupont', email: 'jean@example.com',
        company: 'SEFI <Nord>',
      },
      departments: ['Ardèche'],
      identifiedName: 'AGL 65 AL', identifiedBrand: 'Concurrent',
      equivalents: [{ name: 'AL SI 55', compatibility: 91, reason: '<script>danger</script>' }],
      molydalEquivalent: 'AL SI 55', analysis: 'Réponse complète\nDeuxième ligne',
    });

    const [message, options] = mockSend.mock.calls[0];
    expect(message.to).toEqual(['one@molydal.com', 'two@molydal.com']);
    expect(message.subject).toContain('Concurrent AGL 65 AL');
    expect(message.text).toContain('AL SI 55 (91 %) — <script>danger</script>');
    expect(message.text).toContain('Réponse complète\nDeuxième ligne');
    expect(message.html).toContain('SEFI &lt;Nord&gt;');
    expect(message.html).toContain('&lt;script&gt;danger&lt;/script&gt;');
    expect(message.html).not.toContain('<script>danger</script>');
    expect(message.html).not.toMatch(/max-width|margin:\s*auto/);
    expect(options).toEqual({ idempotencyKey: 'molyscan-scan-scan-1' });
  });

  it('explains when the scan produced no equivalent', async () => {
    await service.sendCompletedScanToCommercials({
      scanId: 'scan-2', scannedAt: new Date('2026-10-12T10:00:00Z'),
      recipients: ['one@molydal.com'],
      distributor: { firstName: 'Jean', lastName: 'Dupont', email: 'jean@example.com' },
      departments: ['Ardèche'],
      identifiedName: null, identifiedBrand: null, molydalEquivalent: null,
      equivalents: [], analysis: 'Aucun produit identifié.',
    });
    expect(mockSend.mock.calls[0][0].text).toContain('Aucun équivalent proposé.');
    expect(mockSend.mock.calls[0][0].text).toContain('Aucun produit identifié.');
  });
});
