# Changelog

All notable changes to the Amber project will be documented in this file.

## [v1.4] - Feature Prioritization & UI Completion - 2024-12-25
### Added
- **Feature Prioritization**: Defined "Must Have" vs "Nice To Have" features
- **Single Point of Focus**: Documented "24/7 Automatic Booking System" as the core differentiator
- **HQ Analytics Dashboard**: Full UI implementation for headquarters analytics (`/hq`)
- **HQ Billing Management**: Monthly billing and fee calculation UI (`/hq/billing`)
- **HQ Store Management**: Store listing and creation UI (`/hq/stores`)
- **Retention Analytics UI**: Customer retention rate and LTV analysis UI (`/admin/analytics`)
- **Invitation Management UI**: Sent invitations list and status management (`/admin/invites`)
- **Manual Calendar Sync Trigger**: UI to manually trigger Google Calendar synchronization
- **Event-Driven Architecture**: Asynchronous processing for external integrations (LINE, Google Calendar)
- **Dead Letter Queue (DLQ)**: Failed event management and manual reprocessing capability
- **Availability Calculation Fix**: Exclude cancelled bookings from availability calculation (prevents double-booking)

### Changed
- **Status Management**: Simplified to `active`/`cancelled` states (minimal status management)
- **Booking Update/Cancel**: Excluded from UI (can be replaced by direct database editing)

## [Phase 2] - Management & CRM - 2024-12-17
### Added
- **Analytics Dashboard**: Visualized Sales, Booking Counts, and Daily Trends (`/admin/analytics`).
- **CRM System**: Customer list with "Last Visit Date" and "Lost Customer" status tracking (`/admin/customers`).
- **Review System**: 
  - Customer review submission page (`/reviews/[id]`).
  - Admin function to copy review request links from Booking Dashboard.
- **Charts**: Integrated `recharts` for data visualization.

## [Phase 1] - Google Calendar Sync - 2024-12-16
### Added
- **Google Calendar Integration**: Bi-directional sync via OAuth 2.0.
- **Availability API**: Dynamic slot calculation based on Google Calendar active events.
- **Admin Settings**: Google Account connection UI (`/admin/settings`).
- **Business Hours**: Customizable weekly business hours configuration.
- **Security**: Added Admin Login (`/login`) and Middleware protection for `/admin` routes.
- **LINE Webhook**: Automated customer registration on "Friend Add".

## [Phase 0] - MVP - 2024-12-15
### Added
- **Booking System**: Guest booking wizard (Service -> Date -> Info -> Confirm).
- **Admin Dashboard**: Booking ledger (`/admin/bookings`) with status management.
- **Master Management**: Staff and Service management pages.
- **Notifications**: LINE Messaging API integration for booking confirmation.
- **Database**: Initial schema for `stores`, `staff`, `services`, `bookings`, `customers`.
