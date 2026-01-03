/**
 * Integration Tests for Services API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from './route';
import { createMockSupabaseClient } from '@/test/mocks/supabase';
import { createMockRequest } from '@/test/helpers/api-helper';

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(),
}));

describe('GET /api/services', () => {
    let mockSupabase: any;

    beforeEach(async () => {
        vi.clearAllMocks();
        mockSupabase = createMockSupabaseClient();
        const { createClient } = await import('@/lib/supabase/server');
        (createClient as any).mockResolvedValue(mockSupabase);
    });

    it('正常系: slug指定でサービス一覧が取得できる', async () => {
        // Implementation order:
        // 1. let query = supabase.from('services').select(...) - creates initial query
        // 2. from('stores').select().eq().limit() - gets store
        // 3. query = query.eq('store_id', storeId) - filters services
        // 4. query.order('price', { ascending: true }) - orders and resolves
        
        // Mock services query (created first): from('services').select()
        // Note: query is created first, then store lookup, then query.eq() and query.order()
        const mockServicesQuery: any = {
            select: vi.fn(),
            eq: vi.fn(),
            order: vi.fn(),
        };
        mockServicesQuery.select.mockReturnValue(mockServicesQuery);
        mockServicesQuery.eq.mockReturnValue(mockServicesQuery);
        mockServicesQuery.order.mockResolvedValueOnce({
            data: [
                {
                    id: 'service-1',
                    title: 'エアコン清掃',
                    price: 5000,
                    duration_minutes: 60,
                    options: [],
                },
            ],
            error: null,
        });
        mockSupabase.from.mockReturnValueOnce(mockServicesQuery);

        // Mock store lookup: from('stores').select().eq().limit()
        const mockStoreQuery: any = {
            select: vi.fn(),
            eq: vi.fn(),
            limit: vi.fn(),
        };
        mockStoreQuery.select.mockReturnValue(mockStoreQuery);
        mockStoreQuery.eq.mockReturnValue(mockStoreQuery);
        mockStoreQuery.limit.mockResolvedValueOnce({
            data: [{ id: 'store-1' }],
            error: null,
        });
        mockSupabase.from.mockReturnValueOnce(mockStoreQuery);

        // URLパラメータを含むリクエストを作成
        const url = new URL('http://localhost:3000/api/services?slug=test-store');
        const request = new Request(url.toString());
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(Array.isArray(data)).toBe(true);
        expect(data.length).toBeGreaterThan(0);
    });

    it('slugが指定されていない場合は空配列を返す', async () => {
        const url = new URL('http://localhost:3000/api/services');
        const request = new Request(url.toString());
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(Array.isArray(data)).toBe(true);
        expect(data.length).toBe(0);
    });
});

