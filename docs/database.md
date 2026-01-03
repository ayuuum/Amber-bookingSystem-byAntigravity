# Database Schema - Amber Booking System

This document details the database schema for Amber, a multi-tenant SaaS booking platform.

## Core Tenancy

The system uses a two-tier tenancy model: **Organizations** and **Stores**.

### [organizations](file:///Users/ayumu/Amber-House-PJ/supabase/schema.sql#L5-L12)
The root of tenancy. Usually represents a business entity or franchise headquarters.
- `id`: UUID (PK)
- `name`: Organization name
- `slug`: Unique URL identifier
- `plan_type`: SaaS plan (Starter, Growth, Enterprise)
- `settings`: JSONB configuration (limits, features)

### [stores](file:///Users/ayumu/Amber-House-PJ/supabase/schema.sql#L28-L39)
The service delivery point. Each store belongs to one organization.
- `organization_id`: References `organizations`
- `name`: Store name
- `slug`: Unique URL identifier (e.g., `store-a`)
- `max_capacity`: Maximum simultaneous bookings (Capacity-based availability)
- `settings`: JSONB for branding (colors, welcome message)

---

## User Management

### [profiles](file:///Users/ayumu/Amber-House-PJ/supabase/schema.sql#L15-L25)
Extends Supabase Auth users.
- `role`: `hq_admin`, `store_admin`, `field_staff`, `customer`
- `organization_id`: Scopes the user to an organization
- `store_id`: (Nullable) Primary store for `store_admin` and `field_staff`

### [staff](file:///Users/ayumu/Amber-House-PJ/supabase/schema.sql#L796)
Represents a staff entity, which may or may not have a login (`profile_id`).
- `profile_id`: (Nullable) Link to `profiles`
- `nomination_fee`: Extra fee when this staff is requested

---

## Booking & CRM

### [customers](file:///Users/ayumu/Amber-House-PJ/supabase/schema.sql#L799)
- `store_id`: Scoped to a store
- `phone`: Primary identifier
- `email`: (Nullable)

### [house_assets](file:///Users/ayumu/Amber-House-PJ/supabase/schema.sql#L87-L100) (家カルテ)
Stores information about customer property (e.g., AC model, manufacturer).
- `customer_id`: Link to the customer
- `asset_type`: e.g., "Air Conditioner"
- `image_urls`: Array of photo links

### [bookings](file:///Users/ayumu/Amber-House-PJ/supabase/schema.sql#L103-L124)
- `status`: `pending`, `confirmed`, `working`, `completed`, `cancelled`
- `channel`: `web`, `line`, `phone`
- `start_time` / `end_time`: ISO8601 timestamps

---

## Billing & Services

### [services](file:///Users/ayumu/Amber-House-PJ/supabase/schema.sql#L63-L74)
The menu items offered by a store.
- `price`: In JPY
- `duration_minutes`: Estimated time for the service

### [invoices](file:///Users/ayumu/Amber-House-PJ/supabase/schema.sql#L127-L138)
Generated for each booking.
- `amount`: Final amount
- `status`: `draft`, `issued`, `paid`, `void`, `overdue`

---

## Common Columns
Most tables include:
- `created_at`: `timestamptz`
- `updated_at`: `timestamptz`
- `deleted_at`: `timestamptz` (for Soft Delete implementation)
