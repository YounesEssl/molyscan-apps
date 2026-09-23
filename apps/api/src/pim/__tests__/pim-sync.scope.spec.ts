import { PimSyncService } from '../pim-sync.service';
import { MOLYDAL_ARCHIVE_ELEMENT_ID as ARCHIVE } from '../pim-scope';
import type { SellbaseElement } from '../sellbase.client';

const row = (id: number, folder = 2): SellbaseElement => ({ element_id_2: folder, element_id_3: 3, element_id_4: id, instance_id_4: id });
const datum = (id: number, contenu: string) => ({ id_element: id, id_valeur: 15, contenu });

function fixture() {
  const activeRows = Array.from({ length: 100 }, (_, i) => row(i + 1));
  // An old product is now archived but still has another placement. An unnamed
  // product remains in the source tree but must not reactivate its references.
  const products = [...activeRows, row(999, ARCHIVE), row(999), row(888)];
  const references: SellbaseElement[] = [...activeRows.map((r) => ({ ...r, element_id_5: 1000 + Number(r.element_id_4) })),
    { ...row(999, ARCHIVE), element_id_5: 1999 }, { ...row(999), element_id_5: 1999 },
    { ...row(888), element_id_5: 1888 }];
  const data = Object.fromEntries([...activeRows, row(999)].map((r) => [String(r.element_id_4), { '15': datum(Number(r.element_id_4), `Oil ${r.element_id_4}`) }]));
  const storedProducts = new Map<number, any>([999, 888].map((id) => [id, { id: `p${id}`, sellbaseElementId: id, active: true, productType: 'lubricant', name: `Old ${id}`, rawData: {}, references: [] }]));
  const storedReferences = new Map<number, any>([1999, 1888].map((id) => [id, { sellbaseElementId: id, active: true }]));
  const indexState = { active: 'old-index' };
  const prisma: any = {
    $queryRaw: jest.fn().mockResolvedValue([{ locked: true }]),
    $executeRaw: jest.fn().mockResolvedValue(1),
    $executeRawUnsafe: jest.fn().mockResolvedValue(1),
    ragSyncRun: { update: jest.fn().mockResolvedValue({}) },
    pimProduct: {
      findMany: jest.fn().mockImplementation(({ where } = {}) => Promise.resolve([...storedProducts.values()].filter((p) => !where?.active || p.active))),
      upsert: jest.fn().mockImplementation(({ create }) => {
        const result = { ...create, id: `p${create.sellbaseElementId}`, references: [] };
        storedProducts.set(create.sellbaseElementId, result);
        return Promise.resolve(result);
      }),
      updateMany: jest.fn().mockImplementation(({ where }) => {
        let count = 0;
        for (const p of storedProducts.values()) if (p.active && !where.sellbaseElementId.notIn.includes(p.sellbaseElementId)) { p.active = false; count++; }
        return Promise.resolve({ count });
      }),
    },
    pimReference: {
      upsert: jest.fn().mockImplementation(({ create }) => { storedReferences.set(create.sellbaseElementId, create); return Promise.resolve(create); }),
      updateMany: jest.fn().mockImplementation(({ where }) => {
        for (const r of storedReferences.values()) if (!where.sellbaseElementId.notIn.includes(r.sellbaseElementId)) r.active = false;
        return Promise.resolve({ count: 2 });
      }),
    },
    pimDocument: { upsert: jest.fn(), deleteMany: jest.fn().mockResolvedValue({}) },
    ragIndexVersion: {
      create: jest.fn().mockResolvedValue({ id: 'new-index' }),
      findFirst: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockImplementation(({ where, data }) => {
        if (data.status === 'active') indexState.active = where.id;
        return Promise.resolve({});
      }),
      updateMany: jest.fn().mockResolvedValue({}),
    },
  };
  prisma.$transaction = jest.fn().mockImplementation((fn) => fn(prisma));
  const sellbase = {
    catalogBaseId: 0, excludedFolderIds: [ARCHIVE],
    getElements: jest.fn().mockImplementation((level) => Promise.resolve(level === 4 ? products : references)),
    getPublishedData: jest.fn().mockResolvedValue(data),
  };
  const service = new PimSyncService(prisma, sellbase as any, { model: 'test', dimensions: 2, generateEmbedding: jest.fn().mockResolvedValue([0.1, 0.2]) } as any, {} as any);
  const validate = jest.spyOn(service as any, 'validateIndex').mockResolvedValue({ passed: 5, total: 5 });
  return { prisma, sellbase, service, validate, indexState, storedProducts, storedReferences, activeRows, products, references, data };
}

describe('PIM archive synchronization', () => {
  it('deactivates old archives/references and builds and activates a new index containing only retained products', async () => {
    const f = fixture();
    await (f.service as any).execute('run');
    expect(f.storedProducts.get(999).active).toBe(false);
    expect(f.storedProducts.get(888).active).toBe(false);
    expect(f.storedReferences.get(1999).active).toBe(false);
    expect(f.storedReferences.get(1888).active).toBe(false);
    expect(f.prisma.pimProduct.upsert).toHaveBeenCalledTimes(100);
    expect(f.prisma.pimReference.upsert).toHaveBeenCalledTimes(100);
    expect(f.prisma.$executeRawUnsafe).toHaveBeenCalledTimes(100);
    const indexedProducts = f.prisma.$executeRawUnsafe.mock.calls.map((args: any[]) => args[3]);
    expect(indexedProducts).not.toContain('p999');
    expect(indexedProducts).not.toContain('p888');
    expect(f.indexState.active).toBe('new-index');
    expect(f.prisma.ragSyncRun.update).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'completed', details: { catalogBaseId: 0, scope: 'master', excludedFolderIds: [ARCHIVE], productsExcluded: 1, referencesExcluded: 1 } }) }));
  });

  it('cannot satisfy safety thresholds with duplicate product placements', async () => {
    const f = fixture();
    f.sellbase.getElements.mockImplementation((level) => Promise.resolve(level === 4 ? Array.from({ length: 200 }, () => row(1)) : []));
    await (f.service as any).execute('run');
    expect(f.prisma.pimProduct.upsert).not.toHaveBeenCalled();
    expect(f.prisma.pimProduct.updateMany).not.toHaveBeenCalled();
    expect(f.indexState.active).toBe('old-index');
    expect(f.prisma.ragSyncRun.update).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'failed', error: expect.stringContaining('incomplete master tree') }) }));
  });

  it('stops before catalogue mutations if the data endpoint returns incomplete names', async () => {
    const f = fixture();
    delete f.data['1'];
    await (f.service as any).execute('run');
    expect(f.prisma.pimProduct.upsert).not.toHaveBeenCalled();
    expect(f.prisma.pimProduct.updateMany).not.toHaveBeenCalled();
    expect(f.prisma.pimReference.updateMany).not.toHaveBeenCalled();
    expect(f.indexState.active).toBe('old-index');
  });

  it('keeps the previous index active if retrieval validation fails', async () => {
    const f = fixture();
    f.validate.mockRejectedValue(new Error('RAG validation failed'));
    await (f.service as any).execute('run');
    expect(f.indexState.active).toBe('old-index');
    expect(f.prisma.$transaction).not.toHaveBeenCalled();
    expect(f.prisma.ragIndexVersion.update).toHaveBeenCalledWith({ where: { id: 'new-index' }, data: { status: 'failed', metrics: { error: 'RAG validation failed' } } });
  });

  it('consults master archives before importing a publication', async () => {
    const f = fixture();
    f.sellbase.catalogBaseId = 52903;
    f.sellbase.getElements.mockImplementation((level, baseId) => Promise.resolve(baseId === 0 ? (level === 4 ? f.products : f.references) : (level === 4 ? [...f.activeRows, row(999)] : f.references.filter((r) => r.element_id_2 !== ARCHIVE))));
    await (f.service as any).execute('run');
    expect(f.sellbase.getElements).toHaveBeenCalledWith(4, 0);
    expect(f.sellbase.getElements).toHaveBeenCalledWith(5, 0);
    expect(f.storedProducts.get(999).active).toBe(false);
    expect(f.storedReferences.get(1999).active).toBe(false);
  });

  it('stops a publication import if master archive membership cannot be checked', async () => {
    const f = fixture();
    f.sellbase.catalogBaseId = 52903;
    f.sellbase.getElements.mockImplementation((level, baseId) => Promise.resolve(baseId === 0 ? [] : (level === 4 ? f.activeRows : f.references)));
    await (f.service as any).execute('run');
    expect(f.prisma.pimProduct.upsert).not.toHaveBeenCalled();
    expect(f.prisma.pimProduct.updateMany).not.toHaveBeenCalled();
    expect(f.indexState.active).toBe('old-index');
  });
});
