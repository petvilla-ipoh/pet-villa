# Design QA - Pet Villa Desktop Home Dashboard Alignment

final result: passed

## Source Visual Truth

- Accepted mobile Home baseline: high-end pastel 3D dashboard, warm/lilac depth, raised tiles, clear CTA, dashboard banner with girl, poodle, and French bulldog.
- Old production desktop screenshot: `C:\Users\JJ\Documents\Codex\2026-05-27\uiun-promax-gstack-superpowers\output\playwright\home-desktop-current.png`
- New local desktop screenshot: `C:\Users\JJ\Documents\Codex\2026-05-27\uiun-promax-gstack-superpowers\output\playwright\home-desktop-upgraded-local-v2.png`
- Mobile regression screenshot: `C:\Users\JJ\Documents\Codex\2026-05-27\uiun-promax-gstack-superpowers\output\playwright\home-mobile-after-desktop-fix.png`

## Implementation Evidence

- Home customer page: `apps/web/app/page.tsx`
- Shared Home/dashboard styles: `apps/web/app/styles.css`

## Checks

- Desktop Home no longer uses the old pale split hero as the visible first desktop section.
- Desktop Home now uses the same app-badge header, search bar, raised service shortcuts, 3D banner artwork, stats cards, and Services row language as mobile Home.
- Desktop no longer duplicates Login/Register inside the dashboard card because AppNav already owns auth actions.
- Banner image fills the desktop card height without the previous white blank area.
- Typecheck and production build passed.

# Design QA - Pet Villa Orders Discoverability And Account Shortcuts

final result: passed

## Source Visual Truth

- Accepted Home visual baseline: high-end pastel 3D dashboard style with raised tiles, strong clickable affordance, warmer color depth, and clear mobile-first customer flow.
- Current local mobile screenshots:
- `C:\Users\JJ\Documents\Codex\2026-05-27\uiun-promax-gstack-superpowers\test-results\mobile-home-orders.png`
- `C:\Users\JJ\Documents\Codex\2026-05-27\uiun-promax-gstack-superpowers\test-results\mobile-pets-orders.png`
- `C:\Users\JJ\Documents\Codex\2026-05-27\uiun-promax-gstack-superpowers\test-results\mobile-account-contact.png`

## Implementation Evidence

- Home customer page: `apps/web/app/page.tsx`
- Pets page: `apps/web/app/pets/page.tsx`
- Account page: `apps/web/app/account/page.tsx`
- Shared mobile navigation styles: `apps/web/app/styles.css`
- Shared logo component: `apps/web/app/components/BrandMark.tsx`

## Checks

- Home logged-in top actions now show Vouchers, Orders, and the selected human profile avatar.
- Home bottom dock now includes Orders before Voucher and Me.
- Mobile OwnerSidebar keeps Orders visible across customer pages and hides Payment, Diary, and Chat to avoid clutter.
- Pets page third stat is now `Orders`, counts non-cancelled orders, and links to `/orders`.
- Account profile card now has My Pets, My Order, and Contact Us quick actions.
- My Pets quick panel shows saved pets with dog avatar, name, breed, and Edit action.
- Contact Us quick panel shows Xiaohongshu, Instagram, Facebook, and WhatsApp with brand-colored logo chips.
- Typecheck and production build passed after the change.

# Design QA - Pet Villa Pets UI Polish

final result: passed

## Source Visual Truth

- Accepted Home visual baseline: high-end pastel 3D dashboard style with strong banner artwork, raised tiles, clear active navigation, and warm/lilac materials.
- Current Booking visual baseline: `C:\Users\JJ\Documents\Codex\2026-05-27\uiun-promax-gstack-superpowers\output\playwright\petvilla-booking-after-pets-wording-3011.png`
- Current Pets empty-state preview: `C:\Users\JJ\Documents\Codex\2026-05-27\uiun-promax-gstack-superpowers\output\playwright\petvilla-pets-empty-final-3011.png`
- Current Pets list preview: `C:\Users\JJ\Documents\Codex\2026-05-27\uiun-promax-gstack-superpowers\output\playwright\petvilla-pets-list-final-3011.png`
- Current Add Pet form preview: `C:\Users\JJ\Documents\Codex\2026-05-27\uiun-promax-gstack-superpowers\output\playwright\petvilla-pets-form-v2-signed-in-3011.png`

## Implementation Evidence

- Pets page: `apps/web/app/pets/page.tsx`
- Shared page styles: `apps/web/app/styles.css`
- Pets hero asset: `apps/web/public/petvilla-pets-playground-banner.png`
- Owner navigation: `apps/web/app/components/OwnerSidebar.tsx`
- Home customer page: `apps/web/app/page.tsx`
- Booking page wording: `apps/web/app/booking/page.tsx`

## Checks

- Mobile preview URL checked locally: `http://127.0.0.1:3011/pets`
- Phone LAN preview URL: `http://192.168.0.15:3011/pets`
- Pets list page loads signed-in and shows `Pet Profiles`, `My Pets`, `Add Pet`, `Tap here first`, `Pets`, `Vaccinated`, and `Ready`.
- Add Pet form loads signed-in and shows `Add Pet Profile`, `New Pet`, and `Save Pet Profile`.
- Visible text check found no `Dog` or `Dogs` wording in the Pets list or Add Pet form.
- Pets hero artwork is now a dedicated green playground scene for adding/managing pets, not a faint badge watermark.
- Empty state includes `Start by tapping the button below.` and a raised `Add New Pet` CTA.
- Existing-pet state includes a raised `Tap to add` CTA in the Add New Pet card.
- Stats icons use custom 3D-style paw, vaccine shield, and ready calendar icons instead of plain text symbols.
- Cards and buttons use stronger pastel depth, 3D shadows, and Home-compatible dashboard weight.
- Booking page wording still fits after `Dogs` to `Pets` changes.

## Remaining P3 Polish

- Later pages still need their own page-by-page polish pass to match Home and Booking.
- Internal code identifiers such as `DogAvatar` remain unchanged because they are not visible to customers.

# Design QA - Pet Villa Payment UI Polish

final result: passed

## Source Visual Truth

- Accepted Home/Booking/Pets baseline: high-end pastel 3D dashboard style, clear CTA affordance, not too pale, page-specific hierarchy.
- Current Payment preview, no-deposit state: `C:\Users\JJ\Documents\Codex\2026-05-27\uiun-promax-gstack-superpowers\output\playwright\petvilla-payment-ui-3012.png`
- Current Payment preview, RM50 deposit state: `C:\Users\JJ\Documents\Codex\2026-05-27\uiun-promax-gstack-superpowers\output\playwright\petvilla-payment-deposit-ui-3012.png`

## Implementation Evidence

- Payment page: `apps/web/app/payment/page.tsx`
- Payment method component: `apps/web/app/components/PaymentLogo.tsx`
- Shared page styles: `apps/web/app/styles.css`
- Draft source key: `pet-villa-booking-draft:{userId}`

## Checks

- Mobile preview URL checked locally: `http://127.0.0.1:3012/payment`
- Phone LAN preview URL: `http://192.168.0.15:3012/payment`
- Payment page uses the same top navigation material as Booking/Pets.
- Payment hero shows `Review & Pay`, secure checkout label, and the current `Pay Today` amount.
- RM35 no-deposit state shows full payment and RM0 balance.
- RM70 deposit state shows `Pay RM50 Deposit`, `Today: RM50`, `Later: RM20`, and `Balance Later RM20`.
- Payment method card and DuitNow QR stage have stronger 3D depth and do not rely on pale flat cards.
- CTA remains visible in Payment Details as a raised gradient action.

# Design QA - Pet Villa Payment Thank You Banner Balance

final result: passed

## Source Visual Truth

- User reference image: `C:\Users\JJ\AppData\Local\Temp\codex-clipboard-e933d141-a77c-45d2-9328-a6b6eae24747.png`
- Source pixels: 535 x 438.
- Desired state: Payment checkout banner with two dogs in a warm home, integrated lower overlay, dogs fully visible, poodle toy positioned just above the secure checkout white block with a small amount of space.

## Implementation Evidence

- Implementation screenshot: `C:\Users\JJ\Documents\Codex\2026-05-27\uiun-promax-gstack-superpowers\output\playwright\petvilla-payment-banner-true-zoom-3013-b.png`
- Implementation pixels: 390 x 1698 full-page screenshot.
- Viewport: 390 x 844 mobile.
- Route/state: signed-in owner at `/payment`, DuitNow deposit state.
- Edited file: `C:\Users\JJ\Documents\Codex\2026-05-27\uiun-promax-gstack-superpowers\apps\web\app\styles.css`
- Banner asset: `C:\Users\JJ\Documents\Codex\2026-05-27\uiun-promax-gstack-superpowers\apps\web\public\petvilla-payment-thankyou-banner.png`

## Checks

- Full-view comparison used the user reference image and the rendered mobile Payment screenshot.
- Focused region: Payment thank-you banner only, because the requested change is limited to dog placement and overlay fusion.
- Typography: banner labels and headline still use the current Pet Villa high-end serif/rounded UI hierarchy.
- Spacing/layout: dog faces, poodle toy, and the French bulldog body remain visible; the banner art is enlarged enough for the dogs to carry stronger visual focus while keeping space before the overlay cards.
- Colors/tokens: the lower area reads as a warm carpet-like peach/lavender stage for the payment overlay rather than a cropped image edge.
- Image quality: existing generated banner is preserved; CSS crop/position was refined instead of replacing the liked asset.
- Copy/content: secure checkout and pay-today text remain unchanged.

## Comparison History

- Earlier issue: dog/toy placement and lower overlay fusion drifted from the liked reference.
- Fix made: changed `.payment-thankyou-art` from cover/crop to proportional oversized contain display, added `max-width: none` so the intended zoom works, and kept image/overlay fade treatment for the carpet area.
- Post-fix evidence: `output\playwright\petvilla-payment-banner-true-zoom-3013-b.png`

## Remaining P3 Polish

- Live animation can only be judged by opening the preview; current CSS uses lightweight glow/spark animation instead of moving the full image.

# Design QA - Pet Villa Orders Simple UI Polish

final result: passed

## Source Visual Truth

- Accepted Home/Pets/Booking/Payment baseline: high-end pastel 3D dashboard style, page-specific banner art, strong card depth, clear clickable actions, and mobile-first density.
- Final direction: compact order center without a large banner or summary stat blocks, focused on searching, filtering, and reading current/past orders clearly.

## Implementation Evidence

- Empty orders screenshot: `C:\Users\JJ\Documents\Codex\2026-05-27\uiun-promax-gstack-superpowers\output\playwright\petvilla-orders-simple-empty-final-3013.png`
- Order list screenshot: `C:\Users\JJ\Documents\Codex\2026-05-27\uiun-promax-gstack-superpowers\output\playwright\petvilla-orders-simple-list-final-3013.png`
- Viewport: 390 x 844 mobile.
- Route/state: signed-in owner at `/orders`, empty state and one confirmed order state.
- Edited file: `C:\Users\JJ\Documents\Codex\2026-05-27\uiun-promax-gstack-superpowers\apps\web\app\orders\page.tsx`
- Shared styles: `C:\Users\JJ\Documents\Codex\2026-05-27\uiun-promax-gstack-superpowers\apps\web\app\styles.css`

## Checks

- Fonts and typography: Orders uses the same bold serif title hierarchy and rounded heavy UI text as the approved Home/Pets/Payment pages, but with a calmer order-list density.
- Spacing/layout: mobile first screen now shows brand/nav, compact order header, search, full filter rail, and first order card; the previous large banner and Active/Balance/Completed stat cards were removed to keep the page clear.
- Colors/tokens: warm peach, lavender, mint, and gold materials match the current Pet Villa visual system without becoming too pale.
- Image quality: no large decorative image is used in the final Orders layout because the page goal is quick order lookup rather than storytelling.
- Copy/content: empty state clearly directs booking; order state shows total, paid, balance, status, pay balance, cancel, view details, and search/filter affordances. Amount tiles use clearer status color semantics: total as information, paid as success, and unpaid balance as warning.
- Navigation: mobile owner nav includes Orders as the active item on `/orders`.

## Comparison History

- Earlier issue: Orders page first upgrade was visually polished but too busy for an order history task because the banner and stats consumed too much space.
- Fix made: removed the large banner and stat blocks, rebuilt the top as a compact search/filter order center, preserved raised 3D cards and clear CTA affordance, and kept mobile owner nav active on Orders.
- Post-fix evidence: `output\playwright\petvilla-orders-simple-list-final-3013.png`

## Remaining P3 Polish

- Expanded details interaction should be visually reviewed in a follow-up pass if the user wants micro-polish on every opened state.
