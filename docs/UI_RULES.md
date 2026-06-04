# UI Rules

Future work must preserve the Pet Villa design system unless the user explicitly requests a redesign.

## Brand Colors

CSS variables and Tailwind tokens define the core palette:

- Primary: `#e8927c`
- Primary light: `#f5c4b3`
- Primary background: `#fff8f5`
- Background: `#faf6f2`
- Surface: `#ffffff`
- Text primary: `#3d1f0d`
- Text secondary: `#7a5c45`
- Text muted: `#bfaa9f`
- Accent green: `#7a9e7e`
- Host dark: `#3d1f0d`
- Host sidebar: `#2a1508`

## Typography

- Title font: Playfair Display via `font-title`.
- Body font: Nunito via `font-body`.
- `h1`: `clamp(22px, 5vw, 32px)`.
- `h2`: `clamp(18px, 4vw, 24px)`.
- `h3`: `16px`.
- Body copy: `14px`.
- Muted/small copy: `12px`.
- Price number: `clamp(24px, 5vw, 32px)`, font weight 800.

## Shape and Spacing

- Main cards: 20px rounded corners.
- Brand cards may use 20px-24px radius.
- Buttons use pill radius (`999px` / 50px feel).
- Inputs use 12px radius and 48px height.
- Mobile sections use comfortable 16px horizontal padding.
- Compact mobile grids are preferred over very long vertical lists.

## Shadows

- Small: `0 2px 8px rgba(61,31,13,0.06)`.
- Medium: `0 4px 16px rgba(61,31,13,0.08)`.
- Large: `0 8px 32px rgba(61,31,13,0.14)`.
- Cards use soft shadows and a small hover lift on desktop.

## Components

- `.villa-shell`: main page shell.
- `.paw-bg`: cream background with very light paw pattern.
- `.host-paw-bg`: host panel paw background.
- `.villa-card`: rounded card with border and soft shadow.
- `.villa-button`: primary peach button.
- `.villa-button-dark`: deep brown button.
- `.villa-button-outline`: peach outline button.
- `.villa-input`: standard input.
- `.page-title`, `.section-title`, `.card-title`, `.body-copy`, `.muted-copy`.

## Customer Mobile Rules

- Mobile-first for Home, Booking, Payment, Orders, My Pets, Account, Diary, Chat.
- Avoid one full-width card per item when 2x2, 3x2, or horizontal scroll is more efficient.
- Sticky bottom CTA may be used on Home, but it must not permanently block important content.
- Header logo, Login/Register/Menu, language, and authenticated welcome must remain stable.

## Desktop Rules

- Desktop can use wider layouts and side-by-side cards.
- Desktop should not become the primary design target for customer pages.
- Host Panel desktop can prioritize operational density and tables.

## Host Panel Rules

- Host Panel must optimize staff work:
  - Find customer.
  - View dog.
  - Create booking.
  - Check payment.
  - Reply message.
  - Manage capacity/off day.
- Avoid decorative dashboards that hide day-to-day work.
- Sidebar stays deep brown.
- Cards stay cream/white with Pet Villa borders and coral actions.

## Interaction Rules

- Any button-looking UI must have a real action or clear Coming Soon state.
- Any modal/drawer must have a close/cancel path.
- Any customer-facing text must follow EN/中文 language state.
- Do not leave mojibake characters such as `Â`, `â`, or `�`.
