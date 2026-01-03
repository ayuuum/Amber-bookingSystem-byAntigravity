/**
 * Integration Tests for Bookings API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { createMockSupabaseClient } from '@/test/mocks/supabase';
import { createMockRequest } from '@/test/helpers/api-helper';
import { mockStore } from '@/test/fixtures/stores';

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(),
}));

vi.mock('@/lib/line/notifications', () => ({
    sendBookingConfirmationLine: vi.fn(),
}));

vi.mock('@/lib/google/sync', () => ({
    syncBookingToGoogleCalendar: vi.fn(),
}));

vi.mock('@/lib/audit-log', () => ({
    logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/plan/access', () => ({
    getPlanAccess: vi.fn().mockResolvedValue({
        canUseLine: true,
        canUseAnalytics: true,
        canUseGoogleCalendar: true,
        canUseAiBooking: false,
    }),
}));

describe('POST /api/bookings', () => {
    let mockSupabase: any;

    beforeEach(async () => {
        vi.clearAllMocks();
        mockSupabase = createMockSupabaseClient();
        const { createClient } = await import('@/lib/supabase/server');
        (createClient as any).mockResolvedValue(mockSupabase);
    });

    it('正常系: 基本予約が作成できる', async () => {
        const requestBody = {
            slug: 'test-store',
            date: '2024-12-25T10:00:00Z',
            timeSlot: '10:00',
            cartItems: [
                {
                    serviceId: 'service-1',
                    quantity: 1,
                },
            ],
            lastName: 'テスト',
            firstName: '太郎',
            phone: '090-1234-5678',
            email: 'test@example.com',
            address: '東京都渋谷区テスト1-1-1',
            paymentMethod: 'on_site',
        };

        // Mock store lookup: from('stores').select().eq().single()
        const mockStoreQuery: any = {
            select: vi.fn(),
            eq: vi.fn(),
            single: vi.fn(),
        };
        mockStoreQuery.select.mockReturnValue(mockStoreQuery);
        mockStoreQuery.eq.mockReturnValue(mockStoreQuery);
        mockStoreQuery.single.mockResolvedValueOnce({
            data: { id: 'store-1', organization_id: 'org-1' },
            error: null,
        });
        mockSupabase.from.mockReturnValueOnce(mockStoreQuery);

        // Mock service areas: from('service_areas').select().eq()
        const mockServiceAreasQuery: any = {
            select: vi.fn(),
            eq: vi.fn(),
        };
        mockServiceAreasQuery.select.mockReturnValue(mockServiceAreasQuery);
        mockServiceAreasQuery.eq.mockResolvedValueOnce({
            data: [], // サービスエリア制限なし
            error: null,
        });
        mockSupabase.from.mockReturnValueOnce(mockServiceAreasQuery);

        // Mock services: from('services').select().in()
        const mockServicesQuery: any = {
            select: vi.fn(),
            in: vi.fn(),
        };
        mockServicesQuery.select.mockReturnValue(mockServicesQuery);
        mockServicesQuery.in.mockResolvedValueOnce({
            data: [
                {
                    id: 'service-1',
                    price: 5000,
                    duration_minutes: 60,
                    buffer_minutes: 10,
                },
            ],
            error: null,
        });
        mockSupabase.from.mockReturnValueOnce(mockServicesQuery);

        // Mock options: from('service_options').select().in()
        // Note: Since optionIds.length === 0, Promise.resolve({ data: [] }) is used in implementation
        // So we don't need to mock from('service_options')

        // Mock staff schedules: from('staff_schedules').select().eq()
        const mockStaffSchedulesQuery: any = {
            select: vi.fn(),
            eq: vi.fn(),
        };
        mockStaffSchedulesQuery.select.mockReturnValue(mockStaffSchedulesQuery);
        mockStaffSchedulesQuery.eq.mockResolvedValueOnce({
            data: [{ staff_id: 'staff-1' }],
            error: null,
        });
        mockSupabase.from.mockReturnValueOnce(mockStaffSchedulesQuery);

        // Mock RPC for booking creation
        // Note: rpc returns { data, error } format
        mockSupabase.rpc.mockResolvedValueOnce({
            data: { bookingId: 'booking-1' },
            error: null,
        });

        // Mock booking update: from('bookings').update().eq().select().single()
        const mockUpdateQuery: any = {
            update: vi.fn(),
            eq: vi.fn(),
            select: vi.fn(),
            single: vi.fn(),
        };
        mockUpdateQuery.update.mockReturnValue(mockUpdateQuery);
        mockUpdateQuery.eq.mockReturnValue(mockUpdateQuery);
        mockUpdateQuery.select.mockReturnValue(mockUpdateQuery);
        mockUpdateQuery.single.mockResolvedValueOnce({
            data: { 
                id: 'booking-1', 
                status: 'confirmed',
                staff_id: 'staff-1',
                total_amount: 5000,
                customers: { line_user_id: null },
                booking_items: []
            },
            error: null,
        });
        mockSupabase.from.mockReturnValueOnce(mockUpdateQuery);

        // Mock staff lookup for Google Calendar sync: from('staff').select().eq().single()
        const mockStaffQuery: any = {
            select: vi.fn(),
            eq: vi.fn(),
            single: vi.fn(),
        };
        mockStaffQuery.select.mockReturnValue(mockStaffQuery);
        mockStaffQuery.eq.mockReturnValue(mockStaffQuery);
        mockStaffQuery.single.mockResolvedValueOnce({
            data: { id: 'staff-1', google_refresh_token: null },
            error: null,
        });
        mockSupabase.from.mockReturnValueOnce(mockStaffQuery);

        const request = createMockRequest(requestBody);
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.bookingId).toBe('booking-1');
    });

    it('異常系: カートが空の場合はエラー', async () => {
        const requestBody = {
            slug: 'test-store',
            date: '2024-12-25T10:00:00Z',
            timeSlot: '10:00',
            cartItems: [],
            lastName: 'テスト',
            firstName: '太郎',
            phone: '090-1234-5678',
            address: '東京都渋谷区テスト1-1-1',
            paymentMethod: 'on_site',
        };

        // createClient()は呼ばれるが、バリデーションエラーで早期リターンされるため
        // Supabaseクエリは実行されない
        const request = createMockRequest(requestBody);
        const response = await POST(request);
        const data = await response.json();

        // バリデーションエラーは400を返すはず
        expect(response.status).toBe(400);
        expect(data.error).toBeDefined();
        // エラーメッセージまたはコードを確認
        if (data.error?.message) {
            expect(data.error.message).toContain('カートにサービスが入っていません');
        } else if (typeof data.error === 'string') {
            expect(data.error).toContain('カートにサービスが入っていません');
        }
    });

    it('異常系: 店舗が見つからない場合はエラー', async () => {
        const requestBody = {
            slug: 'non-existent-store',
            date: '2024-12-25T10:00:00Z',
            timeSlot: '10:00',
            cartItems: [{ serviceId: 'service-1', quantity: 1 }],
            lastName: 'テスト',
            firstName: '太郎',
            phone: '090-1234-5678',
            address: '東京都渋谷区テスト1-1-1',
            paymentMethod: 'on_site',
        };

        // Mock store lookup: from('stores').select().eq().single()
        const mockStoreQuery = mockSupabase.from();
        mockStoreQuery.select.mockReturnThis();
        mockStoreQuery.eq.mockReturnThis();
        mockStoreQuery.single.mockResolvedValueOnce({
            data: null,
            error: { message: 'Not found' },
        });
        mockSupabase.from.mockReturnValueOnce(mockStoreQuery);

        const request = createMockRequest(requestBody);
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(404);
        // エラーレスポンスの構造を確認
        if (data.error?.message) {
            expect(data.error.message).toContain('店舗');
        } else if (typeof data.error === 'string') {
            expect(data.error).toContain('店舗');
        } else {
            // エラーオブジェクトが存在することを確認
            expect(data.error).toBeDefined();
        }
    });
});

