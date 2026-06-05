# Changelog

## v1.1 - Supabase Auth Round 1

- Installed `@supabase/supabase-js` for the web app.
- Added a browser Supabase Auth client with cookie-backed session storage.
- Connected customer login to Supabase `signInWithPassword` with localStorage fallback retained for existing flows.
- Connected customer registration completion to Supabase `signUp` after the current demo OTP step.
- Added a `profiles` table migration linked to `auth.users` with RLS policies.
- Updated logout to call Supabase `signOut` before clearing the legacy fallback session.
- Kept Google and Apple login buttons visible as Coming Soon.
- Marked the current `123456` OTP as demo-only with a TODO for real OTP.

## v1.0 - Stable Release

### Core Product

- Built The Pet Villa Ipoh web experience with customer pages and host panel.
- Established Pet Villa brand design system.
- Added bilingual EN/中文 interface support.
- Added mobile-first customer navigation and authenticated menu behavior.

### Home

- Added premium Pet Villa homepage.
- Added Hero CTA for booking and WhatsApp.
- Added pricing cards for overnight boarding and daycare.
- Added Today Availability.
- Added Promotions and Referral Program entry.
- Added Why Choose Pet Villa.
- Added Pet Owner Reviews with carousel/swipe behavior.
- Added Happy Guests gallery preview and modal/page flow.
- Added Boarding Requirements.
- Added compact footer and social/contact links.
- Added mobile sticky CTA.

### Auth / Account

- Added Login and Register pages.
- Added OTP-style registration and reset password flows in UI.
- Added phone/email reset method support.
- Added profile/account page.
- Added avatar selection/upload concept.
- Added verification status and notification settings UI.
- Added change password UI/function in local flow.

### Pets

- Added My Pets page.
- Added Add/Edit Pet Profile flow.
- Added pet photo upload.
- Added pet profile accordion sections.
- Added per-user pet storage in web flow.

### Booking

- Added booking service selection for overnight/daycare.
- Added date/time selection.
- Added multi-pet selection.
- Added booking summary.
- Added progress bar sync.
- Added voucher application.
- Added capacity and off-day checks in frontend.

### Payment

- Added Payment page.
- Added deposit/full payment selection.
- Added payment methods.
- Added DuitNow QR-style payment UI.
- Added payment details and demo confirmation.
- Added order creation/update from payment flow.

### Orders

- Added My Orders page.
- Added filters and compact cards.
- Added payment balance actions.
- Added review creation flow.
- Added status/time calculations.

### Diary / Chat

- Added Pet Diary page.
- Added diary/activity feed UI.
- Added customer chat page.
- Added local chat thread system and host inbox integration.

### Vouchers / Referral

- Added My Vouchers page.
- Added available/used/expired tabs.
- Added promotion claiming flow.
- Added referral code generation and copy feedback.
- Added voucher application to booking/payment totals.

### Host Panel

- Added Host Panel dashboard.
- Added Customers CRM.
- Added Dogs profile area.
- Added Booking Center.
- Added Calendar Capacity and Off Day management.
- Added Messages Inbox.
- Added Payment overview.
- Added Reviews management.
- Added Gallery management.
- Added Promotions/Reports/Settings entry points.

### Backend / Infrastructure

- Added Express API.
- Added PostgreSQL migration schema.
- Added repository layer.
- Added Stripe service.
- Added Firebase FCM service.
- Added Vercel config.
- Added Render config.
- Added deployment/setup docs.
