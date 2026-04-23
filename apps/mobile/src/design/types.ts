export type ThemeId = 'terrain';

export interface ThemeColors {
  // Brand
  primary: string;
  primaryLight: string;
  accent: string;
  accentLight: string;

  // Backgrounds
  background: string;
  surface: string;

  // Text
  text: string;
  textSecondary: string;
  textMuted: string;

  // Status
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  danger: string;
  dangerLight: string;

  // UI
  muted: string;
  border: string;
  overlay: string;

  // Tab bar
  tabBarBackground: string;
  tabBarActive: string;
  tabBarInactive: string;
}

export interface ThemeGradients {
  primary: [string, string];
  accent: [string, string];
  card: [string, string];
}

export interface ThemeShadows {
  sm: Record<string, unknown>;
  md: Record<string, unknown>;
  lg: Record<string, unknown>;
  accent: Record<string, unknown>;
  primary: Record<string, unknown>;
}

export interface ThemeFonts {
  heading: string;
  body: string;
  mono: string;
}

export interface Theme {
  id: ThemeId;
  name: string;
  colors: ThemeColors;
  gradients: ThemeGradients;
  shadows: ThemeShadows;
  fonts: ThemeFonts;
}
