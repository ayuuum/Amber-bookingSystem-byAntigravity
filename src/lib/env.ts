/**
 * Environment Variable Validation
 * 
 * Validates all required environment variables at application startup.
 * Fails fast if any required variables are missing or invalid.
 */

import { z } from 'zod';

const envSchema = z.object({
    // Supabase
    NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),

    // Stripe
    STRIPE_SECRET_KEY: z.string().startsWith('sk_', 'STRIPE_SECRET_KEY must start with sk_'),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_', 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must start with pk_'),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),

    // LINE (optional, required for Growth+ plans)
    LINE_CHANNEL_ACCESS_TOKEN: z.string().optional(),
    LINE_CHANNEL_SECRET: z.string().optional(),

    // Google Calendar (optional, required for Growth+ plans)
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),

    // Application
    NEXT_PUBLIC_APP_URL: z.string().url('NEXT_PUBLIC_APP_URL must be a valid URL'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

    // Logging
    LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).optional(),
    LOG_FILE_PATH: z.string().optional(),

    // Cron jobs (optional)
    CRON_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let validatedEnv: Env | null = null;

/**
 * Validates environment variables and returns typed env object.
 * Should be called once at application startup.
 */
export function validateEnv(): Env {
    if (validatedEnv) {
        return validatedEnv;
    }

    try {
        validatedEnv = envSchema.parse(process.env);
        return validatedEnv;
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errorMessages = error.errors.map((err) => {
                const path = err.path.join('.');
                return `  - ${path}: ${err.message}`;
            }).join('\n');
            
            const fullErrorMessage = `❌ 環境変数の検証に失敗しました:\n\n${errorMessages}\n\n必要な環境変数を .env.local に設定してください。`;
            
            // Edge Runtime互換: process.exitは使用しない
            // エラーをログに記録し、throwする
            console.error(fullErrorMessage);
            
            // Edge Runtimeではprocess.exitを使用できないため、エラーをthrowする
            // Node.js Runtimeでもエラーをthrowすることで、統一的なエラーハンドリングが可能
            throw new Error(fullErrorMessage);
        }
        throw error;
    }
}

/**
 * Get validated environment variables.
 * Throws if validation hasn't been run yet.
 */
export function getEnv(): Env {
    if (!validatedEnv) {
        throw new Error('Environment variables not validated. Call validateEnv() first.');
    }
    return validatedEnv;
}

/**
 * Validate environment variables in server-side code.
 * Should be called in middleware or API routes.
 */
export function ensureEnvValidated(): void {
    if (typeof window === 'undefined' && !validatedEnv) {
        validateEnv();
    }
}


