# Design System Tokens

**Last Updated**: 2026-01-29
**Status**: Implementation Ready

This document provides code-ready design tokens for the ComfyStudio redesign.

---

## Colors

### Base Colors (Dark Theme)

```typescript
export const colors = {
  // Backgrounds
  background: '#1E1E1E',
  surface: '#2C2C2C',
  surfaceElevated: '#363636',

  // Borders
  border: '#404040',
  borderSubtle: 'rgba(255, 255, 255, 0.1)',

  // Accents
  accentPrimary: '#7C3AED',      // Purple - primary actions
  accentSecondary: '#3B82F6',    // Blue - secondary actions

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0A0',
  textTertiary: '#666666',

  // Semantic
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Overlays
  hoverOverlay: 'rgba(255, 255, 255, 0.05)',
  activeOverlay: 'rgba(124, 58, 237, 0.1)',

  // Shadows
  shadowColor: 'rgba(0, 0, 0, 0.2)',
} as const;
```

### CSS Variables

```css
:root {
  /* Backgrounds */
  --color-background: #1E1E1E;
  --color-surface: #2C2C2C;
  --color-surface-elevated: #363636;

  /* Borders */
  --color-border: #404040;
  --color-border-subtle: rgba(255, 255, 255, 0.1);

  /* Accents */
  --color-accent-primary: #7C3AED;
  --color-accent-secondary: #3B82F6;

  /* Text */
  --color-text-primary: #FFFFFF;
  --color-text-secondary: #A0A0A0;
  --color-text-tertiary: #666666;

  /* Semantic */
  --color-success: #10B981;
  --color-warning: #F59E0B;
  --color-error: #EF4444;
  --color-info: #3B82F6;

  /* Overlays */
  --color-hover-overlay: rgba(255, 255, 255, 0.05);
  --color-active-overlay: rgba(124, 58, 237, 0.1);
}
```

### Tailwind Config

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        background: '#1E1E1E',
        surface: {
          DEFAULT: '#2C2C2C',
          elevated: '#363636',
        },
        border: {
          DEFAULT: '#404040',
          subtle: 'rgba(255, 255, 255, 0.1)',
        },
        accent: {
          primary: '#7C3AED',
          secondary: '#3B82F6',
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#A0A0A0',
          tertiary: '#666666',
        },
        semantic: {
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
          info: '#3B82F6',
        },
      },
    },
  },
};
```

---

## Typography

### Font Family

```typescript
export const typography = {
  fontFamily: {
    sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
    mono: ['JetBrains Mono', 'Consolas', 'Monaco', 'monospace'],
  },
} as const;
```

### Font Sizes

```typescript
export const fontSize = {
  heading: '16px',      // 1rem
  body: '14px',         // 0.875rem
  small: '12px',        // 0.75rem
  tiny: '11px',         // 0.6875rem
} as const;
```

### Font Weights

```typescript
export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;
```

### Line Heights

```typescript
export const lineHeight = {
  tight: 1.25,
  normal: 1.5,
  relaxed: 1.75,
} as const;
```

### Letter Spacing

```typescript
export const letterSpacing = {
  tight: '-0.01em',
  normal: '0',
  wide: '0.01em',
} as const;
```

### CSS Variables

```css
:root {
  /* Font Family */
  --font-family-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-family-mono: 'JetBrains Mono', 'Consolas', 'Monaco', monospace;

  /* Font Sizes */
  --font-size-heading: 16px;
  --font-size-body: 14px;
  --font-size-small: 12px;
  --font-size-tiny: 11px;

  /* Font Weights */
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  /* Line Heights */
  --line-height-tight: 1.25;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.75;

  /* Letter Spacing */
  --letter-spacing-tight: -0.01em;
  --letter-spacing-normal: 0;
  --letter-spacing-wide: 0.01em;
}
```

---

## Spacing

### Spacing Scale (8px base)

```typescript
export const spacing = {
  xs: '4px',      // 0.25rem
  sm: '8px',      // 0.5rem
  md: '16px',     // 1rem
  lg: '24px',     // 1.5rem
  xl: '32px',     // 2rem
  '2xl': '48px',  // 3rem
  '3xl': '64px',  // 4rem
} as const;
```

### CSS Variables

```css
:root {
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;
  --space-3xl: 64px;
}
```

### Tailwind Config

```javascript
module.exports = {
  theme: {
    extend: {
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        '2xl': '48px',
        '3xl': '64px',
      },
    },
  },
};
```

---

## Border Radius

```typescript
export const borderRadius = {
  none: '0',
  sm: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
  full: '9999px',
} as const;
```

### CSS Variables

```css
:root {
  --radius-none: 0;
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  --radius-full: 9999px;
}
```

---

## Shadows

```typescript
export const shadows = {
  panel: '0 2px 8px rgba(0, 0, 0, 0.2)',
  elevated: '0 4px 16px rgba(0, 0, 0, 0.3)',
  modal: '0 8px 32px rgba(0, 0, 0, 0.4)',
  tooltip: '0 2px 4px rgba(0, 0, 0, 0.3)',
} as const;
```

### CSS Variables

```css
:root {
  --shadow-panel: 0 2px 8px rgba(0, 0, 0, 0.2);
  --shadow-elevated: 0 4px 16px rgba(0, 0, 0, 0.3);
  --shadow-modal: 0 8px 32px rgba(0, 0, 0, 0.4);
  --shadow-tooltip: 0 2px 4px rgba(0, 0, 0, 0.3);
}
```

---

## Transitions

### Durations

```typescript
export const transitionDuration = {
  fast: '150ms',
  normal: '200ms',
  slow: '300ms',
} as const;
```

### Timing Functions

```typescript
export const transitionTimingFunction = {
  easeOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  linear: 'linear',
} as const;
```

### CSS Variables

```css
:root {
  --transition-fast: 150ms;
  --transition-normal: 200ms;
  --transition-slow: 300ms;

  --ease-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## Z-Index Scale

```typescript
export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  fixed: 1200,
  modalBackdrop: 1300,
  modal: 1400,
  popover: 1500,
  tooltip: 1600,
} as const;
```

### CSS Variables

```css
:root {
  --z-base: 0;
  --z-dropdown: 1000;
  --z-sticky: 1100;
  --z-fixed: 1200;
  --z-modal-backdrop: 1300;
  --z-modal: 1400;
  --z-popover: 1500;
  --z-tooltip: 1600;
}
```

---

## Component-Specific Tokens

### Tool Button

```typescript
export const toolButton = {
  size: '44px',
  iconSize: '20px',
  hotkeyBadgeHeight: '12px',
  hotkeyFontSize: '11px',
  spacing: '4px',
  borderRadius: 'var(--radius-md)',

  // States
  default: {
    background: 'transparent',
    border: '1px solid transparent',
    iconColor: 'var(--color-text-secondary)',
  },
  hover: {
    background: 'var(--color-hover-overlay)',
    border: '1px solid var(--color-border-subtle)',
    iconScale: '1.05',
  },
  active: {
    background: 'var(--color-active-overlay)',
    border: '2px solid var(--color-accent-primary)',
    iconColor: 'var(--color-text-primary)',
  },
} as const;
```

### Parameters Panel

```typescript
export const parametersPanel = {
  width: '280px',
  background: 'var(--color-surface)',
  padding: 'var(--space-lg)',
  borderRadius: 'var(--radius-lg)',
  shadow: 'var(--shadow-panel)',
} as const;
```

### Canvas

```typescript
export const canvas = {
  background: '#1E1E1E',
  checkerboardLight: '#252525',
  checkerboardDark: '#1A1A1A',
  checkerboardSize: '16px',
  border: '1px solid var(--color-border)',
} as const;
```

### Thumbnail Strip

```typescript
export const thumbnailStrip = {
  height: '120px',
  thumbnailSize: '96px',
  background: 'rgba(44, 44, 44, 0.9)',
  backdropBlur: '8px',
  borderRadius: 'var(--radius-lg)',
  padding: 'var(--space-md)',
} as const;
```

---

## Motion Preferences

### Reduced Motion Support

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### TypeScript Utility

```typescript
export function getTransitionDuration(duration: keyof typeof transitionDuration): string {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return prefersReducedMotion ? '0.01ms' : transitionDuration[duration];
}
```

---

## Usage Examples

### React Component with Tokens

```typescript
import { colors, spacing, borderRadius } from '~/Theme/tokens';

function Card({ children }: Props) {
  return (
    <div
      style={{
        background: colors.surface,
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
        border: `1px solid ${colors.border}`,
      }}
    >
      {children}
    </div>
  );
}
```

### Tailwind Classes

```jsx
<div className="bg-surface p-lg rounded-lg border border-border">
  {children}
</div>
```

### Emotion CSS

```typescript
import { css } from '@emotion/react';
import { colors, spacing } from '~/Theme/tokens';

const cardStyles = css`
  background: ${colors.surface};
  padding: ${spacing.lg};
  border-radius: ${borderRadius.lg};
  border: 1px solid ${colors.border};
`;

function Card({ children }: Props) {
  return <div css={cardStyles}>{children}</div>;
}
```

---

## Implementation Files

### Create These Files

1. **`src/Theme/tokens.ts`** - TypeScript token exports
2. **`src/Theme/tokens.css`** - CSS variable definitions
3. **`tailwind.config.js`** - Tailwind theme extensions

### Migration Path

1. Create token files with values from this document
2. Update global CSS to use CSS variables
3. Gradually migrate components to use tokens
4. Remove hardcoded values from codebase

---

**Status**: Implementation Ready
**Next Steps**: Create TypeScript and CSS token files in codebase
