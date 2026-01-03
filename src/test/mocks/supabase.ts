/**
 * Mock Supabase Client for Testing
 * 
 * メソッドチェーンを正しくサポートするモック
 */

import { vi } from 'vitest';

export function createMockSupabaseClient() {
    // クエリビルダーを作成するヘルパー
    const createQueryBuilder = () => {
        const builder: any = {
            select: vi.fn(() => builder),
            insert: vi.fn(() => builder),
            update: vi.fn(() => builder),
            delete: vi.fn(() => builder),
            eq: vi.fn(() => builder),
            neq: vi.fn(() => builder),
            gt: vi.fn(() => builder),
            gte: vi.fn(() => builder),
            lt: vi.fn(() => builder),
            lte: vi.fn(() => builder),
            in: vi.fn(() => builder),
            single: vi.fn(() => builder),
            limit: vi.fn(() => builder),
            order: vi.fn(() => builder),
        };
        return builder;
    };

    const mockClient = {
        from: vi.fn(() => createQueryBuilder()),
        rpc: vi.fn(),
        auth: {
            getUser: vi.fn(),
            signInWithPassword: vi.fn(),
            signOut: vi.fn(),
        },
    };

    return mockClient;
}

