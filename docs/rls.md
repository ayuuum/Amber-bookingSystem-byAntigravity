# Row Level Security (RLS) - Amber Booking System

Amber relies on Supabase Row Level Security (RLS) to ensure data isolation between organizations (tenants) and to enforce Role-Based Access Control (RBAC).

## Security Strategy

### JWT Metadata Sink
To avoid expensive `JOIN` operations with the `profiles` table in every RLS policy, we sync user roles and organization IDs directly into the Supabase Auth JWT `app_metadata`.

**Helper Functions:**
- `auth.jwt_role()`: Returns the user's role (`hq_admin`, `store_admin`, etc.).
- `auth.jwt_org_id()`: Returns the user's `organization_id`.
- `auth.jwt_store_id()`: Returns the user's primary `store_id`.

**Synchronization:**
A trigger `on_profile_update_sync_auth` on the `profiles` table automatically updates `auth.users` metadata whenever a profile is modified.

---

## Permission Matrix

| Role | Organizations | Stores | Bookings | Customers |
| :--- | :---: | :---: | :---: | :---: |
| **hq_admin** | View (Own) | Manage (All in Org) | Manage (All in Org) | Manage (All in Org) |
| **store_admin** | View (Own) | Manage (Own Store) | Manage (Own Store) | Manage (Own Store) |
| **field_staff** | View (Own) | View (Own Store) | View (Assigned/Store) | View (Store) |
| **customer** | ❌ | View (Public) | View/Manage (Own) | View/Manage (Own) |
| **Anon** | ❌ | View (Public) | Insert (Public) | ❌ |

---

## Policy Patterns

### Organization Isolation
Most tables use a simple check against the Organization ID in the JWT:
```sql
CREATE POLICY "Tenancy Isolation" ON table_name
FOR ALL USING (organization_id = auth.jwt_org_id());
```

### Role-Based Access
Used when different roles have different levels of access within the same organization:
```sql
CREATE POLICY "Manage Access" ON stores
FOR ALL USING (
  organization_id = auth.jwt_org_id() AND (
    auth.jwt_role() = 'hq_admin' OR 
    (auth.jwt_role() = 'store_admin' AND id = auth.jwt_store_id())
  )
);
```

### Soft Delete Awareness
Policies for `customers`, `services`, and `staff` include a check for `deleted_at IS NULL` to hide soft-deleted records by default:
```sql
CREATE POLICY "Active Records Only" ON customers
FOR SELECT USING (deleted_at IS NULL);
```

---

## Notable Multi-tenant Policies

- **[organizations](file:///Users/ayumu/Amber-House-PJ/supabase/migrations/20241221_phase1_1_security_update.sql#L72)**: Only `hq_admin` can update organization settings.
- **[bookings](file:///Users/ayumu/Amber-House-PJ/supabase/migrations/20241224_update_rls_role_names.sql#L106)**: Complex policy allowing staff to see only their assigned bookings or store-wide bookings depending on configuration.
- **[services](file:///Users/ayumu/Amber-House-PJ/supabase/migrations/20241221_phase1_1_security_update.sql#L106)**: Publicly viewable if `is_active = true`, but managed only by admins.
