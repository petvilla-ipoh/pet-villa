# LocalStorage Map

The current web application uses localStorage for many customer and host flows. These keys are not cloud storage.

## Key Families

| Key | Purpose |
| --- | --- |
| `pet-villa-session` | Current logged-in web session. |
| `pet-villa-registered-user` | Single latest registered user fallback. |
| `pet-villa-registered-users` | Local list of registered users for Host CRM/demo auth. |
| `pet-villa-last-full-name` | Last registered full name helper. |
| `pet-villa-lang` | Current language, `en` or `zh`. |
| `pet-villa-notifications:{userId}` | Per-user notification preferences/settings. |
| `pet-villa-profile-avatar:{userId}` | Per-user avatar selection/upload. |
| `pet-villa-pets:{userId}` | Per-user pet profiles fallback mirror during Supabase Pets migration. |
| `pet-villa-pets-supabase-migrated:{userId}` | Marks that local pet profiles have been checked/migrated for the Supabase user. |
| `pet-villa-booking-draft:{userId}` | Current booking draft passed to Payment. |
| `pet-villa-orders:{userId}` | Per-user orders. |
| `pet-villa-vouchers:{userId}` | Per-user voucher wallet. |
| `pet-villa-coupons:{userId}` | Home promotion claimed coupon tracking. |
| `pet-villa-referral-code-map` | Referral code ownership map. |
| `pet-villa-pending-referral:{userId}` | Pending referral relationship for a user. |
| `pet-villa-host-reviews` | Host-created reviews. |
| `pet-villa-hidden-reviews` | Review IDs hidden by host. |
| `pet-villa-chat-threads` | Customer/host chat threads. |
| `pet-villa-host-off-days` | Host blocked/off dates. |
| `pet-villa-happy-guests` | Host-published Happy Guests gallery items. |
| `pet-villa-pet-id` | Browser API helper: latest pet ID. |
| `pet-villa-host-id` | Browser API helper: latest host ID. |
| `pet-villa-booking-id` | Browser API helper: latest booking ID. |

Total documented localStorage key families: 23.

## Browser Event Names

The app also uses browser events for same-tab/cross-component sync:

- `pet-villa-auth`
- `pet-villa-route`
- `pet-villa-customers`
- `pet-villa-pets`
- `pet-villa-orders`
- `pet-villa-vouchers`
- `pet-villa-gallery`
- `pet-villa-reviews`
- `pet-villa-messages`
- `pet-villa-availability`
- `pet-villa-booking-draft`

## Cookie-Based Auth Storage

| Key | Usage |
| --- | --- |
| `sb-pet-villa-auth-token` | Supabase Auth browser session stored in a cookie by the web client. This is not a localStorage key. |

## Reset Risk

If a computer/browser is reset, localStorage data is lost unless it has been exported or migrated to backend/cloud storage. Supabase-configured pet profiles now migrate to Supabase and keep a local fallback mirror; customer accounts, bookings, reviews, messages, gallery uploads, vouchers, and off days still depend on localStorage in the current web implementation.
