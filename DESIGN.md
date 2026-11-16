---
name: Organic Heritage Minimalist
colors:
  surface: '#faf9f5'
  surface-dim: '#dbdad6'
  surface-bright: '#faf9f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f4f0'
  surface-container: '#efeeea'
  surface-container-high: '#e9e8e4'
  surface-container-highest: '#e3e2df'
  on-surface: '#1b1c1a'
  on-surface-variant: '#54433e'
  inverse-surface: '#2f312e'
  inverse-on-surface: '#f2f1ed'
  outline: '#87736d'
  outline-variant: '#dac1bb'
  surface-tint: '#944932'
  primary: '#914730'
  on-primary: '#ffffff'
  primary-container: '#af5e46'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb59f'
  secondary: '#56642b'
  on-secondary: '#ffffff'
  secondary-container: '#d6e7a1'
  on-secondary-container: '#5a682f'
  tertiary: '#5c5c5c'
  on-tertiary: '#ffffff'
  tertiary-container: '#757474'
  on-tertiary-container: '#fffcfb'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbd1'
  primary-fixed-dim: '#ffb59f'
  on-primary-fixed: '#3a0a00'
  on-primary-fixed-variant: '#76321e'
  secondary-fixed: '#d9eaa3'
  secondary-fixed-dim: '#bdce89'
  on-secondary-fixed: '#161f00'
  on-secondary-fixed-variant: '#3e4c16'
  tertiary-fixed: '#e4e2e1'
  tertiary-fixed-dim: '#c8c6c5'
  on-tertiary-fixed: '#1b1c1c'
  on-tertiary-fixed-variant: '#474747'
  background: '#faf9f5'
  on-background: '#1b1c1a'
  surface-variant: '#e3e2df'
typography:
  display-lg:
    fontFamily: Playfair Display
    fontSize: 64px
    fontWeight: '600'
    lineHeight: 72px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 40px
    fontWeight: '600'
    lineHeight: 48px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '500'
    lineHeight: 40px
  headline-md:
    fontFamily: Playfair Display
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.1em
  label-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  section-gap-desktop: 120px
  section-gap-mobile: 64px
  grid-margin: 40px
  gutter: 24px
---

## Brand & Style

The brand personality is rooted in a balance of organic heritage and modern editorial refinement. It targets a discerning audience that appreciates artisanal quality, slow living, and the tactile nature of premium coffee culture. The UI must evoke a sense of calm, warmth, and quiet luxury.

The design style is **Minimalist-Editorial**. It eschews traditional "app-like" UI patterns in favor of a layout that feels like a high-end lifestyle magazine. Key characteristics include:
- **Expansive Whitespace:** Using negative space as a primary functional element to draw focus to high-quality product photography.
- **Micro-interactions:** Transitions should be soft and slow, mirroring the "slow coffee" movement.
- **Linear Precision:** Replacing shadows with hair-line dividers to maintain a flat but structured depth.
- **Organic Geometry:** A mix of sharp editorial lines and subtly softened corners to prevent the interface from feeling clinical.

## Colors

The palette is derived from natural earth tones, designed to provide a warm, tactile backdrop for vibrant imagery.

- **Primary (Terracotta):** Used for primary actions, price points, and active states. It provides a warm, sun-baked contrast to the cream background.
- **Secondary (Sage):** Used for success states, category badges, or organic certification callouts.
- **Background (Alabaster):** This warm off-white is the foundation of the design system. It reduces eye strain and feels more premium than pure white.
- **Text (Charcoal):** A softened black that maintains high legibility while appearing more integrated with the organic color palette.
- **Neutral (Soft Gray):** Reserved exclusively for 1px structural dividers and subtle UI scaffolding.

## Typography

Typography is the primary driver of the "Editorial" feel. 

- **Headlines:** Use Playfair Display. For large display titles, use semi-bold weights with slight negative letter spacing to create a tight, sophisticated look.
- **Body:** Use Inter for all functional text. The increased line height (1.5x+) ensures readability and contributes to the airy, open feel of the layout.
- **Labels:** Use uppercase Inter for utility labels, navigation items, and secondary metadata to provide a structured, "catalog" aesthetic.

## Layout & Spacing

This design system utilizes a **Fluid-Fixed Hybrid Grid**. 
- **Desktop:** A 12-column grid with a maximum content width of 1440px. Gutters are kept wide (24px) to emphasize separation without the need for borders.
- **Mobile:** A 4-column grid with 20px margins. 

**Spacing Philosophy:**
Use an 8px base unit, but prioritize "Super-spacing" between major content sections (80px to 120px). This reinforces the premium, unhurried brand narrative. Elements within a group (e.g., product title and price) should use tight spacing (8px-12px), while the groups themselves are separated by significant whitespace (40px+).

## Elevation & Depth

To maintain a minimalist and organic aesthetic, this design system avoids traditional drop shadows and multi-layered elevation.

- **Tonal Layering:** Depth is created through subtle shifts in background color (e.g., a slightly darker cream for a footer) rather than shadows.
- **Low-Contrast Outlines:** Use 1px solid borders in `#E5E5E5` for interactive elements like input fields or to separate sections where whitespace alone is insufficient.
- **Zero-Shadow Cards:** Products are not placed in boxes. They "float" on the background, separated by ample margin or a single horizontal line divider.

## Shapes

The shape language is **Soft-Minimalist**. 

- **Corner Radius:** A consistent 4px (Soft) radius is applied to buttons and inputs. This provides a hint of approachability without losing the sophisticated "sharpness" of an editorial layout. 
- **Imagery:** Product photography should either be sharp-edged (for full-bleed impact) or use a very large radius (24px+) for lifestyle insets to create an organic, "frame-like" appearance.
- **Dividers:** Horizontal rules are 1px thick and never span the full width of the container unless separating major page sections like the Header or Footer.

## Components

- **Buttons:** Primary buttons use a solid Terracotta (`#C06C53`) background with Alabaster text. Secondary buttons use a 1px Charcoal border with no fill. All buttons use the `label-caps` typography style.
- **Product Cards:** No background or border. The image is the hero, followed by the title in `headline-md` and the price in `body-md` (Primary color). 
- **Input Fields:** Minimalist design with only a bottom border (1px `#E5E5E5`). Upon focus, the border transitions to Charcoal (`#2C2C2C`).
- **Chips/Badges:** Small, pill-shaped tags with a Sage Green (`#8A9A5B`) background at 10% opacity and solid Sage text. Used for "New Arrival" or "Organic."
- **Lists:** Clean, left-aligned text with 1px horizontal dividers between items. Avoid icons unless they are custom-drawn, ultra-thin line art.
- **Navigation:** The header uses a persistent Alabaster background. Links are in `label-caps` with a 2px underline appearing only on hover or active state.ln