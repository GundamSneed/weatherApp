# Future feature — Footer attribution

> Scope: small, self-contained. One agent, one sitting.
> Read `agents.md` at the repo root first for project-wide context (stack, hard
> workflow rules, design tokens) — this doc only covers what's specific to this feature.

## Goal
Add a footer crediting the site's author and Claude, at the bottom of the page content.

## Content
- Text: "Built by **GundamSneed** with **Claude**" (exact wording flexible, keep it short).
- Link the whole thing (or just the name) to the GitHub repo:
  `https://github.com/GundamSneed/weatherApp`, opening in a new tab
  (`target="_blank" rel="noopener noreferrer"`).
- No email/contact link needed.

## Placement
- A semantic `<footer>` element, last child inside `<main id="main">`, so it scrolls
  with the page content rather than pinning to the viewport.
- **Order on the page** (once the radar/news feature below also lands): header → current
  conditions → hourly → 7-day forecast → radar+news row → **footer, last**. If this
  ships before radar/news, it's simply the last thing after the 7-day forecast for now.

## Design
Match the existing flat/boxed dark theme (`css/styles.css` tokens) — don't invent new
colors:
- Small text, `color: var(--text-faint)` or `var(--text-dim)`.
- `border-top: 1px solid var(--border)` to separate it from the forecast content above.
- No `border-radius` (the whole app dropped rounded corners — stay square).
- Keep it visually quiet — this is a credit line, not another card. It probably doesn't
  need `.card`'s box-shadow treatment; a plain top border is likely enough. Use judgment,
  but don't make it louder than the section titles elsewhere.
- Reasonable padding (e.g. `24px` vertical) so it doesn't feel cramped against the last
  section above it.

## Acceptance criteria
- Visible at the bottom of the page after scrolling through the forecast.
- Link opens the GitHub repo in a new tab.
- Doesn't overlap or crowd existing content.
- Follows the no-rounded-corners, dark-panel, blue-accent design language already in
  `css/styles.css`.
