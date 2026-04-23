import type { Theme } from '../types';
import { buildShadows } from './shadows';

export const terrain: Theme = {
  id: 'terrain',
  name: 'Terrain',
  colors: {
    primary: '#ed1c23',
    primaryLight: '#ff4d54',
    accent: '#2d3a42',
    accentLight: '#54626c',

    background: '#f4f5f6',
    surface: '#ffffff',

    text: '#1a1a1a',
    textSecondary: '#54626c',
    textMuted: '#8a949c',

    success: '#10B981',
    successLight: '#ECFDF5',
    warning: '#F59E0B',
    warningLight: '#FFF7ED',
    danger: '#EF4444',
    dangerLight: '#FEF2F2',

    muted: '#e2e6ea',
    border: '#d8dce0',
    overlay: 'rgba(0,0,0,0.5)',

    tabBarBackground: '#ffffff',
    tabBarActive: '#ed1c23',
    tabBarInactive: '#8a949c',
  },
  gradients: {
    primary: ['#ed1c23', '#ff4d54'],
    accent: ['#2d3a42', '#54626c'],
    card: ['#ffffff', '#f8f9fa'],
  },
  shadows: buildShadows('#000', '#ed1c23', '#2d3a42'),
  fonts: {
    heading: 'TitilliumWeb-Bold',
    body: 'TitilliumWeb-Regular',
    mono: 'TitilliumWeb-SemiBold',
  },
};
