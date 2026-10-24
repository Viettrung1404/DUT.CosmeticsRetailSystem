---
name: Rose Berry Editorial Elegance
colors:
  surface: '#fff8f6'
  surface-dim: '#f2d4c9'
  surface-bright: '#fff8f6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fff1ec'
  surface-container: '#ffe9e2'
  surface-container-high: '#ffe2d8'
  surface-container-highest: '#fbdcd1'
  on-surface: '#281811'
  on-surface-variant: '#554244'
  inverse-surface: '#3f2c25'
  inverse-on-surface: '#ffede7'
  outline: '#887174'
  outline-variant: '#dbc0c3'
  surface-tint: '#a03b52'
  primary: '#9d394f'
  on-primary: '#ffffff'
  primary-container: '#bc5167'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb2bd'
  secondary: '#725950'
  on-secondary: '#ffffff'
  secondary-container: '#fad9cd'
  on-secondary-container: '#765d54'
  tertiary: '#5047cd'
  on-tertiary: '#ffffff'
  tertiary-container: '#6a62e7'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffd9dd'
  primary-fixed-dim: '#ffb2bd'
  on-primary-fixed: '#400013'
  on-primary-fixed-variant: '#81243b'
  secondary-fixed: '#fddbd0'
  secondary-fixed-dim: '#e0c0b4'
  on-secondary-fixed: '#291710'
  on-secondary-fixed-variant: '#584239'
  tertiary-fixed: '#e3dfff'
  tertiary-fixed-dim: '#c4c0ff'
  on-tertiary-fixed: '#110068'
  on-tertiary-fixed-variant: '#3a2eb7'
  background: '#fff8f6'
  on-background: '#281811'
  surface-variant: '#fbdcd1'
  background-canvas: '#F9ECEE'
  surface-card: '#FFFFFF'
  surface-subtle: '#FEFAFC'
  text-muted: '#AD9F9C'
  border-subtle: '#EFE5E7'
typography:
  display-lg:
    fontFamily: Playfair Display
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Playfair Display
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Playfair Display
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '700'
    lineHeight: 24px
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 22px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 0.75rem
  gutter-md: 1rem
  gutter-lg: 1.5rem
  margin: 1rem
  margin-md: 1.5rem
  margin-lg: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
  space-2xl: 2rem
---

## Brand & Style

The brand personality evokes intimate luxury, tactile indulgence, and contemporary beauty editorial craft. Tailored for discerning skincare and cosmetics shoppers, the UI inspires confidence, calm, and pampering through warm blush undertones and considered editorial contrast. 

The aesthetic is a hybrid of Modern Editorial Romance and Tactile Commerce:
- **High-End Editorial Polish:** High-contrast transitional serifs for editorial anchors and curated storytelling balance against crisp, warm modern grotesque body typography.
- **Warm Tactile Surfaces:** Pure white floating planes nested on powdery soft blush canvases avoid the cold, clinical feel of standard e-commerce.
- **Restrained Luxe Accents:** Rose Berry serves as an emotional focal point for conversion and desire, supported by dusty earth tones and unexpected lilac-purple highlights for exclusive drops and botanical highlights.

## Colors

The palette leverages a gentle warm-cast foundation with deep espresso ink rather than pure black, ensuring gentle contrast against soft blush tones.

- **Primary (`#C85A70` / Rose Berry):** Core action driver, active states, key conversion touchpoints, and promotional callouts.
- **Secondary (`#9D8177` / Dusty Nude):** Subtle framing, borders, secondary iconography, and grounded textural elements.
- **Tertiary (`#7069EE` / Purple Tint):** Specialized editorial badges, new product drops, rewards, and feature accents.
- **Neutral (`#412E27` / Deep Espresso):** Foundational typography and high-contrast structural graphic elements.

### Surface and Canvas Guidance
The underlying canvas utilizes `background-canvas` (`#F9ECEE`). Interactive containers and primary cards elevate using `surface-card` (`#FFFFFF`), while inset input fields, secondary badges, and nested cards rest on `surface-subtle` (`#FEFAFC`). Hairline dividing structures must strictly use `border-subtle` (`#EFE5E7`) to maintain an airy, seamless visual continuity.

## Typography

Typography establishes an intimate, luxury beauty tone by contrasting classic, high-contrast serif display typography with clean, geometric grotesque body text.

- **Editorial Serifs (`Playfair Display`):** Reserved for collection launches, hero intros, feature banners, and prominent pricing highlights. It should never be used below 18px to preserve hairline stroke integrity.
- **Commerce Sans (`Plus Jakarta Sans`):** Delivers clean readability for product attributes, navigation, specifications, checkout flows, and microcopy.
- **Hierarchy Rules:** Product titles use `body-md` with medium or semibold weight (`500` or `600`) to maintain a quiet elegance, allowing product imagery and the Rose Berry price tags (`title-md` or `label-lg`) to draw immediate eye focus.

## Layout & Spacing

The layout is constructed around an ergonomic, mobile-first dual-column commerce grid transitioning into refined modular columns on wider viewports.

- **Mobile (< 768px):** 4-column layout with 16px (`1rem`) outer margins and a dense 12px (`0.75rem`) gutter optimized for side-by-side product cards.
- **Tablet (768px - 1024px):** 8-column layout with 24px (`1.5rem`) outer canvas margins and 16px (`1rem`) gutters.
- **Desktop (> 1024px):** 12-column layout capped at 1280px max-width, 32px (`2rem`) outer margins, and 24px (`1.5rem`) gutters.

Component internals adhere strictly to 4px/8px rhythm. Compact inputs and button clusters use `space-sm` and `space-md`, while full card shells and modal sheets employ `space-lg` to `space-xl` for breathability.

## Elevation & Depth

Depth avoids heavy, dark drop shadows. Instead, it relies on soft, diffused ambient light warmed with a subtle primary hue tint.

- **Level 0 (Flat / Inset):** No shadow. Inset search fields and segmented selectors rely on `surface-subtle` (`#FEFAFC`) and `border-subtle` (`#EFE5E7`).
- **Level 1 (Card Rest / Floating Items):** `0px 4px 16px rgba(200, 90, 112, 0.08)`. Applied to product cards, action chips, and floating badge panels.
- **Level 2 (Hover / Active Bottom Bar):** `0px 6px 20px rgba(200, 90, 112, 0.12)`. Applied to active navigation headers, bottom app bars, and floating cart triggers.
- **Level 3 (Modals / Overlays / Drawers):** `0px 12px 36px rgba(65, 46, 39, 0.14)`. Applied to bottom sheets, checkout drawers, and cart dialogs.

## Shapes

The interface balances organic cosmetic curves with structured editorial geometry. 

- **Containers & Product Cards:** Standard card bodies and media banners use `rounded-lg` (16px / `1rem`), providing a soft, touchable feel.
- **Controls & Buttons:** Interactive elements such as text fields, secondary cards, and standard action buttons use standard curvature (`12px` / `0.75rem`).
- **Pills & Micro-indicators:** Badges, category chips, wishlist circle overlays, and search pills use fully rounded circular/capsule curves (`rounded-full` / `9999px`).

## Components

### Buttons
- **Primary Button:** Height 48px, background `#C85A70`, typography `label-lg` in `#FFFFFF`, corner radius 12px. Active state transitions to `#B3495F`.
- **Secondary Button:** Height 48px, background `#FEFAFC`, border 1px solid `#C85A70`, typography `label-lg` in `#C85A70`, corner radius 12px.
- **Icon / Floating Action:** 40px circle or 12px rounded square on `#FFFFFF` with Level 1 tinted shadow, housing a 20px `#412E27` or `#C85A70` glyph.

### Cards & Product Tiles
- **Product Card:** Pure `#FFFFFF` background, 16px border radius, 1px solid `#EFE5E7` outline, Level 1 shadow. 
  - Aspect ratio 1:1 or 4:5 for product imagery.
  - Floating top-left badge in `#C85A70` (for discounts) or `#7069EE` (for new drops/clean beauty labels) with 6px vertical/horizontal inset.
  - Floating top-right wishlist heart button on a translucent `#FFFFFF` circular base.
  - Body area includes category tag in `#AD9F9C` (10px uppercase), title in `#412E27` (14px semibold), and price in `#C85A70` (15px bold).

### Input Fields & Controls
- **Inputs:** 48px height, `#FEFAFC` fill, 1px `#EFE5E7` border, 12px corner radius. Placeholder text rendered in `#AD9F9C`. Focused state introduces a 1.5px `#C85A70` stroke with a 3px soft tint ring (`rgba(200, 90, 112, 0.15)`).
- **Checkboxes & Radios:** 20px form factor, `#EFE5E7` unselected border, solid `#C85A70` fill with `#FFFFFF` check/dot when active.

### Chips & Segmented Controls
- **Filter Chips:** 36px height, rounded capsule geometry (`rounded-full`), `#FFFFFF` background with 1px `#EFE5E7` border. Selected state swaps to `#C85A70` fill with `#FFFFFF` text.

### Navigation Components
- **Bottom Navigation Bar:** Mobile-anchored bar on `#FFFFFF` with Level 2 upward shadow. Inactive icons in `#AD9F9C`; active icons in `#C85A70` accompanied by a 4px circular `#C85A70` dot indicator positioned 4px beneath the icon.