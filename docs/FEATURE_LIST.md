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
- Full name, phone, email, password, confirm password, and optional referral code fields.
- Phone OTP-style registration flow in UI.
- Forgot/reset password flow with phone/email method support in UI.
- Password visibility toggles.
- Terms of Service and Privacy Policy modal/content entry points.
- Local session storage for current web flow.

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
- Save Pet Profile.
- Pet photo upload.
- Basic details accordion.
- Food & Care accordion.
- Photo Upload accordion.
- Pet fields include name, breed, age, weight, gender, coat color, vaccination, neutered, friendliness/calm tags, food, allergies, medication, notes, and photos.
- Pet data is scoped by current user in localStorage.

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

## Payment

- Payment page.
- Booking summary display.
- Deposit 50% or full 100% amount selection.
- Voucher-discounted payable amount display.
- Payment method selection.
- DuitNow QR UI placeholder.
- FPX, Touch 'n Go eWallet, GrabPay, Visa/Mastercard payment method cards.
- Demo payment confirmation.
- Order creation/update after payment.

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

## Reviews

- Customer review flow from completed orders.
- Reviews displayed on Home.
- Review carousel/swipe indicator.
- Host Panel review management.
- Host can add manual reviews.
- Host can show/hide/delete reviews.
- Home only shows live reviews and does not reveal source.

## Vouchers / Promotions

- My Vouchers page.
- Available / Used / Expired tabs.
- New Guest voucher.
- Multi-dog voucher.
- Referral voucher flow.
- Voucher wallet storage.
- Voucher application in Booking and Payment.
- Used voucher status with order references.
- Cancelled eligible bookings can return voucher availability in frontend logic.

## Referral

- Referral code generation based on user data.
- Referral code copy action and feedback.
- Optional referral code field in registration.
- Referral reward logic scaffold: referrer and friend receive RM10 after qualifying completion.

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

## Backend/API

- Express API scaffold.
- PostgreSQL repository.
- Users, pets, hosts, bookings, reviews, messages, notifications, payments routes/services.
- Stripe payment intent and webhook service.
- Firebase FCM service.
- API docs exist in `docs/API.md`.
