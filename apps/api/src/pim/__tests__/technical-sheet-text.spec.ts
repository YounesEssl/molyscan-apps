import { cleanTechnicalSheetText, technicalSheetText } from '../technical-sheet-text';

describe('Sellbase FT extraction', () => {
  it('keeps technical evidence and removes repetitive footer text', () => {
    const text = cleanTechnicalSheetText('MOLYDAL SA - ZAET 221 rue Paul Langevin\nLes renseignements contenus dans ce document sont donnés en toute bonne foi\nAGL 41 NF\nGraisse pulverisable pour engrenages ouverts\nViscosite de l huile de base a 40C: 775 cSt\nUtilisation: couronnes de fours tournants.');
    expect(text).toContain('775 cSt');
    expect(text).toContain('couronnes de fours tournants');
    expect(text).not.toContain('Les renseignements');
  });

  it('rejects an HTML response posing as a datasheet', async () => {
    await expect(technicalSheetText(new Response('<html>error</html>', { status: 200 })))
      .rejects.toThrow('not a PDF');
  });
});
