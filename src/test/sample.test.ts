import { describe, it, expect } from 'vitest';

describe('Sample Test', () => {
    it('should pass', () => {
        expect(1 + 1).toBe(2);
    });
});

// バリデーション等のロジックテストを想定したサンプル
export function validateSlug(slug: string) {
    return /^[a-z0-9-]+$/.test(slug);
}

describe('validateSlug', () => {
    it('validates correct slugs', () => {
        expect(validateSlug('my-store-123')).toBe(true);
    });

    it('invalidates incorrect slugs', () => {
        expect(validateSlug('My Store!')).toBe(false);
    });
});
