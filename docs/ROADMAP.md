# Roadmap

## P0 - Must Complete Before Real Public Launch

- Move customer accounts from localStorage to real backend/auth provider.
- Move pets, bookings, orders, vouchers, reviews, chat, gallery, and off days to PostgreSQL/Supabase.
- Connect Next.js web pages to backend APIs instead of localStorage for production data.
- Apply Supabase migrations and verify database connection.
- Align overnight price across frontend, shared package, API, and database.
- Implement secure OTP via SMS/email provider.
- Implement real payment webhook status updates.
- Implement real upload storage using Supabase Storage or AWS S3.
- Implement real host/customer chat persistence and realtime delivery.
- Server-side voucher and referral validation.
- Server-side capacity calculation by dog count.
- Configure and verify production environment variables.

## P1 - Strongly Recommended

- Add proper role-based access control for Host/Admin routes.
- Add admin audit log for booking/payment/review/gallery/capacity changes.
- Add host order search, filters, pagination, and date range reports.
- Add customer profile export/backup.
- Add payment reconciliation report.
- Add review moderation history.
- Add gallery image compression and validation.
- Add automated tests for booking, payment, voucher, referral, and capacity logic.
- Add full i18n audit for every page after future changes.
- Add browser tests for mobile Home, Booking, Payment, Orders, Host Panel.

## P2 - Future Optimizations

- Add analytics for registration, booking, payment, and voucher usage.
- Add email/SMS/WhatsApp notifications.
- Add calendar sync/export.
- Add owner reminders before check-in/check-out.
- Add host mobile optimized panel.
- Add revenue dashboard charts.
- Add promotion campaign builder.
- Add customer segmentation for repeat owners.
- Add public FAQ page.
- Add richer diary media albums.
