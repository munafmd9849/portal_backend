---
name: PWIOI Placement Portal
description: Campus placement portal with warm cream auth surfaces and clean task-focused dashboards
colors:
  primary: "#1a2a3a"
  secondary: "#4a6fa5"
  accent-gold: "#B8860B"
  accent-orange: "#E0B767"
  surface-cream: "#FFF7E6"
  surface-strong: "#FFFBF5"
  text-primary: "#1F2933"
  text-secondary: "#6B7280"
  text-muted: "#9CA3AF"
  border-warm: "#F0E0B8"
  indigo-action: "#6366f1"
typography:
  display:
    fontFamily: "Montserrat, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 400
    fontSize: "1rem"
    lineHeight: 1.6
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 500
    fontSize: "0.875rem"
    lineHeight: 1.4
  accent-script:
    fontFamily: "Caveat, cursive"
    fontWeight: 500
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  full: "9999px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.indigo-action}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  button-primary-hover:
    backgroundColor: "#4f46e5"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  card-surface:
    backgroundColor: "#ffffff"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "24px"
---

# Design System: PWIOI Placement Portal

## 1. Overview

**Creative North Star: "The Campus Command Center"**

PWIOI Placement Portal blends a warm institutional landing experience with dense, trustworthy product dashboards. The public site uses cream backgrounds, gold accents, and expressive display type; authenticated surfaces shift to Inter-driven UI with indigo primary actions, white cards, and semantic status colors.

The system rejects generic AI marketing aesthetics. Depth comes from tonal layering and subtle shadows, not glassmorphism or neon gradients.

**Key Characteristics:**
- Warm cream (`--pl-bg`) for auth and landing; white/gray surfaces in dashboards
- Inter for UI; Montserrat for headings; Caveat for playful accent moments only
- Indigo (`#6366f1`) as the primary action color in app surfaces
- Gold (`#B8860B`) as the brand accent on marketing/auth flows
- Rounded corners (8–12px) on cards; full-radius pills for chips and scrollbars
- Motion conveys state (fade, slide) — restrained in dashboards, more expressive on landing

## 2. Colors

The palette splits into **brand-warm** (landing/auth) and **product-cool** (dashboards).

### Primary
- **Deep Navy Slate** (`#1a2a3a` / `--primary-color`): Headings, nav emphasis, institutional anchors on landing sections.

### Secondary
- **Steel Blue** (`#4a6fa5` / `--secondary-color`): Secondary CTAs, carousel controls, testimonial accents.

### Tertiary
- **Campus Gold** (`#B8860B` / `--pl-primary`): Links, brand highlights, auth accents. Use sparingly on dashboards.
- **Warm Amber** (`#E0B767` / `--pl-accent-orange`): Tab highlights, soft emphasis on landing skill cards.

### Neutral
- **Cream Canvas** (`#FFF7E6` / `--pl-bg`): Auth and landing page background.
- **Warm White** (`#FFFBF5` / `--pl-surface-strong`): Elevated panels on cream surfaces.
- **Ink Text** (`#1F2933` / `--pl-text`): Primary body copy.
- **Slate Secondary** (`#6B7280` / `--pl-text-secondary`): Supporting text, labels.
- **Muted Gray** (`#9CA3AF` / `--pl-text-muted`): Placeholders, de-emphasized metadata.
- **Warm Border** (`#F0E0B8` / `--pl-border`): Dividers on cream surfaces.

### Named Rules
**The Dual-Lane Rule.** Landing/auth uses cream + gold. Dashboards use white/gray + indigo actions. Do not mix gold CTAs into dense data tables.

## 3. Typography

**Display Font:** Montserrat (headings, section titles)
**Body Font:** Inter (UI, forms, tables, body copy)
**Accent Font:** Caveat (decorative landing moments only — never in tables, forms, or admin labels)

**Character:** Professional and readable. Inter carries the product; Montserrat adds weight to marketing headlines; Caveat is a spice, not a base.

### Hierarchy
- **Display** (700, clamp max 4rem, 1.1–1.2 line-height): Landing hero headlines only.
- **Headline** (600–700, 1.5–2rem): Section headers on landing and dashboard page titles.
- **Title** (600, 1.125–1.25rem): Card titles, modal headers, table section labels.
- **Body** (400, 1rem, 1.6 line-height): Paragraphs, descriptions, form help text. Max 65–75ch for prose.
- **Label** (500, 0.875rem, slight tracking): Form labels, badges, table column headers.

### Named Rules
**The One UI Family Rule.** Inter handles all interactive UI. Montserrat is for marketing headings. Caveat never appears in admin tables, buttons, or form labels.

## 4. Elevation

Depth is conveyed through **soft shadows and surface tinting**, not heavy drop shadows.

- Default card shadow: `0 10px 30px rgba(0,0,0,0.08)` (`--shadow`)
- Carousel/nav buttons: `0 5px 15px rgba(0,0,0,0.1)`
- Dashboard cards: light border (`rgba(0,0,0,0.03)`) plus subtle shadow on hover

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. Elevation increases on hover/focus for interactive cards and modals only.

## 5. Components

### Buttons
- **Shape:** 8px radius (`rounded-lg` / `{rounded.md}`)
- **Primary (dashboard):** Indigo background (`#6366f1`), white text, hover `#4f46e5`
- **Primary (landing/auth):** Blue-600 (`bg-blue-600`) or gold-accent links on cream
- **Hover / Focus:** Color shift + optional `transition-colors`; disabled uses `opacity-50`

### Cards / Containers
- **Corner Style:** 12px (`rounded-xl` / `{rounded.lg}`)
- **Background:** White on dashboards; cream-tinted or white on landing
- **Border:** `1px solid rgba(0,0,0,0.03)` or `--pl-border` on warm surfaces
- **Internal Padding:** 24–32px (`p-6` to `p-8`)

### Inputs / Fields
- **Style:** Light border, cream or white background on auth; gray border on dashboards
- **Focus:** Ring or border color shift to accent (blue/indigo)
- **Error:** Red text with clear message; never color-only

### Navigation
- **Landing:** Header with role-based login triggers; smooth-scroll sections
- **Dashboard:** Sidebar or top nav with role-specific routes; active state via background tint or indigo accent
- **Mobile:** Collapsible nav; touch-friendly tap targets (min 44px)

### Tables (Admin)
- **Style:** Dense rows, sortable headers with blue sort indicators (`#3b82f6`)
- **Scrollbar:** Custom indigo thumb (`#6366f1`) on `#e0e7ff` track for horizontal scroll areas

## 6. Do's and Don'ts

### Do:
- **Do** use `--pl-*` tokens on auth/landing cream surfaces.
- **Do** use indigo (`#6366f1`) for primary actions in student/recruiter/admin dashboards.
- **Do** provide hover, focus, disabled, and loading states on every interactive component.
- **Do** keep admin tables dense but scannable with consistent badge colors for status.
- **Do** respect `prefers-reduced-motion` for landing animations.

### Don't:
- **Don't** use purple gradients, glassmorphism, or floating 3D blobs (generic SaaS landing clichés).
- **Don't** put Caveat or display fonts in data tables, form labels, or admin toolbars.
- **Don't** mix gold landing accents into dense dashboard tables without semantic reason.
- **Don't** use modals when inline expansion or a dedicated page would be clearer.
- **Don't** ship inconsistent button styles across student, recruiter, and admin surfaces.
