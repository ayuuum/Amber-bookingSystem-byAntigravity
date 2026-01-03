/**
 * API Middleware
 * 
 * Provides unified authentication, error handling, and request/response logging
 * for all API routes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { errorResponse, AmberErrors } from '@/lib/errors';
import { logger, loggers } from '@/lib/logger';
import { ensureEnvValidated, getEnv } from '@/lib/env';

export interface ApiContext {
    user: {
        id: string;
        role: string;
        organizationId: string | null;
        storeId: string | null;
    };
    supabase: ReturnType<typeof createServerClient>;
}

export type ApiHandler = (
    request: NextRequest,
    context: ApiContext
) => Promise<NextResponse>;

/**
 * Middleware wrapper that handles authentication and error handling
 */
export function withAuth(handler: ApiHandler) {
    return async (request: NextRequest) => {
        const startTime = Date.now();
        const method = request.method;
        const path = request.nextUrl.pathname;

        try {
            // Ensure environment variables are validated
            ensureEnvValidated();
            const env = getEnv();

            // Create Supabase client
            const supabase = createServerClient(
                env.NEXT_PUBLIC_SUPABASE_URL,
                env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
                {
                    cookies: {
                        getAll() {
                            return request.cookies.getAll();
                        },
                        setAll() {
                            // Server-side cookie handling is done via response
                        },
                    },
                }
            );

            // Get authenticated user with safe error handling
            let user;
            let authError;
            try {
                const result = await supabase.auth.getUser();
                user = result.data.user;
                authError = result.error;
            } catch (err: any) {
                // Catch network errors and other unexpected errors
                if (err?.message?.includes('Failed to fetch') || 
                    err?.name === 'TypeError' ||
                    err?.message?.includes('network')) {
                    logger.error('[API Middleware] Network error during auth check', { 
                        error: err.message,
                        path 
                    });
                    loggers.apiRequest(method, path, undefined, { error: 'network_error' });
                    return errorResponse(AmberErrors.INTERNAL_SERVER_ERROR('Network error during authentication'));
                }
                // Re-throw other errors
                throw err;
            }

            // Network errors should return 500, not 401
            if (authError) {
                if (authError.message?.includes('Failed to fetch') || 
                    authError.message?.includes('NetworkError') ||
                    authError.name === 'NetworkError') {
                    logger.error('[API Middleware] Network error during auth check', { 
                        error: authError.message,
                        path 
                    });
                    loggers.apiRequest(method, path, undefined, { error: 'network_error' });
                    return errorResponse(AmberErrors.INTERNAL_SERVER_ERROR('Network error during authentication'));
                }
                // Other auth errors (expired token, etc.) should return 401
                loggers.apiRequest(method, path, undefined, { error: 'unauthorized' });
                return errorResponse(AmberErrors.UNAUTHORIZED());
            }

            if (!user) {
                loggers.apiRequest(method, path, undefined, { error: 'unauthorized' });
                return errorResponse(AmberErrors.UNAUTHORIZED());
            }

            // Get user profile with role and organization info
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('role, organization_id, store_id')
                .eq('id', user.id)
                .single();

            if (profileError || !profile) {
                logger.error('Profile fetch error', {
                    userId: user.id,
                    error: profileError,
                });
                return errorResponse(AmberErrors.FORBIDDEN());
            }

            // Build context
            const context: ApiContext = {
                user: {
                    id: user.id,
                    role: profile.role || 'staff',
                    organizationId: profile.organization_id || null,
                    storeId: profile.store_id || null,
                },
                supabase,
            };

            // Log request
            loggers.apiRequest(method, path, user.id, {
                role: context.user.role,
                organizationId: context.user.organizationId,
            });

            // Execute handler
            const response = await handler(request, context);

            // Log response
            const duration = Date.now() - startTime;
            loggers.apiResponse(method, path, response.status, duration);

            return response;
        } catch (error) {
            const duration = Date.now() - startTime;
            loggers.error(error, {
                method,
                path,
                duration,
            });

            // Return appropriate error response
            if (error instanceof Error) {
                // Check if it's a known Amber error
                if ('code' in error && 'httpStatus' in error) {
                    return errorResponse(error as any);
                }
            }

            return errorResponse(AmberErrors.INTERNAL_ERROR());
        }
    };
}

/**
 * Middleware wrapper for public endpoints (no authentication required)
 */
export function withPublic(handler: (request: NextRequest) => Promise<NextResponse>) {
    return async (request: NextRequest) => {
        const startTime = Date.now();
        const method = request.method;
        const path = request.nextUrl.pathname;

        try {
            ensureEnvValidated();
            const env = getEnv();

            loggers.apiRequest(method, path, undefined, { public: true });

            const response = await handler(request);

            const duration = Date.now() - startTime;
            loggers.apiResponse(method, path, response.status, duration);

            return response;
        } catch (error) {
            const duration = Date.now() - startTime;
            loggers.error(error, {
                method,
                path,
                duration,
                public: true,
            });

            if (error instanceof Error && 'code' in error && 'httpStatus' in error) {
                return errorResponse(error as any);
            }

            return errorResponse(AmberErrors.INTERNAL_ERROR());
        }
    };
}

/**
 * Helper to create Supabase client for public endpoints
 */
export function createPublicSupabaseClient(request: NextRequest) {
    ensureEnvValidated();
    const env = getEnv();
    
    return createServerClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll() {
                    // Server-side cookie handling
                },
            },
        }
    );
}


