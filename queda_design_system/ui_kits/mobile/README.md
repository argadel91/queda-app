# queda — Mobile UI Kit

Redesigned core screens for the queda PWA. Dark, minimal, mobile-first.
Matches the real codebase tokens exactly (`src/theme.js`) and adds richer
component variants that replace the hackathon-level originals.

## Files

- `index.html` — click-through demo (iOS frame)
- `Shell.jsx` — `Header`, `BottomNav`, `Wordmark`, icon primitives
- `PlanCards.jsx` — `HeroPlanCard`, `PlanCard`, `FilterPills`, `DayHeader`,
  `AvatarStack`, `CategoryBadge`, `MetaChip`
- `FeedScreen.jsx` — fully-assembled Feed with mock data
- `ios-frame.jsx` — iOS 26 device bezel (starter component)

## Screens covered

- **Feed** ✅ redesigned — hero card, grouped-by-day list, filter pills,
  empty state, inline create CTA, premium header with token pill.
- Create / Plan detail / Mine / Profile — **not yet redesigned**; will
  ship in follow-up rounds as requested in the brief.

## Usage

Open `index.html`. All tokens live in `colors_and_type.css` at the project
root; components read them via a small `window.Q` token object that mirrors
`theme.js`.

## Design decisions vs. the original

- **Hero card** for the next-up plan (time-boxed, accent ribbon, avatar stack, CTA).
- **Time-block PlanCard** — time becomes the card's visual anchor, not the category.
- **Grouped by day** (Later today · Tomorrow · Sat 20 Apr) — the brief says
  24–72h horizon; the feed should reflect that.
- **SVG iconography** for nav and header (bell, feed, plus, grid, profile)
  instead of unicode marks. Stroke-only, 1.8–2.5px, mirrors the product's
  minimal, geometric feel.
- **Token pill upgraded** — glowing lime dot + tighter typographic rhythm.
- **Avatar stack on hero** — social proof without leaving the feed.
