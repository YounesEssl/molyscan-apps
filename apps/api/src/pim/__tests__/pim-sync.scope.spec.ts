import { PimSyncService } from '../pim-sync.service';
import { MOLYDAL_ARCHIVE_ELEMENT_ID as ARCHIVE } from '../pim-scope';
import type { SellbaseElement } from '../sellbase.client';

const row = (id: number, folder = 2): SellbaseElement => ({ element_id_2: folder, element_id_3: 3, element_id_4: id, instance_id_4: id });
const datum = (id: number, contenu: string, carac = 15) => ({ id_element: id, id_valeur: carac, contenu, id_langue: 0 });

function fixture(activeCount = 100) {
  const activeRows = Array.from({ length: activeCount }, (_, i) => row(i + 1));
  // An old product is now archived but still has another placement. An unnamed
  // product remains in the source tree but must not reactivate its references.
  const products = [...activeRows, row(999, ARCHIVE), row(999), row(888)];
  const references: SellbaseElement[] = [...activeRows.map((r) => ({ ...r, element_id_5: 1000 + Number(r.element_id_4) })),
    { ...row(999, ARCHIVE), element_id_5: 1999 }, { ...row(999), element_id_5: 1999 },
    { ...row(888), element_id_5: 1888 }];
  const data: Record<string, Record<string, any>> = Object.fromEntries([...activeRows, row(999)].map((r) => [String(r.element_id_4), { '15': datum(Number(r.element_id_4), `Oil ${r.element_id_4}`) }]));
  for (const ref of references) data[String(ref.element_id_5)] = { '1393': datum(Number(ref.element_id_5), '0', 1393) };
  const storedProducts = new Map<number, any>([999, 888].map((id) => [id, { id: `p${id}`, sellbaseElementId: id, active: true, productType: 'lubricant', name: `Old ${id}`, rawData: {}, references: [] }]));
  const storedReferences = new Map<number, any>([1999, 1888].map((id) => [id, { sellbaseElementId: id, active: true }]));
  const indexState = { active: 'old-index' };
  const prisma: any = {
    $queryRaw: jest.fn().mockResolvedValue([{ locked: true }]),
    $executeRaw: jest.fn().mockResolvedValue(1),
    $executeRawUnsafe: jest.fn().mockResolvedValue(1),
    ragSyncRun: { update: jest.fn().mockResolvedValue({}) },
    pimProduct: {
      findMany: jest.fn().mockImplementation(({ where, include } = {}) => Promise.resolve([...storedProducts.values()]
        .filter((p) => (!where?.active || p.active) && (!where?.productType || p.productType === where.productType))
        .map((p) => include?.references ? { ...p, references: [...storedReferences.values()].filter((ref) => ref.productId === p.id && (!include.references.where?.active || ref.active)) } : p))),
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
      findMany: jest.fn().mockResolvedValue([...storedReferences.values()]),
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
    catalogBaseId: 0, excludedFolderIds: [ARCHIVE], excludedBaseIds: [87584],
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
    expect(f.prisma.ragSyncRun.update).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'completed', details: expect.objectContaining({ catalogBaseId: 0, scope: 'master', excludedFolderIds: [ARCHIVE], excludedBaseIds: [87584], productsExcluded: 1, referencesExcluded: 1 }) }) }));
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

describe('PIM ERP availability synchronization', () => {
  const setStatus = (f: ReturnType<typeof fixture>, refId: number, value?: string) => {
    if (value === undefined) delete f.data[String(refId)]['1393'];
    else f.data[String(refId)]['1393'] = datum(refId, value, 1393);
  };

  it('keeps mixed products active but retains sleeping, unknown and invalid refs as inactive with refreshed metadata', async () => {
    const f = fixture(120);
    f.references.push({ ...row(1), element_id_5: 2001 });
    f.data['2001'] = { '1393': datum(2001, '1', 1393), '34': datum(2001, 'OLD-PACK', 34), '67': datum(2001, 'Dormant drum', 67) };
    f.data['1001']['67'] = datum(1001, 'Active can', 67);
    setStatus(f, 1002, '1');
    setStatus(f, 1003);
    setStatus(f, 1004, 'unknown');
    f.products.push(row(500));
    f.data['500'] = { '15': datum(500, 'No references') };
    await (f.service as any).execute('run');
    expect(f.storedProducts.get(1).active).toBe(true);
    for (const id of [2, 3, 4, 500]) expect(f.storedProducts.get(id).active).toBe(false);
    expect(f.storedReferences.get(2001)).toMatchObject({ active: false, erpStatus: '1', code: 'OLD-PACK', packaging: 'Dormant drum' });
    expect(f.storedReferences.get(1002)).toMatchObject({ active: false, erpStatus: '1' });
    expect(f.storedReferences.get(1003)).toMatchObject({ active: false, erpStatus: null });
    expect(f.storedReferences.get(1004)).toMatchObject({ active: false, erpStatus: 'unknown' });
    expect(f.storedReferences.get(1001)).toMatchObject({ active: true, erpStatus: '0' });
    expect(f.prisma.pimReference.upsert).toHaveBeenCalledTimes(121);
    const chunk = f.prisma.$executeRawUnsafe.mock.calls.find((args: any[]) => args[3] === 'p1');
    expect(chunk[4]).toContain('Active can');
    expect(chunk[4]).not.toContain('Dormant drum');
    expect(JSON.parse(chunk[6]).packaging).toEqual(['Active can']);
    const result = f.prisma.ragSyncRun.update.mock.calls.at(-1)[0].data;
    expect(result.details.erp).toMatchObject({ sourceBaseId: 0, references: { active: 117, sleeping: 2, missing: 1, invalid: 1 }, productsWithActiveReference: 117, productsWithoutActiveReference: 4 });
    expect(f.prisma.$executeRawUnsafe).toHaveBeenCalledTimes(117);
  });

  it('reactivates a previously sleeping reference and its product after ERP changes 1 to 0', async () => {
    const f = fixture(120);
    f.storedProducts.set(1, { id: 'p1', sellbaseElementId: 1, active: false, rawData: {} });
    f.storedReferences.set(1001, { sellbaseElementId: 1001, active: false, rawData: { '1393': datum(1001, '1', 1393) } });
    await (f.service as any).execute('run');
    expect(f.storedProducts.get(1).active).toBe(true);
    expect(f.storedReferences.get(1001)).toMatchObject({ active: true, erpStatus: '0', rawData: { '1393': { contenu: '0' } } });
  });

  it('deactivates 0 to 1 or missing and records product removals without deleting their data', async () => {
    const f = fixture(120);
    for (const id of [1, 2]) f.storedProducts.set(id, { id: `p${id}`, sellbaseElementId: id, active: true, rawData: {} });
    f.prisma.pimReference.findMany.mockResolvedValue(f.activeRows.map((r) => ({ sellbaseElementId: 1000 + Number(r.element_id_4), rawData: { '1393': datum(1000 + Number(r.element_id_4), '0', 1393) } })));
    setStatus(f, 1001, '1');
    setStatus(f, 1002);
    await (f.service as any).execute('run');
    expect(f.storedProducts.get(1).active).toBe(false);
    expect(f.storedProducts.get(2).active).toBe(false);
    expect(f.storedReferences.get(1001).rawData['1393'].contenu).toBe('1');
    expect(f.storedReferences.get(1002).rawData['1393']).toBeUndefined();
    const validating = f.prisma.ragSyncRun.update.mock.calls.find(([args]: any[]) => args.data.status === 'validating')[0].data;
    expect(validating.productsRemoved).toBe(4); // two archives/unnamed plus two ERP changes
    expect(validating.details.erp.lostKnownStatuses).toBe(1);
  });

  it('ignores publication overrides and legacy1083 for availability and persisted raw status', async () => {
    const f = fixture(120);
    f.sellbase.catalogBaseId = 52903;
    setStatus(f, 1001, '1');
    setStatus(f, 1002);
    f.data['1002']['1083'] = datum(1002, '0', 1083);
    f.sellbase.getPublishedData.mockImplementation((_ids, baseId) => Promise.resolve(baseId === 0 ? f.data : {
      '1001': { '1393': datum(1001, '0', 1393), '34': datum(1001, 'Publication code', 34) },
      '1002': { '1393': datum(1002, '0', 1393) },
      '1003': { '1393': datum(1003, '1', 1393) },
    }));
    await (f.service as any).execute('run');
    expect(f.storedReferences.get(1001)).toMatchObject({ active: false, code: 'Publication code', erpStatus: '1', rawData: { '1393': { contenu: '1' } } });
    expect(f.storedReferences.get(1002)).toMatchObject({ active: false, erpStatus: null });
    expect(f.storedReferences.get(1002).rawData['1393']).toBeUndefined();
    expect(f.storedReferences.get(1003)).toMatchObject({ active: true, erpStatus: '0' });
    expect(f.storedProducts.get(999).active).toBe(false); // archive stays excluded even with ERP0
  });

  it('stops before mutations when the ERP status source is absent', async () => {
    const f = fixture(120);
    for (const ref of f.references) setStatus(f, Number(ref.element_id_5));
    await (f.service as any).execute('run');
    expect(f.prisma.pimProduct.upsert).not.toHaveBeenCalled();
    expect(f.prisma.pimProduct.updateMany).not.toHaveBeenCalled();
    expect(f.prisma.pimReference.upsert).not.toHaveBeenCalled();
    expect(f.indexState.active).toBe('old-index');
  });

  it('detects a mass loss of previously known statuses even above the global80percent threshold', async () => {
    const f = fixture(120);
    f.prisma.pimReference.findMany.mockResolvedValue(f.activeRows.map((r) => ({ sellbaseElementId: 1000 + Number(r.element_id_4), rawData: { '1393': datum(1000 + Number(r.element_id_4), '0', 1393) } })));
    for (let id = 1001; id <= 1013; id++) setStatus(f, id);
    await (f.service as any).execute('run');
    expect(f.prisma.pimProduct.upsert).not.toHaveBeenCalled();
    expect(f.prisma.pimReference.updateMany).not.toHaveBeenCalled();
    expect(f.prisma.ragSyncRun.update).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'failed', error: expect.stringContaining('13/120 previous statuses lost') }) }));
  });

  it('stops before mutation if fewer than100 active products remain despite complete ERP data', async () => {
    const f = fixture(120);
    for (let id = 1001; id <= 1021; id++) setStatus(f, id, '1');
    await (f.service as any).execute('run');
    expect(f.prisma.pimProduct.upsert).not.toHaveBeenCalled();
    expect(f.prisma.pimReference.updateMany).not.toHaveBeenCalled();
    expect(f.prisma.ragSyncRun.update).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'failed', error: expect.stringContaining('99 products, 99 lubricants') }) }));
  });
});
