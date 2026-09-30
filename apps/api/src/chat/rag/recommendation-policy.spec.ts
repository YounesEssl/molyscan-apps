import { requestsCompetitorRecommendation, molydalOnlyResponse } from './recommendation-policy';

describe('Molydal recommendation scope', () => {
  test.each([
    'Peux-tu me donner la référence Klüber pour remplacer notre graisse AGL65AL ?',
    'Propose une graisse Shell pour remplacer AGL 65 AL',
    'Quel équivalent chez Castrol ?',
    'Give me a Kluber grease to replace our Molydal grease',
    'Une alternative concurrente pour notre graisse ?',
    'Compare AGL 65 AL et Shell puis propose une graisse Shell pour le remplacer',
  ])('blocks an explicitly competing destination: %s', (question) => {
    expect(requestsCompetitorRecommendation(question)).toBe(true);
  });
  test.each([
    'Quel équivalent Molydal pour remplacer Klüber ISOFLEX NBU 15 ?',
    'Quel équivalent de Klüber ISOFLEX NBU 15 ?',
    'Je cherche un équivalent Molydal de la graisse Klüber ISOFLEX',
    'What Molydal replacement for Shell Tellus S2 MX 46?',
    'Quelle est la viscosité de Klüber ISOFLEX ?',
    'Peux-tu résumer la fiche de sécurité de la graisse Klüber ?',
    'Compare AGL 65 AL et Klüber ISOFLEX sans recommander de référence',
    'Fais un tableau comparatif technique des références Klüber ISOFLEX et Molydal AGL 65 AL',
    'Compare la référence Shell Tellus à celle de Molydal sans proposer de remplacement',
  ])('preserves source identification and technical questions: %s', (question) => {
    expect(requestsCompetitorRecommendation(question)).toBe(false);
  });
  test('preserves the initial conversation language', () => {
    expect(molydalOnlyResponse('Une alternative concurrente ?', [{ role: 'user', text: 'Please help me find a lubricant' }])).toContain('I recommend only Molydal');
    expect(molydalOnlyResponse('Give me a Shell replacement', [{ role: 'user', text: 'Bonjour, quelle graisse choisir ?' }])).toContain('Je recommande uniquement');
  });
});
