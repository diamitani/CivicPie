# Design System — CivicPie v2

## Brand Guidelines (from CivicPie_Brand_Guidelines_v2.pptx)

### Product Context
- **What this is:** Hyper-local civic engagement platform. Find your district, connect with officials, discover events and community resources.
- **Who it's for:** Constituents, first-time voters, engaged residents, small business owners, civic volunteers, educators.
- **Space/industry:** Civic tech / local government / community platforms
- **Project type:** Web app with marketing landing page + authenticated dashboard

### Aesthetic Direction
- **Direction:** Editorial civic warmth — authoritative but human. Government-grade credibility meets neighborhood-storefront approachability.
- **Decoration level:** Intentional — subtle gradients, gold accents for emphasis, cream backgrounds for warmth. Lora serif for human moments (pull quotes, manifesto).
- **Mood:** "As American as knowing who's on the ballot." Confident, clear, useful. Not flashy. Not bureaucratic.

## Typography
- **Display/Headings:** Montserrat (weight 700-900) — authority, confidence, civic weight
- **Serif/Human:** Lora (weight 400-600, italic) — pull quotes, manifesto lines, section intros
- **Body/UI:** Inter (weight 300-600) — clean reading, labels, forms

## Color Palette
- **Navy (Patriot Blue):** #001B3D — Primary brand, backgrounds, authority
- **Navy Mid:** #0A2A4A — Cards, sidebar
- **Navy Light:** #1C3A5E — Hover states
- **Red (Liberty Red):** #C41230 — Accent, CTAs, active states, urgency
- **Red Hover:** #E8243E — Button hover
- **Gold (Crust Gold):** #E8A030 — Warmth, highlights, featured items
- **Gold Light:** #F5BE6A — Gold hover
- **Gold Dim:** #B87818 — Text on light backgrounds
- **Brown (Apple Brown):** #C8781A — Depth, texture
- **Cream:** #F5EDD8 — Warm backgrounds, calm sections
- **Cream Dark:** #EDE0C4 — Borders on cream
- **Stone:** #6B7280 — Body text, UI chrome
- **Stone Light:** #9BA3AF — Muted text, placeholders

## Spacing
- **Base unit:** 4px
- **Scale:** 1(4) 2(8) 3(12) 4(16) 5(20) 6(24) 8(32) 10(40) 12(48) 16(64) 20(80) 24(96) 32(128)

## Layout
- **Approach:** Grid-disciplined with editorial hero moments
- **Grid:** 12-column, 24px gutter
- **Max content width:** 1200px (sometimes 1400px for listings)
- **Border radius:** sm(4) md(8) lg(12) xl(20) pill(100px)

## Motion
- **Approach:** Intentional — scroll reveals, subtle hover states, no gratuitous animation
- **Easing:** custom cubic-bezier(0.25, 0.46, 0.45, 0.94)
- **Duration:** fast(150ms) base(250ms) slow(400ms)

## Component Patterns
- **Buttons:** Primary (red bg, white text), Secondary (navy outline), Ghost (transparent on dark), Gold (gold bg, navy text), Pill (cream bg)
- **Cards:** Feature (white, red left accent on hover), Dark (navy mid bg), Listing (directory-style with icon), Stat (centered number + label), Official (avatar + name + role)
- **Navigation:** Fixed top, transparent on hero, solid navy on scroll. Logo (pie SVG) + wordmark + nav links + sign in/sign up CTAs
- **Hero:** Navy background, grid texture, red+gold glows, search bar, floating ward card
- **Alerts:** Left border accent (navy/red/gold/green), icon + title + body text

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-07-28 | v2 brand system from PPTX | User-provided brand guidelines with Montserrat/Lora/Inter, navy/red/gold/cream palette |
| 2026-07-28 | Landing page from civicpie_landing.html | User-designed landing page with hero, how-it-works, features, listings, elections, testimonials |
| 2026-07-28 | District template architecture | From PRD: one template for all district types nationwide, config-driven per district |
