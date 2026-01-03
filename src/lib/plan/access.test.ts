/**
 * Unit Tests for Plan Access Logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPlanAccess, checkResourceLimit, validateFeatureAccess } from './access';

// Mock Supabase server
vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(),
}));

describe('getPlanAccess', () => {
    let mockSupabase: any;

    beforeEach(async () => {
        vi.clearAllMocks();
        mockSupabase = {
            from: vi.fn(() => mockSupabase),
            select: vi.fn(() => mockSupabase),
            eq: vi.fn(() => mockSupabase),
            single: vi.fn(() => mockSupabase),
        };
        const { createClient } = await import('@/lib/supabase/server');
        (createClient as any).mockResolvedValue(mockSupabase);
    });

    it('starterプランでは全ての機能が無効', async () => {
        mockSupabase.from.mockReturnValueOnce({
            select: vi.fn().mockReturnValueOnce({
                eq: vi.fn().mockReturnValueOnce({
                    single: vi.fn().mockResolvedValueOnce({
                        data: { plan_type: 'starter' },
                        error: null,
                    }),
                }),
            }),
        });

        const access = await getPlanAccess('org-1');
        expect(access.canUseLine).toBe(false);
        expect(access.canUseAnalytics).toBe(false);
        expect(access.canUseGoogleCalendar).toBe(false);
        expect(access.canUseAiBooking).toBe(false);
    });

    it('growthプランではLINE、分析、カレンダーが有効', async () => {
        mockSupabase.from.mockReturnValueOnce({
            select: vi.fn().mockReturnValueOnce({
                eq: vi.fn().mockReturnValueOnce({
                    single: vi.fn().mockResolvedValueOnce({
                        data: { plan_type: 'growth' },
                        error: null,
                    }),
                }),
            }),
        });

        const access = await getPlanAccess('org-1');
        expect(access.canUseLine).toBe(true);
        expect(access.canUseAnalytics).toBe(true);
        expect(access.canUseGoogleCalendar).toBe(true);
        expect(access.canUseAiBooking).toBe(false);
    });

    it('enterpriseプランでは全ての機能が有効', async () => {
        mockSupabase.from.mockReturnValueOnce({
            select: vi.fn().mockReturnValueOnce({
                eq: vi.fn().mockReturnValueOnce({
                    single: vi.fn().mockResolvedValueOnce({
                        data: { plan_type: 'enterprise' },
                        error: null,
                    }),
                }),
            }),
        });

        const access = await getPlanAccess('org-1');
        expect(access.canUseLine).toBe(true);
        expect(access.canUseAnalytics).toBe(true);
        expect(access.canUseGoogleCalendar).toBe(true);
        expect(access.canUseAiBooking).toBe(true);
    });

    it('組織が見つからない場合はstarterプランにフォールバック', async () => {
        mockSupabase.from.mockReturnValueOnce({
            select: vi.fn().mockReturnValueOnce({
                eq: vi.fn().mockReturnValueOnce({
                    single: vi.fn().mockResolvedValueOnce({
                        data: null,
                        error: { message: 'Not found' },
                    }),
                }),
            }),
        });

        const access = await getPlanAccess('non-existent-org');
        expect(access.canUseLine).toBe(false);
        expect(access.canUseAnalytics).toBe(false);
    });
});

describe('checkResourceLimit', () => {
    let mockSupabase: any;

    beforeEach(async () => {
        vi.clearAllMocks();
        mockSupabase = {
            from: vi.fn(() => mockSupabase),
            select: vi.fn(() => mockSupabase),
            eq: vi.fn(() => mockSupabase),
            single: vi.fn(() => mockSupabase),
        };
        const { createClient } = await import('@/lib/supabase/server');
        (createClient as any).mockResolvedValue(mockSupabase);
    });

    it('店舗数の制限をチェックできる', async () => {
        // Mock organization
        mockSupabase.from.mockReturnValueOnce({
            select: vi.fn().mockReturnValueOnce({
                eq: vi.fn().mockReturnValueOnce({
                    single: vi.fn().mockResolvedValueOnce({
                        data: { max_stores: 3, max_staff: 10, max_house_assets: 50 },
                        error: null,
                    }),
                }),
            }),
        });

        // Mock stores count
        mockSupabase.from.mockReturnValueOnce({
            select: vi.fn().mockReturnValueOnce({
                eq: vi.fn().mockResolvedValueOnce({
                    count: 2,
                }),
            }),
        });

        const result = await checkResourceLimit('org-1', 'stores');
        expect(result.allowed).toBe(true);
        expect(result.current).toBe(2);
        expect(result.limit).toBe(3);
    });

    it('制限に達している場合はallowedがfalse', async () => {
        mockSupabase.from.mockReturnValueOnce({
            select: vi.fn().mockReturnValueOnce({
                eq: vi.fn().mockReturnValueOnce({
                    single: vi.fn().mockResolvedValueOnce({
                        data: { max_stores: 3, max_staff: 10, max_house_assets: 50 },
                        error: null,
                    }),
                }),
            }),
        });

        mockSupabase.from.mockReturnValueOnce({
            select: vi.fn().mockReturnValueOnce({
                eq: vi.fn().mockResolvedValueOnce({
                    count: 3, // 制限に達している
                }),
            }),
        });

        const result = await checkResourceLimit('org-1', 'stores');
        expect(result.allowed).toBe(false);
        expect(result.current).toBe(3);
        expect(result.limit).toBe(3);
    });

    it('スタッフ数の制限をチェックできる', async () => {
        mockSupabase.from.mockReturnValueOnce({
            select: vi.fn().mockReturnValueOnce({
                eq: vi.fn().mockReturnValueOnce({
                    single: vi.fn().mockResolvedValueOnce({
                        data: { max_stores: 3, max_staff: 10, max_house_assets: 50 },
                        error: null,
                    }),
                }),
            }),
        });

        mockSupabase.from.mockReturnValueOnce({
            select: vi.fn().mockReturnValueOnce({
                eq: vi.fn().mockResolvedValueOnce({
                    count: 5,
                }),
            }),
        });

        const result = await checkResourceLimit('org-1', 'staff');
        expect(result.allowed).toBe(true);
        expect(result.current).toBe(5);
        expect(result.limit).toBe(10);
    });

    it('組織が見つからない場合はallowedがfalse', async () => {
        mockSupabase.from.mockReturnValueOnce({
            select: vi.fn().mockReturnValueOnce({
                eq: vi.fn().mockReturnValueOnce({
                    single: vi.fn().mockResolvedValueOnce({
                        data: null,
                        error: { message: 'Not found' },
                    }),
                }),
            }),
        });

        const result = await checkResourceLimit('non-existent-org', 'stores');
        expect(result.allowed).toBe(false);
        expect(result.current).toBe(0);
        expect(result.limit).toBe(0);
    });
});

describe('validateFeatureAccess', () => {
    let mockSupabase: any;

    beforeEach(async () => {
        vi.clearAllMocks();
        mockSupabase = {
            from: vi.fn(() => mockSupabase),
            select: vi.fn(() => mockSupabase),
            eq: vi.fn(() => mockSupabase),
            single: vi.fn(() => mockSupabase),
        };
        const { createClient } = await import('@/lib/supabase/server');
        (createClient as any).mockResolvedValue(mockSupabase);
    });

    it('growthプランではLINE機能が有効', async () => {
        mockSupabase.from.mockReturnValueOnce({
            select: vi.fn().mockReturnValueOnce({
                eq: vi.fn().mockReturnValueOnce({
                    single: vi.fn().mockResolvedValueOnce({
                        data: { plan_type: 'growth' },
                        error: null,
                    }),
                }),
            }),
        });

        const hasAccess = await validateFeatureAccess('org-1', 'canUseLine');
        expect(hasAccess).toBe(true);
    });

    it('starterプランではLINE機能が無効', async () => {
        mockSupabase.from.mockReturnValueOnce({
            select: vi.fn().mockReturnValueOnce({
                eq: vi.fn().mockReturnValueOnce({
                    single: vi.fn().mockResolvedValueOnce({
                        data: { plan_type: 'starter' },
                        error: null,
                    }),
                }),
            }),
        });

        const hasAccess = await validateFeatureAccess('org-1', 'canUseLine');
        expect(hasAccess).toBe(false);
    });
});

