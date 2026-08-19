# PET VILLA PRODUCTION BUSINESS GUARDRAILS

## Production System

1. Pet Villa Ipoh is a live Production business system, not a local demo.
2. The Customer Website and Host Panel are parts of the same Production application.
3. Official Production URL: `https://www.petvilla.my/`. The existing `https://the-pet-villa-ipoh-web.vercel.app/` URL remains an active fallback.
4. Supabase is the sole Production source of truth for business data.
5. Continue from the current Production architecture and current working tree. Do not restart or rebuild the project from scratch.
6. Business data correctness, authorization, and customer isolation take priority over UI and UX.
7. Production data that has been saved successfully must survive refresh, logout/login, browser changes, and deployment.

## Current Owner-Accepted Production State

1. Current Owner Accepted Production baseline: `dpl_5JgdXNYwtjbPjq2qAF1qzUnj6t2Z`.
2. Production domain: `https://www.petvilla.my`.
3. Stage B Professional Ding-Dong is Production, Owner Accepted, and Closed.
4. Google Social Login is Production Accepted and Closed. Its Production deployment is `dpl_6aKT1ThbGVa5hcToYvC34Q8F6jxS`.
5. `dpl_6aKT1ThbGVa5hcToYvC34Q8F6jxS` is the historical previous baseline. `dpl_EQcgPyzRwnbr8Wdb3ujTvuGJPN9H` is the earlier pre-Google known-good baseline. Do not confuse historical rollback baselines with current Production.

## Data Reliability

1. Production data must not fall back to `localStorage` as its formal source when it belongs in Supabase.
2. Error is not empty. Query or API failures must never be silently converted into `[]`, `0`, `RM0`, `No Data`, `No Orders`, `No Pets`, or `No Customers`.
3. A Supabase write failure must never produce a success message or local-only Production success.
4. Preserve last-known valid data during transient refresh failures and show a truthful refresh/error state.
5. Historical customers, pets, bookings, orders, payments, revenue, staff access, and audit records must not disappear after deployments or UI changes.
6. Never manufacture financial history or reconstruct unknown historical payment timestamps as facts.
7. Paid historical business records must not be casually deleted to clean up reports.

## Owner Communication

1. Owner-facing communication must default to Chinese / 华语. Technical identifiers, function names, paths, and code may remain in English.
2. The Owner is the business owner, not a software engineer. Use direct explanations and provide complete copy-paste Codex instructions when needed.

## Continuous Codex Environment

1. The following Codex/OpenAI accounts all work on the same Pet Villa project and working tree:
   - `canyonfsp@gmail.com`
   - `kahyee199@gmail.com`
   - `vannybayley@gmail.com`
   - `dreamteesconcept@gmail.com`
2. Switching Codex accounts, models, or chats/threads does not mean a new project, repository, working tree, or Production environment.
3. The real Production repository is `C:\Users\JJ\Documents\Codex\2026-05-27\uiun-promax-gstack-superpowers`. Always continue from this repository, its current working tree, and its root `AGENTS.md`.
4. If a new Codex chat is attached to another folder or workspace and cannot see `.git`, Git `HEAD`, root `AGENTS.md`, and `apps/web`, stop. Do not initialize, clone, restart, or reinitialize a replacement project.
5. Unless the Owner explicitly requests it, never reset, clean, discard, overwrite, reclone, or delete current working-tree changes.
6. Never rerun a Production migration that has already been executed.
7. External authentication sessions may differ between Codex accounts. If Supabase or another official connector is required, restore that official authenticated connection and continue; do not restart project setup.
8. Continuity checkpoint: Production deployment `dpl_CmiNgXbywQ4wFoWsMQDiUUiHK56g` is the accepted Canyon Host refresh-loop fix. Canyon Host Email + Password login has been owner-verified stable.
9. Google Social Login Stages 1-4 were Owner Accepted and Closed through isolated Preview validation, including new-customer phone completion, linked Email + Password identity, session persistence, customer isolation, and dual-role Primary Owner checks. Google customer authentication never grants Host access by itself; Canyon Host access remains formally authorized through `host_staff_members` and `authorizeHost`.
10. The authoritative-pricing flash fix is Owner-live Accepted and Closed: Customer Home and Booking use authoritative RM40 boarding and RM5 daycare pricing without an RM35 fallback. Google Branding is verified and closed for `The Pet Villa`, `https://www.petvilla.my/`, `/privacy`, and `/terms`.

## Production Data Safety

1. Protect all existing Production customers, pets, bookings, payments, revenue, staff access, and historical records.
2. Keep these business events permanently distinct:
   - Cancel is not Refund.
   - Refund is not Void.
   - Void is not Delete.
3. Payment Submitted is not Payment Verified.
4. Customer Auth is not Host authorization.
5. A Host-created Customer is not a Customer Auth account.
6. Do not modify historical order identity or amounts merely to make reports look cleaner.
7. Production database, migration, schema, function, trigger, bucket, and RLS changes must only be made when genuinely required to complete the Owner's requested Production business outcome.
8. Codex may perform the necessary safe Production change as part of completing the requested task. Protect existing Production data, historical records, working functions, and customer isolation.
9. Never rerun an already executed migration.
10. Never perform destructive or irreversible data operations unless they are actually required by the Owner's stated business outcome.

## Host Authorization

1. Customer accounts must never receive Host access automatically.
2. Host access is limited to the Primary Owner and formally authorized active staff.
3. Host authorization must use the existing `host_staff_members` and `authorizeHost` architecture.
4. Do not restore legacy `profiles.role` as the formal Host gate.
5. UI visibility is not authorization. Every protected Host server API must validate the authenticated user and required permission.
6. Permission and authentication failures must fail closed and must not expose sensitive Production data.

## Host-Created Customers

1. Host can create a real, persistent customer without creating a login account.
2. Required fields:
   - Name
   - Phone
3. Optional field:
   - Email
4. A Host-created Customer without Email must still support persistent customer management and booking across refresh, logout/login, browser changes, and deployment.
5. Do not create fake Email addresses.
6. Do not automatically create a Supabase Auth user merely to save a Host-created Customer.
7. Host-created Customer records and Customer Auth accounts must remain separate identities in the data model and UI.

## Phone Business Semantics

1. Phone is contact information only.
2. Phone is not Customer Auth identity.
3. Phone is not OTP identity.
4. Phone is not Host Authorization.
5. Phone is not unique Customer ownership proof.
6. Two Customers may legitimately have the same contact phone.
7. A matching or similar phone must never automatically:
   - Merge Customers.
   - Claim a Host-created Customer.
   - Link Auth identities.
   - Grant Customer ownership.
   - Grant Host access.
8. Host-created Customer is not Customer Auth.
9. Normal Google login must not auto-claim Customer records by phone similarity, name similarity, or CRM profile similarity.
10. Any future WhatsApp implementation may use the consent-bound normalized phone as a delivery address only.
11. WhatsApp phone delivery must not redefine Customer identity or authorization.

## Booking Rules

1. Customer Booking and Host Create Booking must use the same business semantics.
2. Boarding uses a date range: Check-in Date to Check-out Date.
3. Daycare uses one date plus Start Time and End Time.
4. Do not create separate, inconsistent Boarding or Daycare rules for Customer and Host flows.
5. A submitted booking must receive a stable formal order identity.
6. Submitted Booking is not Draft Booking.
7. Pending Payment Verification does not mean the booking remains a draft.
8. Preserve existing and historical order IDs when changing lifecycle rules.
9. The Owner-approved end-to-end flow is: Customer completes Booking details -> Continue to Payment -> QR/payment page -> Deposit or Full Payment -> Customer `I Have Paid` -> successful server Payment Submission -> `pending_verification` -> Host Approve/Verify -> Booking Confirmed -> Outstanding Balance if any -> Check In -> remaining balance submission and Host Verify if required -> Balance RM0 -> Host Check Out -> Completed.
10. The first valid Host payment approval, whether Deposit or Full Payment, confirms the Booking. A verified Deposit is sufficient even when `balance_rm > 0`; Balance RM0 is not required for Booking confirmation.
11. A confirmed Deposit Booking with an outstanding balance may Check In.
12. Check Out is blocked while `balance_rm > 0`. Do not introduce checkout with outstanding balance, `checked_out_pending_balance`, or late payment after checkout unless the Owner explicitly changes this rule.
13. Paid Full is not Completed. Completion requires both Balance RM0 and an explicit Host Check Out.
14. A later balance payment is another payment submission for the same Booking, not a new Booking, and must preserve the original Booking identity. The Customer may use `I Have Paid` again, and the later submission must again be Host Verified before verified paid or balance values change.

## Payment Rules

1. Receipt upload is not required. Customer `I Have Paid` means Customer Submitted Payment only; it does not mean Verified Payment, Paid, or Booking Confirmed.
2. A successful Customer Payment Submission becomes `pending_verification`. It must not by itself change `paid_rm`, `balance_rm`, Payment Status, or any other verified financial state.
3. Only an explicit Host Verify Payment action may turn a submitted payment into verified paid value.
4. Host verification must persist the correct `paid_rm`, `balance_rm`, and Payment Status in Production Supabase.
5. The first valid Host approval confirms the Booking. Later ordinary balance-payment verification updates the same Booking's verified money and must not emit a second Booking Confirmed semantic.
6. Payment, order, and accounting API failures must not display fake success.
7. Financial totals must be derived from real Production records and use the approved centralized accounting rules.

## Payment Rejection

1. Authoritative Host Payment Rejection is not yet implemented.
2. Future rejection semantics must keep Reject distinct from Cancel, Refund, Void, and Delete.
3. Rejection must not fabricate, remove, or rewrite verified financial history. Do not mark rejection as implemented until the authoritative flow exists.

## Current Notification State

1. Professional New Booking Ding-Dong is Production, Owner Accepted, and Closed.
2. The future notification initiative is not implemented and remains in design. It includes durable payment submission identity/history, authoritative Payment Reject, notification idempotency/outbox, WhatsApp Business automation, and Owner phone Push/PWA. Do not mark any of these as live.
3. Operational WhatsApp consent is Owner Approved and required for online Booking.
4. Owner-approved future automatic Customer WhatsApp semantic categories are:
   - First accepted `I Have Paid`: submission received and waiting for verification.
   - First Host payment approval: payment verified and Booking confirmed; show outstanding balance if one remains, otherwise show Fully Paid.
   - Payment submission rejected: state-aware rejection that does not automatically cancel, refund, void, or delete the Booking.
   - Authoritative Order Completed: completion notification.
5. No additional automatic Customer WhatsApp is currently approved for later ordinary balance-payment verification.
6. WhatsApp failure must never change the Order, Payment, Booking, verified money, or Completion state.
7. WhatsApp/Meta integration and Owner Push are not yet implemented.

## Current Stage C0 Findings

1. Production read-only evidence confirmed that Customer `I Have Paid` becomes `pending_verification` without changing `paid_rm` or `balance_rm`, while Host Verify changes verified money.
2. The first successful Host Verify can distinguish first Booking confirmation using transaction before-state `paid_rm = 0` plus a successful increase.
3. No new Booking lifecycle confirmation field is currently required; the current Booking lifecycle can remain unchanged.
4. Durable payment submission identity is currently insufficient for future rejection and notification idempotency, and authoritative Payment Reject is currently missing.

## Known Technical Issue

1. Customer cancellation currently has a status-handling inconsistency for deposit-verified Orders whose `orders.status = balance`.
2. Treat this only as a technical issue. Do not invent or modify cancellation or refund policy without explicit Owner approval.

## Development Scope

1. The Owner provides the business requirement and desired outcome. Codex should determine the correct implementation using the existing Production architecture.
2. Do not add features the Owner did not request.
3. Do not modify unrelated UI or redesign unrelated pages under the label of optimization.
4. Do not create process for its own sake or repeat broad audits of already verified modules without a concrete reason.
5. For ordinary UI/UX bugs, follow: implement, targeted test, deploy when the request concerns the live Production system, Owner verification.
6. For changes involving Production database, orders, payments/revenue, permissions, or customer isolation, use the smallest safe implementation that protects existing business data.
7. Changes to Host, Orders, Payments, Booking, or permissions require their related targeted regression tests.
8. For a request explicitly about fixing or updating the live Production system, Codex may complete the necessary Production deployment after validation. If the Owner explicitly says not to deploy, do not deploy.
9. Do not repeatedly stop merely because a correct implementation requires a database change, migration, or deployment.

## Protect Owner-Accepted Existing Features

1. Before modifying any existing Pet Villa feature or UI that is Production live, Owner Accepted, Closed, or known-good, Codex must first inspect:
   - The current implementation.
   - Relevant scoped `AGENTS.md` instructions.
   - Relevant targeted tests.
   - Relevant validation scripts.
2. Preserve accepted behavior outside the Owner-requested scope.
3. A new Codex chat not knowing historical conversation is not permission to:
   - Redesign an accepted feature.
   - Reopen closed architecture.
   - Refactor unrelated runtime.
   - Replace working business logic.
   - Broaden scope.
4. Protected examples include, but are not limited to:
   - Google Social Login.
   - Auth and session behavior.
   - Customer isolation.
   - Host authorization.
   - Pricing.
   - Ding-Dong.
   - Booking and payment lifecycle.
   - Legal, brand, and mobile accepted UI.
5. Reopen a Closed area only when the Owner explicitly requests a change or concrete regression evidence requires it.

## Pet Villa Visual Design Continuity

1. The current Pet Villa Production UI is an Owner-accepted premium and high-quality design system.
2. Any future new page, new feature, new modal, new settings section, new Host workflow, new Customer workflow, or responsive/mobile UI change must visually and behaviorally integrate with the current Pet Villa Production UI.
3. Before designing or implementing UI, Codex must:
   - Inspect the current relevant Production page or component first.
   - Inspect existing reusable components and styles before creating new ones.
   - Inspect relevant scoped `AGENTS.md` instructions.
   - Check the design, product, and component skills currently available in that Codex session.
   - Read the relevant available skill instructions before substantial UI work.
   - Use the current Pet Villa implementation as the final visual source of truth.
4. Preserve consistency in:
   - Typography.
   - Spacing.
   - Visual hierarchy.
   - Cards and surfaces.
   - Border radius.
   - Controls and buttons.
   - Forms.
   - Icons.
   - Responsive behavior.
   - Mobile layout.
   - Interaction states.
   - Loading, error, and empty states.
   - Accessibility.
5. Do not:
   - Introduce a visually unrelated design language.
   - Redesign accepted pages without an Owner request.
   - Install random UI or design dependencies merely for styling.
   - Replace working components unnecessarily.
   - Broaden a functional request into an unrelated redesign.
6. Owner-accepted and Closed UI must be protected.
7. A new Codex chat or a different available skill set is not permission to redesign Pet Villa from scratch.
8. Skill availability may vary by Codex account, session, or model. Do not assume that a specific skill is permanently available.
9. At the start of substantial UI work, Codex must inspect the currently available skills, use the strongest relevant available design skills, and report which skills were actually used.
10. Never falsely claim that an unavailable skill was used.
11. For simple UI/UX changes that do not affect the database, money, permissions, or Production data, follow: implement -> targeted visual and functional test -> deploy -> Owner verifies.

## Source Control And Secrets

1. The current working tree is an active, valid source of ongoing Pet Villa development.
2. Code already running in Production must not remain indefinitely only as unrecorded local changes; keep the existing GitHub main branch reasonably synchronized through an intentional, reviewed source-control step.
3. Source-control synchronization must never discard current work, overwrite deployed Production code, or lose valid uncommitted changes.
4. Never commit or expose passwords, access tokens, Supabase service-role keys, API secrets, `.env` secrets, or customer credentials.
5. Do not stage, commit, push, or create a pull request unless the current task or Owner explicitly authorizes it.

## Standard Working Method

For each Owner request:

1. Understand the requested business outcome.
2. Read the current root `AGENTS.md` and only the relevant existing code.
3. Continue from the current working tree.
4. Find the cause within the live Production architecture.
5. Implement the complete, narrowly scoped solution.
6. Protect real Production data and customer isolation.
7. Run the necessary targeted validation.
8. Complete the necessary Production update after validation when the request concerns the live system, unless the Owner explicitly says not to deploy.

Pet Villa's standing development model is: Owner gives the business requirement, then Codex completes it safely within the existing Production system.
