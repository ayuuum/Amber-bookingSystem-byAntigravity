/**
 * Integration Tests for Availability V2 API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { createMockSupabaseClient } from '@/test/mocks/supabase';
import { createMockRequest } from '@/test/helpers/api-helper';

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(),
}));

describe('POST /api/availability-v2', () => {
    let mockSupabase: any;

    beforeEach(async () => {
        vi.clearAllMocks();
        mockSupabase = createMockSupabaseClient();
        const { createClient } = await import('@/lib/supabase/server');
        (createClient as any).mockResolvedValue(mockSupabase);
    });

    it('正常系: 空き枠が返る', async () => {
        const requestBody = {
            storeSlug: 'test-store',
            date: '2024-12-25',
            cartItems: [
                {
                    serviceId: 'service-1',
                    quantity: 1,
                },
            ],
        };

        // Mock store: from('stores').select().eq().limit()
        // 2024-12-25 is Wednesday, so we need wed business hours
        const mockStoreQuery = mockSupabase.from();
        mockStoreQuery.select.mockReturnThis();
        mockStoreQuery.eq.mockReturnThis();
        mockStoreQuery.limit.mockResolvedValueOnce({
            data: [
                {
                    id: 'store-1',
                    slug: 'test-store',
                    max_capacity: 3,
                    business_hours: {
                        wed: { open: '09:00', close: '18:00', isOpen: true },
                    },
                    settings: {},
                },
            ],
            error: null,
        });
        mockSupabase.from.mockReturnValueOnce(mockStoreQuery);

        // Mock services: from('services').select().in()
        const mockServicesQuery = mockSupabase.from();
        mockServicesQuery.select.mockReturnThis();
        mockServicesQuery.in.mockResolvedValueOnce({
            data: [
                {
                    id: 'service-1',
                    duration_minutes: 60,
                },
            ],
            error: null,
        });
        mockSupabase.from.mockReturnValueOnce(mockServicesQuery);

        // Mock bookings: from('bookings').select().eq().neq().gte().lte()
        const mockBookingsQuery = mockSupabase.from();
        mockBookingsQuery.select.mockReturnThis();
        mockBookingsQuery.eq.mockReturnThis();
        mockBookingsQuery.neq.mockReturnThis();
        mockBookingsQuery.gte.mockReturnThis();
        mockBookingsQuery.lte.mockResolvedValueOnce({
            data: [],
            error: null,
        });
        mockSupabase.from.mockReturnValueOnce(mockBookingsQuery);

        const request = createMockRequest(requestBody);
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(Array.isArray(data)).toBe(true);
        expect(data.length).toBeGreaterThan(0);
    });

    it('異常系: 必須フィールドが不足している場合はエラー', async () => {
        const requestBody = {
            storeSlug: 'test-store',
            // date が不足
        };

        const request = createMockRequest(requestBody);
        const response = await POST(request);

        expect(response.status).toBe(400);
    });

    it('異常系: 店舗が見つからない場合はエラー', async () => {
        const requestBody = {
            storeSlug: 'non-existent-store',
            date: '2024-12-25',
            cartItems: [{ serviceId: 'service-1', quantity: 1 }],
        };

        const mockStoreQuery = mockSupabase.from();
        mockStoreQuery.select.mockReturnThis();
        mockStoreQuery.eq.mockReturnThis();
        mockStoreQuery.limit.mockResolvedValueOnce({
            data: [],
            error: null,
        });
        mockSupabase.from.mockReturnValueOnce(mockStoreQuery);

        const request = createMockRequest(requestBody);
        const response = await POST(request);

        expect(response.status).toBe(404);
    });

    it('営業時間外の場合は空配列を返す', async () => {
        const requestBody = {
            storeSlug: 'test-store',
            date: '2024-12-22', // Sunday
            cartItems: [{ serviceId: 'service-1', quantity: 1 }],
        };

        const mockStoreQuery = mockSupabase.from();
        mockStoreQuery.select.mockReturnThis();
        mockStoreQuery.eq.mockReturnThis();
        mockStoreQuery.limit.mockResolvedValueOnce({
            data: [
                {
                    id: 'store-1',
                    slug: 'test-store',
                    max_capacity: 3,
                    business_hours: {
                        sun: { open: '10:00', close: '16:00', isOpen: false },
                    },
                    settings: {},
                },
            ],
            error: null,
        });
        mockSupabase.from.mockReturnValueOnce(mockStoreQuery);

        const mockServicesQuery = mockSupabase.from();
        mockServicesQuery.select.mockReturnThis();
        mockServicesQuery.in.mockResolvedValueOnce({
            data: [{ id: 'service-1', duration_minutes: 60 }],
            error: null,
        });
        mockSupabase.from.mockReturnValueOnce(mockServicesQuery);

        const request = createMockRequest(requestBody);
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(Array.isArray(data)).toBe(true);
        expect(data.length).toBe(0);
    });
});

