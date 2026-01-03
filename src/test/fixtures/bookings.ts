/**
 * Test Fixtures for Bookings
 */

import { Booking } from '@/types';

export const mockBooking: Booking = {
    id: 'booking-1',
    organization_id: 'org-1',
    store_id: 'store-1',
    customer_id: 'customer-1',
    service_id: 'service-1',
    staff_id: 'staff-1',
    start_time: '2024-12-25T10:00:00Z',
    end_time: '2024-12-25T11:00:00Z',
    status: 'confirmed',
    channel: 'web',
    customer_name: 'テスト太郎',
    customer_email: 'test@example.com',
    customer_phone: '090-1234-5678',
    customer_address: '東京都渋谷区テスト1-1-1',
    notes: null,
    created_at: new Date().toISOString(),
};

export const mockBookingPendingPayment: Booking = {
    ...mockBooking,
    id: 'booking-2',
    status: 'pending_payment',
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15分後
};

export const mockBookingCancelled: Booking = {
    ...mockBooking,
    id: 'booking-3',
    status: 'cancelled',
};

export const mockBookingExpired: Booking = {
    ...mockBooking,
    id: 'booking-4',
    status: 'pending_payment',
    expires_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(), // 20分前（期限切れ）
};







