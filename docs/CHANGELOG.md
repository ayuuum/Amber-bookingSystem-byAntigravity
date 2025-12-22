# Changelog

All notable changes to the Haukuri Pro project will be documented in this file.

## [Phase 2] - Management & CRM - 2025-12-17
### Added
- **Analytics Dashboard**: Visualized Sales, Booking Counts, and Daily Trends (`/admin/analytics`).
- **CRM System**: Customer list with "Last Visit Date" and "Lost Customer" status tracking (`/admin/customers`).
- **Review System**: 
  - Customer review submission page (`/reviews/[id]`).
  - Admin function to copy review request links from Booking Dashboard.
- **Charts**: Integrated `recharts` for data visualization.

## [Phase 1] - Google Calendar Sync - 2025-12-16
### Added
- **Google Calendar Integration**: Bi-directional sync via OAuth 2.0.
- **Availability API**: Dynamic slot calculation based on Google Calendar active events.
- **Admin Settings**: Google Account connection UI (`/admin/settings`).
- **Business Hours**: Customizable weekly business hours configuration.
- **Security**: Added Admin Login (`/login`) and Middleware protection for `/admin` routes.
- **LINE Webhook**: Automated customer registration on "Friend Add".

## [Phase 0] - MVP - 2025-12-15
### Added
- **Booking System**: Guest booking wizard (Service -> Date -> Info -> Confirm).
- **Admin Dashboard**: Booking ledger (`/admin/bookings`) with status management.
- **Master Management**: Staff and Service management pages.
- **Notifications**: LINE Messaging API integration for booking confirmation.
- **Database**: Initial schema for `stores`, `staff`, `services`, `bookings`, `customers`.
