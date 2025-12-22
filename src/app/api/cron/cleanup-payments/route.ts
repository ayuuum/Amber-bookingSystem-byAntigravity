/**
 * Cron Job: Cleanup Expired Payment Pending Bookings
 * 
 * This endpoint should be called every minute by a cron service (e.g., Vercel Cron).
 * It cancels bookings that have been in 'pending_payment' status past their expires_at.
 * 
 * PRD Reference: Section 4-1, TTL Rule for pending_payment
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Verify cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: Request) {
    try {
        // Verify authorization
        const authHeader = request.headers.get('authorization');
        if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = await createClient();

        // Call the cleanup function we defined in the migration
        const { data, error } = await supabase.rpc('cleanup_expired_pending_payments');

        if (error) {
            console.error('Cleanup cron error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const affectedCount = data || 0;

        console.log(`[Cron] Cleaned up ${affectedCount} expired pending payments`);

        return NextResponse.json({
            success: true,
            cleaned_up: affectedCount,
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        console.error('Cron job error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// Also support POST for flexibility
export const POST = GET;
