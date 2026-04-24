export const typography = {
  fonts: {
    // Display — Fraunces: variable modern serif, readable at all sizes
    display:       'Fraunces_500Medium',
    displayItalic: 'Fraunces_500Medium_Italic',
    displayBold:   'Fraunces_700Bold',

    // Sans — Geist
    sans:          'Geist_400Regular',
    sansMedium:    'Geist_500Medium',
    sansSemibold:  'Geist_600SemiBold',
    sansBold:      'Geist_700Bold',

    // Mono — Geist Mono
    mono:          'GeistMono_400Regular',
    monoMedium:    'GeistMono_500Medium',
    monoSemibold:  'GeistMono_600SemiBold',
  },
  sizes: {
    xs:   10,
    sm:   12,
    md:   14,
    lg:   15,
    xl:   18,
    xxl:  22,
    xxxl: 28,
    hero: 38,
  },
  lineHeights: {
    tight:   1.2,
    normal:  1.5,
    relaxed: 1.7,
  },
  letterSpacing: {
    hero:    -1.5,
    title:   -0.8,
    navLabel: -0.2,
    tight:   -0.3,
    normal:  0,
    mono:    0,
  },
} as const;
