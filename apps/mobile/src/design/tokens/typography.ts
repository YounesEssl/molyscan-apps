export const typography = {
  fonts: {
    // Display — Space Grotesk: grotesque technique, look industriel/pro
    display:       'SpaceGrotesk_500Medium',
    // Pas d'italique : l'emphase se fait par le poids + la couleur (plus de cursive).
    // On garde le nom `displayItalic` pour ne pas casser les usages existants.
    displayItalic: 'SpaceGrotesk_700Bold',
    displayBold:   'SpaceGrotesk_700Bold',

    // Sans — Inter
    sans:          'Inter_400Regular',
    sansMedium:    'Inter_500Medium',
    sansSemibold:  'Inter_600SemiBold',
    sansBold:      'Inter_700Bold',

    // Mono — Geist Mono (rôle monospace : stats, valeurs techniques)
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
