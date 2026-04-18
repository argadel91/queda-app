# queda Design System

Dark, minimal, mobile-first social app for spontaneous plans in the next 24–72h.
The competitor isn't Meetup — it's the sofa.

**Sources**
- Codebase: `queda-app/` (local mount — Vite + React 18, Supabase, PWA)
- Brief: `queda-app/queda-brief.md` (product/UX bible, ES)
- Repo: `github.com/argadel91/queda-app`
- Live: `queda.xyz`

## Index

- `README.md` — this file (brand, content, visual foundations, iconography)
- `colors_and_type.css` — design tokens (CSS vars)
- `fonts/` — Syne (display), DM Sans (body) — **Google Fonts CDN**, no local binaries
- `assets/` — logos, icons, OG image
- `preview/` — design-system cards (registered for Design System tab)
- `ui_kits/mobile/` — UI kit: app shell, plan cards, feed, bottom nav, redesigned Feed screen
- `SKILL.md` — agent-skills-compatible entry point

---

## Product context

**queda** is a mobile-first PWA that surfaces short-horizon, spontaneous plans
(pickup football today, coffee tomorrow, a hike Saturday). Users don't declare
interests; the system infers them from which plans they join, skip, or try to
join.

Primary user: **Alejandro** — man, 28–38, socially isolated, not looking for
dating/networking. Wants to show up to something real this week.

Economy: **21-token cap per user**. Joining a plan locks 2 tokens as a deposit;
showing up returns them. No-shows forfeit. Organizers earn back more than they
spend when the plan actually happens. One currency, no real money in MVP.

**Core screens** (already built in code):
Feed, Create Plan, Plan Detail, My Plans, Profile, Wallet, Notifications,
Signup/Login/Verify, Onboarding, Welcome.

---

## CONTENT FUNDAMENTALS

**Voice.** Blunt, short, physical. Action verbs. No marketing softness, no
"community," no "journey." Copy should read like a friend texting, not a brand
campaign.

**Casing.** Sentence case everywhere. The word **queda** is always lowercase
and ends in a lime-green period: `queda.` — the period is the mark.

**Person.** Second person ("you're in", "you earn +1"). The app never refers to
itself in first person.

**Length.** Labels are 1–3 words. Helpers max one short sentence. If a sentence
reaches two lines on mobile, cut it.

**Examples of real copy** (from code):
- Landing: "Spontaneous plans with real people. Get off the couch."
- Feed header: "What's on"
- Empty state: "Nothing happening yet." / "Create the first plan →"
- Join CTA: "Join · 1 token" / "Request to join · 1 token"
- Joined state: "✓ You're in"
- Checkout prompt: "Check out — who showed up?"
- Footer hint on Create: "Free to create. You earn +1 token when it happens."
- Danger action: "Leave plan" / "Cancel plan" (never "Are you sure?")

**Numbers.** Always numeric (6, not "six"). Token amounts prefix the unit:
`1 token`, `+2 tokens`, `6/8`. Time uses 24h in the UI (`18:30`), short
weekday + day + month for dates (`Sat 20 Apr`).

**Emoji.** Used sparingly as **category glyphs and status markers**, not as
decoration. The set is fixed:
- Categories: 💪 Active · 💬 Social · ✨ Experience · ➕ Other
- Inline status: 📍 location · 📅 date · 👥 capacity · 🔒 private · 🔓 open ·
  ⚥ gender filter · 📝 notes · 🌙 empty state · 🔔 notifications · 📋 copy link
- Affirm/deny: ✓ attended · ✗ no-show · ⏳ pending
Never use emoji inside headings or buttons other than these fixed glyphs.

**Languages.** UI copy is English but the product was conceived in Spanish;
keep phrasing translatable (avoid idioms like "stoked", "jam"). Locales declared:
`es`, `en-GB`, `pt-PT`, `fr-FR`, `de-DE`, `it-IT`.

---

## VISUAL FOUNDATIONS

**Palette.** Near-black ground, cream ink, one accent.
- `--bg` **#060608** — canvas
- `--bg-elev` **#111116** — inputs, pills
- `--bg-card` **#16161C** — cards, surfaces
- `--border` **#222230** — hairlines
- `--text` **#F0EBE1** — cream foreground
- `--text-dim` **#7A7A8A** — muted
- `--accent` **#CDFF6C** — lime, used sparingly for CTAs and the logo period
- `--accent-soft` `rgba(205,255,108,0.12)` — accent chip backgrounds
- `--danger` **#FF6068** / `--danger-soft` `rgba(255,96,104,0.12)`
- Accent gradient (primary CTAs only):
  `linear-gradient(135deg, #CDFF6C 0%, #7BF5A5 100%)`

**Type.**
- Display: **Syne 800** (geometric, slightly quirky) — page titles, logo, numbers.
- Body: **DM Sans 400 / 500 / 600** — everything else.
- Fallbacks: `system-ui, sans-serif`.
- Letter spacing: display runs tight (`-0.3` to `-1`); small caps / labels run
  wide (`+1.5` to `+2`, uppercase).

**Scale** (px). `26` page h1 · `18` card title · `15` body · `14` body-sm ·
`13` helper · `11` eyebrow/label (uppercase, tracked).

**Radii.** `14` cards / `10` buttons & inputs / `999` pills and token chip.
Do not mix other radii.

**Spacing.** 4-based. Common values: 4 / 6 / 8 / 10 / 12 / 16 / 18 / 20 / 24.
Card padding `16 18`. Screen padding `20 16`. List gap `12`.

**Elevation / shadows.** None. Depth comes from layered surfaces
(bg → bg-elev → bg-card) and 1px borders. No drop shadows, no inner shadows.

**Backgrounds.** Flat near-black. No gradients on surfaces. No imagery, no
noise, no patterns. The only gradient in the system is the accent CTA
gradient — treat it as the one exception.

**Borders.** Always 1px, always `--border` (#222230), never lighter. Selected/
active states replace the border with a filled accent surface (no thicker
borders).

**Transparency & blur.** Sticky header and bottom nav use
`rgba(6,6,8,0.85–0.92)` + `backdrop-filter: blur(16px) saturate(1.5)`. Blur is
used **only** on fixed-chrome bars, never on cards or dialogs.

**Cards.** `bg-card` + 1px border + `14px` radius + `16 18` padding. No shadow.
Hover: border tone brightens very slightly (designer judgement). Press: no
movement — the link takes you away.

**Buttons.**
- Primary CTA: accent gradient, ink-black text, `700` weight, `10px` radius.
- Secondary: transparent bg, 1px border, cream text, `600` weight.
- Danger: `danger-soft` background, `danger` text, no border.
- Pills: 999 radius, `12–13` size, active state = gradient fill + ink text.

**Hover / press.** Desktop hover is minimal (color shift on borders/dim text).
Mobile press = flash to a slightly lighter tone via `active:opacity-90` or a
color swap. **No scale transforms, no bounces.** `transition: 150ms ease` on
color/border only.

**Animation.** Essentially none. Linear fades (`150ms`) on filter pills, join
state changes, tab switches. No slide-ins, no springs. The product's personality
is **speed, not motion**.

**Protection gradients vs capsules.** Capsules over gradients. Pills and token
chips are preferred over translucent scrims. Only the sticky header/footer use
the translucent blur treatment.

**Layout rules.**
- Mobile-first. Max content width **480px**, centered.
- Sticky header (top, 56px-ish) and fixed bottom nav (4 columns).
- Safe-area insets respected (`env(safe-area-inset-bottom)`).
- Content padding `20px 16px`, bottom padding reserves 88px for the nav.

**Iconography treatment.** See ICONOGRAPHY below. In short: emoji glyphs +
geometric unicode marks (`◉ ＋ ▤ ○`) for nav. No icon font, no SVG library.

**Imagery.** None in the product. Avatars are text initials on the
bg-elev surface. If imagery is ever added, it should be warm, grainy, and
photographic — never illustrated.

---

## ICONOGRAPHY

queda deliberately does **not ship an icon set**. The product uses three
sources, and that's it:

1. **Emoji glyphs** as category + status markers (full list under CONTENT
   FUNDAMENTALS). These are rendered by the OS, so they carry the user's
   platform style (iOS Apple Color, Android Noto). That's fine — it keeps the
   app feeling native.
2. **Unicode geometric marks** for the bottom nav:
   `◉` Feed · `＋` Create · `▤` Mine · `○` Profile
   These are single characters set at `20px`, same color rules as text.
3. **The `queda.` wordmark itself** — Syne 800, lowercase, trailing period in
   accent lime. The period is the logo. Don't replace it with a bullet or a
   dot glyph; type the character.

**Copied brand assets** (in `assets/`):
- `icon-192.svg`, `icon-512.svg` — PWA icons (`q.` on #0A0A0A)
- `og.png` — social share card

**No SVG icon library is in use.** If you need a UI icon the emoji/unicode set
doesn't cover (chevron, close, share), **substitute from Lucide via CDN**
(`https://unpkg.com/lucide-static/icons/<name>.svg`) at `1.5–2px` stroke weight
in `--text-dim` color. Flag the substitution so it can be audited — this
project hasn't committed to Lucide yet.

**Never:**
- Draw custom SVG icons by hand.
- Use multi-color icon sets.
- Use filled icons at small sizes — if Lucide is pulled in, use outline only.
- Swap the nav's unicode marks for a polished icon set without approval.
  Their slight roughness is part of the product feel.

---

## Font substitution note

Syne and DM Sans are loaded **from Google Fonts CDN** (`fonts/fonts.css`
@imports Google). No `.ttf` binaries ship in this project. If you need
pure-offline use, download the official families from Google Fonts and drop
them into `fonts/`. **Flag to user:** no local font files are included;
substitution is the Google-hosted originals, not a match.
