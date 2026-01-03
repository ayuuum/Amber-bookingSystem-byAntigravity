/**
 * Test Fixtures for Stores
 */

import { Store } from '@/types';

export const mockStore: Store = {
    id: 'store-1',
    organization_id: 'org-1',
    name: 'テスト店舗',
    slug: 'test-store',
    address: '東京都渋谷区テスト1-1-1',
    phone: '03-1234-5678',
    email: 'test@example.com',
    is_archived: false,
    business_hours: {
        mon: { open: '09:00', close: '18:00', isOpen: true },
        tue: { open: '09:00', close: '18:00', isOpen: true },
        wed: { open: '09:00', close: '18:00', isOpen: true },
        thu: { open: '09:00', close: '18:00', isOpen: true },
        fri: { open: '09:00', close: '18:00', isOpen: true },
        sat: { open: '10:00', close: '16:00', isOpen: true },
        sun: { open: '10:00', close: '16:00', isOpen: false },
    },
    settings: {},
    created_at: new Date().toISOString(),
};

export const mockStoreWithCapacity: Store & { max_capacity?: number } = {
    ...mockStore,
    max_capacity: 3,
};

export const mockStoreClosed: Store = {
    ...mockStore,
    business_hours: {
        mon: { open: '09:00', close: '18:00', isOpen: false },
    },
};







