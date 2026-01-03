import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error(
            'Missing Supabase environment variables. ' +
            'Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
        );
    }

    return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Safe wrapper for auth.getUser() that prevents retry loops
 * Returns null on network errors instead of throwing
 */
export async function safeGetUser(supabase: ReturnType<typeof createClient>) {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        // Network errors (Failed to fetch) should not trigger state updates
        if (error) {
            // Check if it's a network error
            if (error.message?.includes('Failed to fetch') || 
                error.message?.includes('NetworkError') ||
                error.name === 'NetworkError') {
                console.error('[Auth] Network error during getUser:', error.message);
                return { user: null, error: null }; // Return null user but no error to prevent retry loops
            }
            // Other auth errors (expired token, etc.) are legitimate
            return { user, error };
        }
        
        return { user, error: null };
    } catch (err: any) {
        // Catch any unexpected errors (network failures, etc.)
        if (err?.message?.includes('Failed to fetch') || 
            err?.name === 'TypeError' ||
            err?.message?.includes('network')) {
            console.error('[Auth] Network error during getUser:', err.message);
            return { user: null, error: null }; // Prevent retry loops
        }
        console.error('[Auth] Unexpected error during getUser:', err);
        return { user: null, error: err };
    }
}
