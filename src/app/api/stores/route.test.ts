/**
 * Integration Tests for Stores API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from './route';
import { createMockSupabaseClient } from '@/test/mocks/supabase';
import { createMockRequest, createMockNextRequest } from '@/test/helpers/api-helper';
import { createAuthenticatedUser } from '@/test/helpers/auth-helper';

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(),
}));

vi.mock('@supabase/ssr', () => ({
    createServerClient: vi.fn(),
}));

// withAuthミドルウェアをモック
// 各テストでmockSupabaseを使用するため、テストごとにコンテキストを提供
const testContexts = new Map<string, { user: any; supabase: any }>();

vi.mock('@/lib/api/middleware', async () => {
    const actual = await vi.importActual('@/lib/api/middleware');
    return {
        ...actual,
        withAuth: (handler: any) => {
            return async (request: any) => {
                // テストIDを取得（テスト名から）
                const testId = expect.getState().currentTestName || 'default';
                const context = testContexts.get(testId) || {
                    user: {
                        id: 'user-1',
                        role: 'store_admin',
                        organizationId: 'org-1',
                        storeId: null,
                    },
                    supabase: createMockSupabaseClient(),
                };
                return handler(request, context);
            };
        },
    };
});

vi.mock('@/lib/plan/access', () => ({
    checkResourceLimit: vi.fn(),
}));

describe('GET /api/stores', () => {
    let mockSupabase: any;

    beforeEach(async () => {
        vi.clearAllMocks();
        mockSupabase = createMockSupabaseClient();
        const { createClient } = await import('@/lib/supabase/server');
        (createClient as any).mockResolvedValue(mockSupabase);
    });

    it('正常系: 店舗一覧が取得できる（RLS検証）', async () => {
        // Mock auth.getUser() for withAuth middleware
        mockSupabase.auth.getUser.mockResolvedValueOnce({
            data: { user: { id: 'user-1' } },
            error: null,
        });

        const mockStoresQuery = mockSupabase.from();
        mockStoresQuery.select.mockReturnThis();
        mockStoresQuery.eq.mockReturnThis();
        mockStoresQuery.order.mockResolvedValueOnce({
            data: [
                {
                    id: 'store-1',
                    name: 'テスト店舗',
                    slug: 'test-store',
                    organization_id: 'org-1',
                },
            ],
            error: null,
        });
        mockSupabase.from.mockReturnValueOnce(mockStoresQuery);

        const request = createMockNextRequest();
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(Array.isArray(data)).toBe(true);
    });
});

describe('POST /api/stores', () => {
    let mockSupabase: any;

    beforeEach(async () => {
        vi.clearAllMocks();
        mockSupabase = createMockSupabaseClient();
        const { user } = createAuthenticatedUser('store_admin');
        const testUser = {
            id: user.id,
            role: 'store_admin',
            organizationId: 'org-1',
            storeId: null,
        };
        // テストコンテキストを設定
        const testId = expect.getState().currentTestName || 'default';
        testContexts.set(testId, { user: testUser, supabase: mockSupabase });
        const { createClient } = await import('@/lib/supabase/server');
        (createClient as any).mockResolvedValue(mockSupabase);
    });

    it('正常系: 店舗が作成できる', async () => {
        // Mock checkResourceLimit
        const { checkResourceLimit } = await import('@/lib/plan/access');
        (checkResourceLimit as any).mockResolvedValueOnce({
            allowed: true,
            current: 1,
            limit: 3,
        });

        const requestBody = {
            name: '新規店舗',
            slug: 'new-store',
            address: '東京都渋谷区テスト1-1-1',
        };

        // Mock auth.getUser() for withAuth middleware
        mockSupabase.auth.getUser.mockResolvedValueOnce({
            data: { user: { id: 'user-1' } },
            error: null,
        });

        // Mock store creation: from('stores').insert().select().single()
        const mockInsertQuery = mockSupabase.from();
        mockInsertQuery.insert.mockReturnThis();
        mockInsertQuery.select.mockReturnThis();
        mockInsertQuery.single.mockResolvedValueOnce({
            data: { id: 'store-new', name: '新規店舗' },
            error: null,
        });
        mockSupabase.from.mockReturnValueOnce(mockInsertQuery);

        const request = createMockNextRequest(requestBody);
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.name).toBe('新規店舗');
    });
});

