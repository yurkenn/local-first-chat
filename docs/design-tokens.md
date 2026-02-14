# Lotus Design System Tokens

> Auto-generated reference for the Lotus organic dark theme.

## Color Palette

| Token | HSL | Usage |
|-------|-----|-------|
| `--background` | `150 8% 8%` | App background (deep forest) |
| `--foreground` | `140 6% 88%` | Primary text |
| `--card` | `150 7% 11%` | Card/panel surfaces |
| `--popover` | `150 7% 13%` | Dropdowns, tooltips |
| `--primary` | `140 14% 55%` | Sage green accent |
| `--secondary` | `150 6% 15%` | Muted sage-gray |
| `--muted` | `150 5% 15%` | Disabled/subtle bg |
| `--muted-foreground` | `150 5% 52%` | Secondary text |
| `--accent` | `140 12% 18%` | Hover/focus bg |
| `--destructive` | `0 70% 58%` | Error/danger |
| `--border` | `150 4% 18%` | Subtle borders |
| `--ring` | `140 14% 55%` | Focus rings |
| `--lotus` | `330 60% 65%` | Brand lotus pink |
| `--lotus-glow` | `330 70% 55%` | Lotus glow effect |

### Status Colors

| Token | Description |
|-------|-------------|
| `--online` | `142 76% 46%` — Online indicator |
| `--idle` | `48 96% 53%` — Idle/away |
| `--dnd` | `0 84% 60%` — Do not disturb |
| `--offline` | `150 3% 40%` — Offline gray |
| `--voice-active` | `142 71% 45%` — Active voice |

## Typography

| Family | Token | Stack |
|--------|-------|-------|
| Body | `--font-sans` | DM Sans, system-ui |
| Headings | `--font-heading` | Plus Jakarta Sans |
| Code | `--font-mono` | JetBrains Mono |

### Fluid Scale

| Class | Min | Max |
|-------|-----|-----|
| `.text-fluid-xs` | 11px | 12px |
| `.text-fluid-sm` | 12px | 14px |
| `.text-fluid-base` | 14px | 16px |
| `.text-fluid-lg` | 16px | 18px |
| `.text-fluid-xl` | 18px | 22px |
| `.text-fluid-2xl` | 22px | 28px |

## Spacing & Layout

### Responsive Breakpoints

| Breakpoint | Width | Sidebar | Channel | Member |
|------------|-------|---------|---------|--------|
| Mobile | < 768px | overlay | overlay | overlay |
| Tablet | ≥ 768px | 280px | 260px | 250px |
| Desktop | ≥ 1024px | 72px | 260px | 260px |
| XL | ≥ 1440px | 72px | 280px | 280px |

### Spacing Utilities

| Class | Range |
|-------|-------|
| `.gap-responsive` | 8–16px |
| `.p-responsive` | 12–24px |
| `.px-responsive` | 12–24px (inline) |
| `.py-responsive` | 8–16px (block) |

## Animations

| Token | Duration | Curve |
|-------|----------|-------|
| `--animate-fade-in` | 0.3s | ease-out |
| `--animate-slide-in` | 0.3s | ease-out |
| `--animate-scale-in` | 0.25s | ease-out |
| `--animate-pulse-ring` | 2.5s | infinite |
| `--animate-breathe` | 4s | infinite |

## Radius

| Token | Value |
|-------|-------|
| `--radius` | `0.625rem` (10px) |
| Derived | `calc(var(--radius) - 2px)` for sm |

## Component Tokens

### Status Dots
- `.status-dot` — 12×12 base
- `.status-dot--sm` — 10×10
- `.status-dot--xs` — 8×8

### Focus Ring
- `.focus-ring` — 2px ring with offset

### Form States
- `.form-error` — red error text
- `.input-error` — red border input
- `.disabled` — 50% opacity, no events
