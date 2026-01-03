import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { ensureEnvValidated, getEnv } from '@/lib/env'

export async function createClient() {
    const cookieStore = await cookies()

    // Ensure environment variables are validated
    ensureEnvValidated();
    const env = getEnv();

    return createServerClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value, ...options })
                    } catch {
                        // The `set` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value: '', ...options })
                    } catch {
                        // The `delete` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    )
}

/**
 * Create a Supabase client with service role key (bypasses RLS)
 * Use this for server-side operations that need to bypass Row Level Security
 * WARNING: Only use in server-side code, never expose to client
 */
export function createServiceRoleClient() {
    try {
        const env = getEnv();
        console.log('Creating service role client with:', {
            url: env.NEXT_PUBLIC_SUPABASE_URL,
            keyPrefix: env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 10) + '...',
            keyType: env.SUPABASE_SERVICE_ROLE_KEY?.startsWith('sb_secret') ? 'sb_secret' : 'other'
        });

        return createSupabaseClient(
            env.NEXT_PUBLIC_SUPABASE_URL,
            env.SUPABASE_SERVICE_ROLE_KEY,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )
    } catch (error) {
        console.error('Failed to create service role client:', error);
        throw error;
    }
}
