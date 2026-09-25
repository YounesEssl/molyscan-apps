import { ChatDocumentsService } from '../chat-documents.service';

describe('Assistant PIM document requests', () => {
  let prisma: any;
  let products: any;
  let service: ChatDocumentsService;
  beforeEach(() => {
    prisma = {
      pimProduct: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { name: 'AGL 41 NF', active: true },
            { name: 'LUB 13', active: true },
            { name: 'LUB 13 EP2', active: true },
          ]),
      },
      expertEquivalence: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    products = {
      findPimDocumentsByName: jest
        .fn()
        .mockResolvedValue({
          documents: [
            {
              id: 'doc',
              kind: 'technical_sheet',
              language: 'fr',
              available: true,
            },
          ],
        }),
      downloadPimDocument: jest.fn().mockResolvedValue({}),
    };
    service = new ChatDocumentsService(prisma, products);
  });
  it('leaves normal equivalence questions to RAG', async () => {
    expect(
      await service.answer('Quel lubrifiant pour une chaîne ?', []),
    ).toBeNull();
    expect(prisma.pimProduct.findMany).not.toHaveBeenCalled();
  });
  it('returns only a verified internal FT link for the exact longest grade', async () => {
    const result = await service.answer('Consulter la FT LUB 13 EP2', []);
    expect(products.findPimDocumentsByName).toHaveBeenCalledWith('LUB 13 EP2');
    expect(products.findPimDocumentsByName).toHaveBeenCalledTimes(1);
    expect(products.downloadPimDocument).toHaveBeenCalledWith('doc');
    expect(result?.text).toContain('](/document/doc)');
  });
  it.each(['FT LUB 13 EP99', 'FT LUB 13 EXTRA', 'FT AGL 41 NF 46'])(
    'never substitutes a known base name for an unknown explicit grade: %s',
    async (question) => {
      const result = await service.answer(
        question,
        [{ role: 'assistant', text: 'AGL 41 NF' }],
        'AGL 41 NF',
      );
      expect(result?.text).toContain('nom exact');
      expect(result?.text).not.toContain('/document/');
      expect(products.findPimDocumentsByName).not.toHaveBeenCalled();
    },
  );
  it('accepts a complete product name in a natural download request', async () => {
    const result = await service.answer(
      'Peux-tu me fournir le lien de téléchargement PDF de la FT du produit LUB 13 EP2 en français ?',
      [],
    );
    expect(products.findPimDocumentsByName).toHaveBeenCalledWith('LUB 13 EP2');
    expect(result?.text).toContain('/document/doc');
  });
  it.each([
    'La FT de AGL 41 NF indique-t-elle une certification NSF H1 ?',
    'Selon la FDS de LUB 13, quelles précautions faut-il prendre ?',
    'Does the technical sheet for AGL 41 NF state a viscosity?',
    'Résume la fiche technique de AGL 41 NF.',
  ])('leaves questions about sheet contents to RAG: %s', async (question) => {
    expect(await service.answer(question, [])).toBeNull();
    expect(prisma.pimProduct.findMany).not.toHaveBeenCalled();
    expect(products.downloadPimDocument).not.toHaveBeenCalled();
  });
  it('resolves a follow-up from the latest answer', async () => {
    const result = await service.answer('Et sa FT ?', [
      { role: 'assistant', text: 'Je propose AGL 41 NF.' },
    ]);
    expect(result?.text).toContain('AGL 41 NF');
  });
  it('asks which product when the latest answer lists alternatives', async () => {
    const result = await service.answer('Et la FT ?', [
      { role: 'assistant', text: 'AGL 41 NF et LUB 13' },
    ]);
    expect(result?.text).toContain('Pour quel produit');
    expect(products.findPimDocumentsByName).not.toHaveBeenCalled();
  });
  it('does not use the old product for an explicitly unknown product', async () => {
    const result = await service.answer(
      'FT SHELL UNKNOWN 33',
      [{ role: 'assistant', text: 'AGL 41 NF' }],
      'AGL 41 NF',
    );
    expect(result?.text).toContain('nom exact');
    expect(products.findPimDocumentsByName).not.toHaveBeenCalled();
  });
  it('does not resurrect a product from an earlier, withdrawn answer', async () => {
    const result = await service.answer('Et sa FT ?', [
      { role: 'assistant', text: 'AGL 41 NF' },
      { role: 'assistant', text: 'Il n’y a pas d’équivalent validé.' },
    ]);
    expect(result?.text).toContain('nom exact');
    expect(products.findPimDocumentsByName).not.toHaveBeenCalled();
  });
  it.each([
    'Il n’y a pas d’équivalent validé.',
    'AGL 41 NF : je retire cette proposition.',
    'There is no suitable Molydal equivalent.',
  ])(
    'does not resurrect a linked product after an explicit withdrawal: %s',
    async (withdrawal) => {
      const result = await service.answer(
        'Et sa FT ?',
        [
          { role: 'assistant', text: 'AGL 41 NF' },
          { role: 'assistant', text: withdrawal },
        ],
        'AGL 41 NF',
      );
      expect(result?.text).toContain('nom exact');
      expect(products.findPimDocumentsByName).not.toHaveBeenCalled();
    },
  );
  it('keeps the linked scan context after a short answer about its properties', async () => {
    await service.answer(
      'Et sa FT ?',
      [
        { role: 'user', text: 'Est-il sans solvant ?' },
        { role: 'assistant', text: 'Oui.' },
      ],
      'AGL 41 NF',
      { name: 'Competitor', brand: 'Brand' },
    );
    expect(products.findPimDocumentsByName).toHaveBeenCalledWith('AGL 41 NF');
  });
  it('uses the newly named product after a short answer instead of the linked scan', async () => {
    await service.answer(
      'Et sa FT ?',
      [
        { role: 'user', text: 'Et pour LUB 13 EP2, est-il sans solvant ?' },
        { role: 'assistant', text: 'Oui.' },
      ],
      'AGL 41 NF',
    );
    expect(products.findPimDocumentsByName).toHaveBeenCalledWith('LUB 13 EP2');
  });
  it('asks for the product after an explicit change to an unknown subject', async () => {
    const result = await service.answer(
      'Et sa FT ?',
      [
        { role: 'user', text: 'Parlons du nouveau produit Shell UNKNOWN 33.' },
        { role: 'assistant', text: 'Je ne le trouve pas dans le catalogue.' },
      ],
      'AGL 41 NF',
    );
    expect(result?.text).toContain('nom exact');
    expect(products.findPimDocumentsByName).not.toHaveBeenCalled();
  });
  it('does not revive the previous user product when the latest answer changes the subject', async () => {
    const result = await service.answer(
      'Et sa FT ?',
      [
        { role: 'user', text: 'AGL 41 NF' },
        { role: 'assistant', text: 'Passons à un autre produit.' },
      ],
      'AGL 41 NF',
    );
    expect(result?.text).toContain('nom exact');
    expect(products.findPimDocumentsByName).not.toHaveBeenCalled();
  });
  it('honours an expert veto for implicit requests but permits explicit document names', async () => {
    prisma.expertEquivalence.findUnique.mockResolvedValue({
      noEquivalent: true,
    });
    const context = { name: 'Competitor', brand: 'Brand' };
    const result = await service.answer(
      'Et sa FT ?',
      [{ role: 'assistant', text: 'AGL 41 NF' }],
      'AGL 41 NF',
      context,
    );
    expect(result?.text).toContain('Aucun équivalent');
    expect(products.findPimDocumentsByName).not.toHaveBeenCalled();
    expect(
      (await service.answer('FT AGL 41 NF', [], null, context))?.text,
    ).toContain('/document/doc');
  });
  it('uses the expert correction instead of a stale suggestion for an implicit document request', async () => {
    prisma.expertEquivalence.findUnique.mockResolvedValue({
      noEquivalent: false,
      molydalEquivalent: 'LUB 13 EP2',
    });
    await service.answer(
      'Et sa FT ?',
      [{ role: 'assistant', text: 'AGL 41 NF' }],
      'AGL 41 NF',
      { name: 'Competitor', brand: 'Brand' },
    );
    expect(products.findPimDocumentsByName).toHaveBeenCalledWith('LUB 13 EP2');
  });
  it('distinguishes missing SDS from present metadata without media access', async () => {
    expect((await service.answer('FDS AGL 41 NF', []))?.text).toContain(
      'Aucune FDS',
    );
    products.findPimDocumentsByName.mockResolvedValue({
      documents: [
        { id: 'sds', kind: 'safety_sheet', language: 'fr', available: false },
      ],
    });
    const result = await service.answer('FS AGL 41 NF', []);
    expect(result?.text).toContain('renseignée dans le PIM');
    expect(result?.text).not.toContain('/document/');
    expect(products.downloadPimDocument).not.toHaveBeenCalled();
  });
  it('reports an unavailable upstream document without fabricating a link', async () => {
    products.downloadPimDocument.mockRejectedValue(
      new Error('HTML error page'),
    );
    const result = await service.answer('FT AGL 41 NF', []);
    expect(result?.text).toContain('a échoué');
    expect(result?.text).not.toContain('/document/');
  });
  it('respects requested language and both sheet kinds', async () => {
    products.findPimDocumentsByName.mockResolvedValue({
      documents: [
        { id: 'fr', kind: 'technical_sheet', language: 'fr', available: true },
        { id: 'en', kind: 'technical_sheet', language: 'en', available: true },
        { id: 'sds-en', kind: 'safety_sheet', language: 'en', available: true },
      ],
    });
    const result = await service.answer(
      'Please give me the technical sheet and safety data sheet for AGL 41 NF',
      [],
    );
    expect(result?.text).toContain('/document/en');
    expect(result?.text).toContain('/document/sds-en');
    expect(result?.text).not.toContain('/document/fr');
  });

  it('resolves a compact product name and an active PIM reference without changing the requested grade', async () => {
    prisma.pimProduct.findMany.mockResolvedValue([
      { name: 'KL 9 H', active: true, references: [
        { code: 'KL9H20', active: true, packaging: 'JERRYCAN' },
        { code: 'KL9HPULVE', active: true, packaging: 'PULVÉRISATEUR' },
      ] },
      { name: 'KL9H', active: false, references: [] },
    ]);
    products.findPimDocumentsByName.mockResolvedValue({ documents: [
      { id: 'ref_fds', kind: 'safety_sheet', language: 'fr', available: true, referenceCode: 'KL9H20' },
    ] });
    expect((await service.answer('Donne moi la FDS du KL9H', []))?.text).toContain('/document/ref_fds');
    expect(products.findPimDocumentsByName).toHaveBeenLastCalledWith('KL 9 H');
    expect((await service.answer('FDS KL9H20', []))?.text).toContain('/document/ref_fds');
    expect(products.findPimDocumentsByName).toHaveBeenLastCalledWith('KL 9 H', 'KL9H20');
    products.findPimDocumentsByName.mockClear();
    expect((await service.answer('FDS KL9H EP99', []))?.text).toContain('nom exact');
    expect(products.findPimDocumentsByName).not.toHaveBeenCalled();
  });

  it('returns the requested FT and FDS even when the question also asks for a missing food certificate', async () => {
    prisma.pimProduct.findMany.mockResolvedValue([{ name: 'KL 9 H', active: true, references: [
      { code: 'KL9H20', active: true, packaging: 'JERRYCAN' },
    ] }]);
    products.findPimDocumentsByName.mockResolvedValue({ documents: [
      { id: 'ft', kind: 'technical_sheet', language: 'fr', available: true },
      { id: 'fds', kind: 'safety_sheet', language: 'fr', available: true },
    ] });
    const result = await service.answer('KL9H tu peux me donner fds ft et certificat d’alimentarité', []);
    expect(result?.text).toContain('/document/ft');
    expect(result?.text).toContain('/document/fds');
    expect(result?.text).toContain('Aucun certificat d’alimentarité');
  });

  it('uses the exact spray reference from the previous product answer, despite a misspelled FDS request', async () => {
    prisma.pimProduct.findMany.mockResolvedValue([
      { name: 'KL 9 H', active: true, references: [
        { code: 'KL9H20', active: true, packaging: 'JERRYCAN' },
        { code: 'KL9HPULVE', active: true, packaging: 'PULVÉRISATEUR' },
      ] },
      { name: 'PULVERISATEUR', active: true, references: [] },
    ]);
    products.findPimDocumentsByName.mockResolvedValue({ documents: [
      { id: 'spray_fds', kind: 'safety_sheet', language: 'fr', available: true, referenceCode: 'KL9HPULVE' },
    ] });
    const result = await service.answer(
      'Peux tu me donner la fiche de donnés de sécurité (fds) associée au pulvérisateur ?',
      [{ role: 'assistant', text: 'Le produit KL 9 H existe en pulvérisateur.' }],
    );
    expect(products.findPimDocumentsByName).toHaveBeenCalledWith('KL 9 H', 'KL9HPULVE');
    expect(result?.text).toContain('/document/spray_fds');
  });

  it('treats a reference code as the answer to its exact-name prompt', async () => {
    prisma.pimProduct.findMany.mockResolvedValue([{ name: 'KL 9 H', active: true, references: [
      { code: 'KL9HPULVE', active: true, packaging: 'PULVÉRISATEUR' },
    ] }]);
    products.findPimDocumentsByName.mockResolvedValue({ documents: [
      { id: 'spray_fds', kind: 'safety_sheet', language: 'fr', available: true, referenceCode: 'KL9HPULVE' },
    ] });
    const result = await service.answer('KL9HPULVE', [
      { role: 'user', text: 'Donne moi la FDS du pulvérisateur' },
      { role: 'assistant', text: 'Précisez le nom exact du produit Molydal pour que je retrouve sa fiche dans le PIM.' },
    ]);
    expect(products.findPimDocumentsByName).toHaveBeenCalledWith('KL 9 H', 'KL9HPULVE');
    expect(result?.text).toContain('/document/spray_fds');
  });

  it('never substitutes an inactive reference for an active one', async () => {
    prisma.pimProduct.findMany.mockResolvedValue([{ name: 'KL 9 H', active: true, references: [
      { code: 'KL9HLINGETTES', active: false, packaging: 'LINGETTES' },
      { code: 'KL9HPULVE', active: true, packaging: 'PULVÉRISATEUR' },
    ] }]);
    const result = await service.answer('FDS KL9HLINGETTES', []);
    expect(result?.text).toContain('n’est plus active');
    expect(products.findPimDocumentsByName).not.toHaveBeenCalled();
  });

  it('does not confuse an active product name with a shorter reference code from another product', async () => {
    prisma.pimProduct.findMany.mockResolvedValue([
      { name: 'LUBA 501', active: true, references: [{ code: 'LUBA501FT', active: true, packaging: 'FUT' }] },
      { name: 'FONTAINE FUT POUR SOLVANTS', active: true, references: [{ code: '501', active: true, packaging: 'FUT' }] },
    ]);
    products.findPimDocumentsByName.mockResolvedValue({ documents: [
      { id: 'luba-fds', kind: 'safety_sheet', language: 'fr', available: true },
    ] });
    const result = await service.answer('FDS LUBA 501', []);
    expect(products.findPimDocumentsByName).toHaveBeenCalledWith('LUBA 501');
    expect(result?.text).toContain('/document/luba-fds');
  });

  it('prefers an active product over an inactive reference with the same designation', async () => {
    prisma.pimProduct.findMany.mockResolvedValue([{ name: 'MICROCUT 240', active: true, references: [
      { code: 'MICROCUT_240', active: false, packaging: 'JERRYCAN' },
      { code: 'MICROCUT24020', active: true, packaging: 'JERRYCAN' },
    ] }]);
    products.findPimDocumentsByName.mockResolvedValue({ documents: [
      { id: 'microcut-fds', kind: 'safety_sheet', language: 'fr', available: true },
    ] });
    const result = await service.answer('FDS MICROCUT 240', []);
    expect(products.findPimDocumentsByName).toHaveBeenCalledWith('MICROCUT 240');
    expect(result?.text).toContain('/document/microcut-fds');
  });

  it('does not serve an active plus grade when asked for its archived base name', async () => {
    prisma.pimProduct.findMany.mockResolvedValue([{ name: 'STARNET', active: false }, { name: 'STARNET+', active: true }]);
    expect((await service.answer('FT STARNET', []))?.text).toContain('nom exact');
    expect(products.findPimDocumentsByName).not.toHaveBeenCalled();
    expect((await service.answer('FT STARNET +', []))?.text).toContain('/document/doc');
    expect(products.findPimDocumentsByName).toHaveBeenCalledWith('STARNET+');
  });

  it('withdraws an archived expert document target without calling it a no-equivalent decision', async () => {
    prisma.pimProduct.findMany.mockResolvedValue([{ name: 'STARNET', active: false }, { name: 'STARNET+', active: true }]);
    prisma.expertEquivalence.findUnique.mockResolvedValue({ molydalEquivalent: 'STARNET', noEquivalent: false });
    const result = await service.answer('Et sa FT ?', [{ role: 'assistant', text: 'STARNET' }], 'STARNET', { name: 'Competitor', brand: 'Brand' });
    expect(result?.text).toContain('n’est plus actif');
    expect(result?.text).toContain('nouvel équivalent');
    expect(result?.text).not.toContain('Aucun équivalent');
    expect(products.findPimDocumentsByName).not.toHaveBeenCalled();
  });

  it('does not revive an older active topic after a recent archived suggestion', async () => {
    prisma.pimProduct.findMany.mockResolvedValue([{ name: 'STARNET', active: false }, { name: 'AGL 41 NF', active: true }]);
    const result = await service.answer('Et sa FT ?', [{ role: 'user', text: 'AGL 41 NF' }, { role: 'assistant', text: 'STARNET' }], 'STARNET');
    expect(result?.text).toContain('nom exact');
    expect(products.findPimDocumentsByName).not.toHaveBeenCalled();
  });
});
