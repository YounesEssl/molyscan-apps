# MolyScan Design System — Bold & Modern (Gradients)

## Tech Stack
React Native + TypeScript + StyleSheet (Expo SDK 54)
Icons: lucide-react-native
Gradients: expo-linear-gradient

## Brand Colors & Tokens

```typescript
const COLORS = {
  // Brand
  primary: '#1B3A5C',        // Molydal Dark Blue
  primaryLight: '#2D5A8E',   // Lighter blue (gradient end)
  accent: '#E87722',         // Molydal Orange
  accentLight: '#FF9E5E',    // Light orange (gradient end)

  // Backgrounds
  background: '#F1F5F9',     // Slate 100 - main screen bg
  surface: '#FFFFFF',        // Cards, inputs

  // Text
  textMain: '#1B3A5C',       // Primary text (same as brand)
  textSecondary: '#64748B',  // Muted text
  textOnDark: '#FFFFFF',     // Text on dark/gradient bg
  textOnDarkMuted: 'rgba(255,255,255,0.7)',

  // Status
  success: '#10B981',
  successLight: '#ECFDF5',
  warning: '#F59E0B',
  warningLight: '#FFF7ED',
  danger: '#EF4444',
  dangerLight: '#FEF2F2',

  // UI
  border: '#E2E8F0',
  overlay: 'rgba(0,0,0,0.5)',

  // Gradients
  gradientPrimary: ['#1B3A5C', '#2D5A8E'],    // Hero backgrounds
  gradientAccent: ['#E87722', '#FF9E5E'],      // CTA buttons
  gradientCard: ['#FFFFFF', '#F8FAFC'],        // Subtle card bg
}
```

## Spacing Scale (8px base)
```typescript
const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
}
```

## Border Radius
```typescript
const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
}
```

## Typography
```typescript
const FONT_SIZE = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 28,
  hero: 32,
}

// Font weights: 500 (medium), 600 (semibold), 700 (bold), 800 (extrabold)
// Letter spacing: -0.2 to -0.5 for headings, 0.5-1 for uppercase labels
```

## Shadows
```typescript
const SHADOW = {
  sm: {
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
    android: { elevation: 2 },
  },
  md: {
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
    android: { elevation: 4 },
  },
  lg: {
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.12, shadowRadius: 20 },
    android: { elevation: 8 },
  },
  accent: {
    ios: { shadowColor: '#E87722', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 12 },
    android: { elevation: 8 },
  },
  primary: {
    ios: { shadowColor: '#1B3A5C', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 },
    android: { elevation: 10 },
  },
}
```

## Key Design Patterns

### Hero Section (Gradient Header)
- LinearGradient with `gradientPrimary` colors
- Large bottom border radius (40px) creating a "wave" effect
- Content overlaps below the gradient (negative margin on cards below)
- Decorative circle element (large, low opacity white) for depth

### Cards
- White background, border-radius 24px
- Subtle gradient background (white → slate-50)
- Shadow md
- Padding 20px
- Icon boxes: 40x40, border-radius 12, tinted background matching icon color at 10% opacity

### Buttons (CTA)
- Primary: LinearGradient with `gradientAccent`
- Border-radius 20px
- Icon circle (44x44, white bg) on the left
- Bold text, white
- Orange shadow (accent shadow)
- Secondary: White bg, primary text, border

### Stats/Metric Cards
- Stacked layout: icon box → value → label
- Icon box with colored tint background
- Value: extrabold, primary color
- Label: medium weight, secondary color, uppercase, letter-spacing 1

### Tags/Badges
- Uppercase text, letter-spacing 1
- Font weight 700, font size 12
- Colored background at 10-15% opacity, matching text color
- Pill shape (border-radius full) or rounded (radius sm)

### Progress Bars
- Height 6px, border-radius 3
- Background: slate-100
- Fill: primary color

### Profile/Avatar Circles
- Semi-transparent white bg on dark backgrounds
- Border: 1px rgba(255,255,255,0.2)
- Centered icon

### Tab Bar
- White background
- Active: accent orange
- Inactive: slate-400
- Scanner tab: special orange gradient circular button with shadow

### Screen Layout
- Background: COLORS.background (#F1F5F9)
- Hero sections use full-width gradient
- Content sections overlap hero with negative margins
- Horizontal padding: 20-24px
- Cards have 16px gap between them

### Overall Vibe
- BOLD typography (700-800 weights for headings)
- Vibrant gradients (blue hero, orange CTAs)
- Generous border-radius (20-24px on cards)
- Layered depth (overlapping sections, shadows)
- Clean white cards on light slate background
- Professional but energetic
