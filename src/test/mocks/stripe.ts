/**
 * Mock Stripe Client for Testing
 */

import { vi } from 'vitest';

export const mockStripe = {
    checkout: {
        sessions: {
            create: vi.fn(),
            retrieve: vi.fn(),
        },
    },
    refunds: {
        create: vi.fn(),
    },
    accounts: {
        create: vi.fn(),
        retrieve: vi.fn(),
    },
    webhooks: {
        constructEvent: vi.fn(),
    },
};







