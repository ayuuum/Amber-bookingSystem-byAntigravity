/**
 * Database Helper for Tests
 */

import { vi } from 'vitest';

export function mockQueryBuilder(mockSupabase: any, tableName: string) {
    return {
        select: vi.fn(() => ({
            eq: vi.fn(() => ({
                single: vi.fn(),
                limit: vi.fn(),
            })),
            in: vi.fn(),
        })),
        insert: vi.fn(() => ({
            select: vi.fn(),
        })),
        update: vi.fn(() => ({
            eq: vi.fn(() => ({
                select: vi.fn(),
            })),
        })),
        delete: vi.fn(() => ({
            eq: vi.fn(),
        })),
    };
}

export function setupMockResponse(mockSupabase: any, tableName: string, response: { data: any; error: any }) {
    mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
            eq: vi.fn().mockReturnValueOnce({
                single: vi.fn().mockResolvedValueOnce(response),
            }),
        }),
    });
}







