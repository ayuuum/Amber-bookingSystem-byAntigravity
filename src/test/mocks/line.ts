/**
 * Mock LINE Client for Testing
 */

import { vi } from 'vitest';

export const mockLineClient = {
    pushMessage: vi.fn(),
    replyMessage: vi.fn(),
    getProfile: vi.fn(),
    validateSignature: vi.fn(),
};







