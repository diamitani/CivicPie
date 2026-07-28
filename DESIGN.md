# Design System — CivicPie

## Product Context
- **What this is:** Hyper-local civic engagement platform. Find your district, connect with officials, discover events and community resources.
- **Who it's for:** Residents who want to engage with local government but don't know where to start. Indie artists, small business owners, precinct captains, neighborhood organizers.
- **Space/industry:** Civic tech / local government / community platforms
- **Project type:** Web app with location-first UX (think Nextdoor meets city hall)

## Aesthetic Direction
- **Direction:** Civic Modern — authoritative but warm. Government-grade credibility with neighborhood-storefront approachability.
- **Decoration level:** Intentional — subtle gradients, gold accents for emphasis, glass surfaces for depth. Never decorative for decoration's sake.
- **Mood:** "I know exactly who represents me and what's happening on my block." Confident, clear, useful. Not flashy. Not bureaucratic.

## Typography
- **Display/Hero:** Inter (weight 700-800) — clean, modern, high x-height for readability at large sizes
- **Body:** Inter (weight 400-500) — consistent with display, excellent screen rendering
- **UI/Labels:** Inter (weight 500-600) — same family, slightly bolder for UI chrome
- **Data/Tables:** Inter (tabular-nums enabled) — numbers align cleanly
- **Code:** JetBrains Mono
- **Loading:** Google Fonts via next/font (built-in subsetting)

## Color
- **Approach:** Restrained — navy dominant, gold as sole accent. Color is rare and meaningful.
- **Primary:** #2563eb (blue-600) — links, primary actions, data visualization
- **Secondary:** #0d9488 (teal-600) — success states, secondary data
- **Accent:** #c9a227 (gold) — brand moments, emphasis, active states. Use sparingly.
- **Neutrals (dark mode):**
  - Surface: #0a1628 (navy-900) — page background
  - Card: rgba(255,255,255,0.03) — glass cards
  - Border: rgba(255,255,255,0.06) — subtle separation
  - Text primary: #e2e8f0 (gray-200)
  - Text secondary: #94a3b8 (gray-400)
  - Text muted: #64748b (gray-500)
- **Semantic:** success #22c55e, warning #f59e0b, error #ef4444, info #3b82f6

## Spacing
- **Base unit:** 4px
- **Density:** Comfortable — enough whitespace for scanning, not so much it feels empty
- **Scale:** 2xs(2) xs(4) sm(8) md(16) lg(24) xl(32) 2xl(48) 3xl(64) 4xl(96)

## Layout
- **Approach:** Grid-disciplined with editorial hero moments
- **Grid:** 12-column, 24px gutter
- **Max content width:** 1280px (max-w-7xl)
- **Border radius:** sm:6px, md:12px, lg:16px, xl:24px, full:9999px

## Motion
- **Approach:** Minimal-functional — transitions that aid comprehension, no gratuitous animation
- **Easing:** enter(ease-out), exit(ease-in), move(ease-in-out)
- **Duration:** micro(100ms), short(200ms), medium(300ms), long(500ms)

## Component Patterns
- **Cards:** glass surface (rgba white 0.03), subtle border, 16px radius, 24px padding
- **Buttons:** Primary (blue gradient), Secondary (ghost white border), Accent (gold, rare)
- **Inputs:** Dark surface, light border, gold focus ring
- **Chips:** Rounded pill, blue tint, for tags/filters
- **Tabs:** Bottom-border indicator, gold for active

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-07-28 | Initial design system | CivicPie v1 rebuild with gstack methodology. Dark theme for readability, gold accent for civic authority, Inter for clean typography. |
