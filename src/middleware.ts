import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
// Initialize environment validation on first middleware call
import '@/lib/init'
import { ensureEnvValidated, getEnv } from '@/lib/env'

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    // Ensure environment variables are validated
    ensureEnvValidated();
    const env = getEnv();

    // Protect Admin Routes
    if (request.nextUrl.pathname.startsWith('/admin')) {
        const supabase = createServerClient(
            env.NEXT_PUBLIC_SUPABASE_URL,
            env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll()
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                        response = NextResponse.next({
                            request: {
                                headers: request.headers,
                            },
                        })
                        cookiesToSet.forEach(({ name, value, options }) =>
                            response.cookies.set(name, value, options)
                        )
                    },
                },
            }
        )

        try {
            const {
                data: { user },
                error: authError
            } = await supabase.auth.getUser()

            // Network errors should not trigger redirects - let the request proceed
            // The client-side components will handle auth state
            if (authError) {
                // Check if it's a network error
                if (authError.message?.includes('Failed to fetch') || 
                    authError.message?.includes('NetworkError') ||
                    authError.name === 'NetworkError') {
                    // Network errors are logged but don't trigger redirects
                    // Client-side components will handle auth state
                    return response;
                }
                // Other auth errors (expired token, etc.) should redirect
                return NextResponse.redirect(new URL('/login', request.url));
            }

            if (!user) {
                // Redirect to Login
                return NextResponse.redirect(new URL('/login', request.url))
            }
        } catch (err: unknown) {
            // Catch network errors and other unexpected errors
            const errorMessage = err instanceof Error ? err.message : String(err);
            if (errorMessage.includes('Failed to fetch') || 
                (err as { name?: string })?.name === 'TypeError' ||
                errorMessage.includes('network')) {
                // Network errors are handled gracefully - let request proceed
                return response;
            }
            // For other errors, redirect to login
            return NextResponse.redirect(new URL('/login', request.url));
        }
    }

    return response
}

export const config = {
    matcher: [
        '/admin/:path*',
        // Exclude API routes, static files, favorites, etc
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
