/**
 * Authentication Helper for Tests
 */

import { createMockSupabaseClient } from '../mocks/supabase';
import { mockUser, mockHqAdmin, mockStoreAdmin, mockFieldStaff } from '../fixtures/users';

export function createAuthenticatedUser(role: 'hq_admin' | 'store_admin' | 'field_staff' | 'customer' = 'store_admin') {
    const supabase = createMockSupabaseClient();
    
    let user;
    switch (role) {
        case 'hq_admin':
            user = mockHqAdmin;
            break;
        case 'store_admin':
            user = mockStoreAdmin;
            break;
        case 'field_staff':
            user = mockFieldStaff;
            break;
        default:
            user = mockUser;
    }

    supabase.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: { id: user.id, email: user.email } },
        error: null,
    });

    return { supabase, user };
}

export function createUnauthenticatedUser() {
    const supabase = createMockSupabaseClient();
    
    supabase.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
    });

    return { supabase };
}







