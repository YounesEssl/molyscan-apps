import { getLocales } from 'expo-localization';
import { deviceDocumentLanguage } from './documentLanguage';

export function getDeviceDocumentLanguage() {
  return deviceDocumentLanguage(getLocales());
}
