// iOS-friendly shadows — using #000 with low opacity for clear visibility.
// Warm browns (#3c2814) blend too much with the paper background and
// become invisible on iOS. Pure black with low opacity reads as a soft
// warm shadow on cream backgrounds.
//
// IMPORTANT: shadows are killed by `overflow: 'hidden'`. Any component that
// needs both rounded clipping AND a shadow must use the "shadow wrapper"
// pattern: outer View has the shadow (no overflow), inner View has the
// clipped content (overflow: 'hidden' + borderRadius).

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },

  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },

  float: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },

  tab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 28,
    elevation: 12,
  },

  red: {
    shadowColor: '#d4251c',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 6,
  },

  redSm: {
    shadowColor: '#d4251c',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },

  // aliases for legacy imports
  sm:  { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6,  elevation: 2 },
  md:  { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  lg:  { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.10, shadowRadius: 18, elevation: 6 },
  xl:  { shadowColor: '#000', shadowOffset: { width: 0, height: 12}, shadowOpacity: 0.12, shadowRadius: 24, elevation: 10 },
} as const;
