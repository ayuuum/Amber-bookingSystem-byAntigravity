/**
 * Test Fixtures for Users and Roles
 */

export const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    role: 'store_admin',
    organization_id: 'org-1',
    store_id: 'store-1',
};

export const mockHqAdmin = {
    id: 'user-hq-1',
    email: 'hq@example.com',
    role: 'hq_admin',
    organization_id: 'org-1',
    store_id: null,
};

export const mockStoreAdmin = {
    id: 'user-store-1',
    email: 'store@example.com',
    role: 'store_admin',
    organization_id: 'org-1',
    store_id: 'store-1',
};

export const mockFieldStaff = {
    id: 'user-staff-1',
    email: 'staff@example.com',
    role: 'field_staff',
    organization_id: 'org-1',
    store_id: 'store-1',
};

export const mockCustomer = {
    id: 'user-customer-1',
    email: 'customer@example.com',
    role: 'customer',
    organization_id: null,
    store_id: null,
};







