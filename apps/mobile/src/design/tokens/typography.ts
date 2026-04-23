export const typography = {
  fonts: {
    display: 'TitilliumWeb-Bold',
    displaySemibold: 'TitilliumWeb-SemiBold',
    body: 'Raleway-Regular',
    bodySemibold: 'Raleway-SemiBold',
    bodyBold: 'Raleway-Bold',
  },
  sizes: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 22,
    xxxl: 28,
    hero: 36,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.7,
  },
  letterSpacing: {
    tight: -0.3,
    normal: 0,
    wide: 0.5,
    wider: 1.0,
    widest: 1.5,
  },
} as const;
