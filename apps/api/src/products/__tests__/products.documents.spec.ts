import { ProductsService } from '../products.service';

const datum = (id: number, file: string) => ({ id, id_element: 1, id_valeur: id, contenu: file, id_langue: 0 });
const refId = '1f802f21-c6f6-4d9b-9979-546bd6042f87';

describe('PIM documents', () => {
  let prisma: any;
  let sellbase: any;
  let service: ProductsService;
  beforeEach(() => {
    prisma = {
      pimProduct: { findMany: jest.fn().mockResolvedValue([{ id: 'p', name: 'AGL 41 NF' }]), findUnique: jest.fn() },
      pimDocument: { findUnique: jest.fn() }, pimReference: { findUnique: jest.fn() },
    };
    sellbase = { canDownloadDocument: jest.fn().mockReturnValue(true), downloadDocument: jest.fn() };
    service = new ProductsService(prisma, sellbase);
  });

  it('finds exact names despite punctuation and includes SDS from active reference raw data', async () => {
    prisma.pimProduct.findUnique.mockResolvedValue({ id: 'p', name: 'AGL 41 NF', active: true, sellbaseInstanceId: 70322,
      documents: [{ id: 'ft', kind: 'technical_sheet', language: 'fr', fileName: 'ft.pdf', sourceUpdatedAt: null }],
      references: [
        { id: refId, code: 'AGL41NF150', rawData: { '39': datum(39, 'fds.pdf') } },
        { id: 'another', code: 'AGL41NF1FT', rawData: { '39': datum(39, 'fds.pdf') } },
        { id: 'different', code: 'AGL41SPRAY', rawData: { '39': datum(39, 'aerosol.pdf') } },
      ],
    });
    const result = await service.findPimDocumentsByName(' agl-41 nf ');
    expect(result.documents).toHaveLength(3);
    expect(result.documents[1]).toMatchObject({ id: `ref_${refId}_39`, kind: 'safety_sheet', referenceCode: 'AGL41NF150' });
    expect(prisma.pimProduct.findUnique.mock.calls[0][0].include.references.where).toEqual({ active: true });
  });

  it('never substitutes a different product grade', async () => {
    await expect(service.findPimDocumentsByName('AGL 41')).rejects.toThrow('PIM product not found');
  });

  it('keeps a plus suffix distinct from the archived base product', async () => {
    prisma.pimProduct.findMany.mockResolvedValue([{ id: 'plus', name: 'STARNET+' }]);
    await expect(service.findPimDocumentsByName('STARNET')).rejects.toThrow('PIM product not found');
    prisma.pimProduct.findUnique.mockResolvedValue({ id: 'plus', name: 'STARNET+', active: true, documents: [], references: [] });
    await expect(service.findPimDocumentsByName('STARNET +')).resolves.toMatchObject({ product: { name: 'STARNET+' } });
  });

  it('downloads a reference SDS only from the known reference characteristic', async () => {
    prisma.pimReference.findUnique.mockResolvedValue({ active: true, rawData: { '39': datum(39, 'folder/sds.pdf') }, product: { active: true, sellbaseInstanceId: 7 } });
    sellbase.downloadDocument.mockResolvedValue(new Response('%PDF-1.7\nSDS'));
    const file = await service.downloadPimDocument(`ref_${refId}_39`);
    expect(file.fileName).toBe('sds.pdf');
    expect(file.buffer.toString()).toContain('%PDF');
    expect(sellbase.downloadDocument).toHaveBeenCalledWith('folder/sds.pdf', { productInstanceId: 7, kind: 'safety_sheet', language: 'fr' });
    await expect(service.downloadPimDocument(`ref_${refId}_9999`)).rejects.toThrow('Document not found');
  });

  it('rejects HTML error pages served with HTTP 200', async () => {
    prisma.pimDocument.findUnique.mockResolvedValue({ fileName: 'ft.pdf', kind: 'technical_sheet', product: { active: true, sellbaseInstanceId: 7 } });
    sellbase.downloadDocument.mockResolvedValue(new Response('<html>Not found</html>', { headers: { 'content-type': 'application/pdf' } }));
    await expect(service.downloadPimDocument('doc')).rejects.toThrow('Document temporarily unavailable');
  });

  it.each([
    ['<html><!-- %PDF-1.7 --><body>Missing file</body></html>', 'application/pdf'],
    ['%PDF-1.7\nWrong response type', 'text/html'],
  ])('rejects misleading HTML or embedded PDF markers (%s)', async (body, contentType) => {
    prisma.pimDocument.findUnique.mockResolvedValue({ fileName: 'sds.pdf', kind: 'safety_sheet', product: { active: true } });
    sellbase.downloadDocument.mockResolvedValue(new Response(body, { headers: { 'content-type': contentType } }));
    await expect(service.downloadPimDocument('doc')).rejects.toThrow('Document temporarily unavailable');
  });

  it('preserves a valid FT PDF served as binary data', async () => {
    prisma.pimDocument.findUnique.mockResolvedValue({ fileName: 'ft.pdf', kind: 'technical_sheet', language: 'fr', product: { active: true, sellbaseInstanceId: 70322 } });
    sellbase.downloadDocument.mockResolvedValue(new Response('%PDF-1.7\nTechnical sheet', { headers: { 'content-type': 'application/octet-stream' } }));
    const result = await service.downloadPimDocument('doc');
    expect(result).toMatchObject({ fileName: 'ft.pdf', contentType: 'application/pdf' });
    expect(result.buffer.toString()).toBe('%PDF-1.7\nTechnical sheet');
  });

  it('refuses missing, deactivated and unconfigured documents', async () => {
    prisma.pimDocument.findUnique.mockResolvedValue(null);
    await expect(service.downloadPimDocument('doc')).rejects.toThrow('Document not found');
    prisma.pimDocument.findUnique.mockResolvedValue({ product: { active: false } });
    await expect(service.downloadPimDocument('doc')).rejects.toThrow('Document not found');
    prisma.pimDocument.findUnique.mockResolvedValue({ kind: 'safety_sheet', product: { active: true } });
    sellbase.canDownloadDocument.mockReturnValue(false);
    await expect(service.downloadPimDocument('doc')).rejects.toThrow('Document access is not configured');
    expect(sellbase.downloadDocument).not.toHaveBeenCalled();
  });

  it('rejects oversize responses before reading their body', async () => {
    prisma.pimDocument.findUnique.mockResolvedValue({ kind: 'technical_sheet', product: { active: true } });
    sellbase.downloadDocument.mockResolvedValue(new Response('%PDF-1.7', { headers: { 'content-length': String(21 * 1024 * 1024) } }));
    await expect(service.downloadPimDocument('doc')).rejects.toThrow('Document temporarily unavailable');
  });

  it('caps streamed PDFs even when the upstream omits content-length', async () => {
    prisma.pimDocument.findUnique.mockResolvedValue({ fileName: 'sds.pdf', kind: 'safety_sheet', product: { active: true } });
    const cancel = jest.fn();
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('%PDF-1.7\n'));
        controller.enqueue(new Uint8Array(20 * 1024 * 1024));
      },
      cancel,
    });
    sellbase.downloadDocument.mockResolvedValue(new Response(body));
    await expect(service.downloadPimDocument('doc')).rejects.toThrow('Document temporarily unavailable');
    expect(cancel).toHaveBeenCalled();
  });
});
