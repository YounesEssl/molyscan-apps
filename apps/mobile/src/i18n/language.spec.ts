jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'fr' }] }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(), setItem: jest.fn(),
}));
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n, { loadStoredLanguage, setLanguage } from './index';

describe('Phone default and explicit language preference', () => {
  it('starts in French on a French phone', () => {
    expect(i18n.language).toBe('fr');
  });
  it('preserves an explicitly saved English preference', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('en');
    await loadStoredLanguage();
    expect(i18n.language).toBe('en');
  });
  it('persists a later choice of French', async () => {
    await setLanguage('fr');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@molyscan/language', 'fr');
    expect(i18n.language).toBe('fr');
  });
});
