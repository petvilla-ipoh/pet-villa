# Feature List

This file lists the v1.0 features discovered in the current project.

## Home

- Mobile-first Pet Villa homepage.
- Bilingual EN / 中文 support.
- Hero section with logo, Login/Register, menu, service highlights, dog image, and CTAs.
- Overnight boarding and daycare pricing cards.
- Today Availability section.
- Promotions and voucher entry points.
- Referral Program card with generated referral code and copy feedback.
- Why Choose Pet Villa feature grid.
- Pet Owner Reviews carousel/swipe pattern.
- Happy Guests gallery preview.
- Boarding Requirements grid.
- Footer with contact, hours, and social links.
- Sticky mobile CTA buttons for WhatsApp and booking.

## Auth

- Login page.
- Register page.
- Supabase Auth browser client for login and registration.
- Supabase cookie-backed session storage with legacy localStorage fallback during migration.
- Profiles table migration for Supabase Auth users.
- Full name, phone, email, password, confirm password, and optional referral code fields.
- Phone OTP-style registration flow in UI.
- Demo OTP remains temporarily marked for real OTP replacement.
- Forgot/reset password flow with phone/email method support in UI.
- Password visibility toggles.
- Terms of Service and Privacy Policy modal/content entry points.
- Local session fallback remains for existing web flows until Booking/Payment data migration is complete.

## Customer Account

- My Account page.
- Profile card and avatar selection/upload pattern.
- Profile Information section.
- Security / Change Password form.
- Verification status for phone and email.
- Notification settings UI.
- Language settings.
- Contact actions.
- Logout.

## Pets

- My Pets page.
- Empty state when no pets exist.
- Add New Pet.
- Edit Pet.
- Delete Pet.
- Save Pet Profile.
- Pet photo upload to Supabase Storage when Supabase is configured, with local data URL fallback retained.
- Basic details accordion.
- Food & Care accordion.
- Photo Upload accordion.
- Pet fields include name, breed, age, weight, gender, coat color, vaccination, neutered, friendliness/calm tags, food, allergies, medication, notes, and photos.
- Pet data is scoped by current Supabase Auth user with RLS when Supabase is configured.
- Existing `pet-villa-pets:{userId}` records are migrated on first authenticated Supabase pet load and remain mirrored as fallback.

## Booking

- Booking page.
- Overnight Boarding and Daycare service selection.
- Daycare time selection.
- Date range calendar.
- Calendar month navigation.
- Past date disabling.
- Host off day blocking.
- Capacity logic by dog count.
- Multi-pet selection.
- Special request textarea.
- Booking summary.
- Deposit and balance calculation.
- Voucher application.
- Progress bar status sync.
- Continue to Payment flow.
- Booking draft save/load uses Supabase when configured, with `pet-villa-booking-draft:{userId}` fallback retained.

## Payment

- Payment page.
- Booking summary display.
- Deposit 50% or full 100% amount selection.
- Voucher-discounted payable amount display.
- Payment method selection.
- DuitNow QR UI placeholder.
- FPX, Touch 'n Go eWallet, GrabPay, Visa/Mastercard payment method cards.
- Stripe Checkout redirect for deposit and full payment in test mode.
- Order creation/update after payment writes to Supabase when configured, with localStorage fallback retained.

## Orders

- My Orders page.
- Filters for All, Active, Balance Due, Completed, Cancelled.
- Compact order cards.
- Payment overview: paid amount, balance, total.
- Pay Balance / Pay Early entry points.
- Expandable order details.
- Diary/photo availability indicator.
- Leave Review panel for completed orders.
- Review save/cancel behavior.
- Time status calculations.
- Order list, detail, payment status, cancellation status, and review updates use Supabase when configured.
- Orders remain mirrored to `pet-villa-orders:{userId}` as fallback during migration.
- Pay Balance redirects to Stripe Checkout and updates order payment status through webhook.

## Diary

- Pet Diary page.
- Booking-related diary layout.
- Morning/Afternoon/Evening activity cards.
- Date selector.
- Today Summary.
- WhatsApp/message host fallback pattern.
- Empty state support.

## Chat / Messages

- Customer chat page.
- Host/customer message thread storage.
- Host Panel message inbox.
- Thread list, conversation area, and customer card concept.
- Messages currently use localStorage event sync.

## Gallery

- Public Gallery page.
- Happy Guests preview on Home.
- Gallery modal / view-all flow.
- Host upload form.
- Publish / hide / delete gallery states.
- Only published items should appear on Home.
- Gallery photos use Supabase `gallery_photos` and `gallery-photos` Storage when configured, with localStorage fallback retained.
- Gallery photo fields include pet name, breed, caption, image URL, visibility on Home, and featured state.
- Default seed photos continue to use `/hero-dogs.png`.

## Reviews

- Customer review flow from completed orders.
- Reviews displayed on Home.
- Review carousel/swipe indicator.
- Host Panel review management.
- Host can add manual reviews.
- Host can show/hide/delete reviews.
- Home only shows live reviews and does not reveal source.
- Customer and host reviews use Supabase when configured, with localStorage fallback retained.
- Reviews store star rating, text, source, visibility, and related `order_id`.

## Vouchers / Promotions

- My Vouchers page.
- Available / Used / Expired tabs.
- New Guest voucher.
- Multi-dog voucher.
- Referral voucher flow.
- Voucher wallet reads and writes use Supabase when configured, with localStorage fallback retained.
- Homepage promotion claim uses Supabase RPC with server-side duplicate prevention when configured.
- Voucher application in Booking validates against Supabase before Payment when configured.
- Used voucher status with order references is written to Supabase when configured.
- Cancelled eligible bookings can return voucher availability in Supabase and local fallback.

## Referral

- Referral code generation based on user data.
- Referral code copy action and feedback.
- Optional referral code field in registration.
- Referral code persistence uses Supabase when configured, with local referral map fallback retained.
- Pending referral save uses Supabase when configured, with localStorage fallback retained.
- Referral reward logic issues RM10 vouchers to referrer and friend after qualifying completion.
- Supabase referral RPC prevents duplicate pending referrals and duplicate promotion voucher claims.

## Capacity

- Maximum 3 dogs per day.
- Capacity counts dogs, not orders.
- Off Day support from Host Panel.
- Full and off days should block customer booking.
- Cancelled/refunded/failed/expired bookings should not consume capacity.

## Host / Admin Panel

- Host dashboard.
- Today check-in / check-out.
- Active bookings.
- Pending payment.
- Month revenue.
- Unread messages.
- Today capacity.
- Quick actions.
- Customers CRM.
- Dogs profile area.
- Booking Center.
- Calendar Capacity.
- Messages Inbox.
- Payments overview.
- Reviews management.
- Gallery management.
- Promotions area.
- Reports/settings entry points.
- Host/admin users can read all Supabase orders through role-based RLS.

## Backend/API

- Express API scaffold.
- Next.js Stripe Checkout and webhook API routes for the web app.
- PostgreSQL repository.
- Users, pets, hosts, bookings, reviews, messages, notifications, payments routes/services.
- Stripe payment intent and webhook service.
- Firebase FCM service.
- API docs exist in `docs/API.md`.
