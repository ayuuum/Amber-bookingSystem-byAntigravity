import { createClient } from '@/lib/supabase/server';
import { oauth2Client } from '@/lib/google/oauth';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state') || '/admin/settings'; // returnUrl
    const error = searchParams.get('error');

    if (error) {
        return NextResponse.redirect(new URL(`/admin/settings?error=${error}`, request.url));
    }

    if (!code) {
        return NextResponse.redirect(new URL('/admin/settings?error=no_code', request.url));
    }

    try {
        const { tokens } = await oauth2Client.getToken(code);

        // Save tokens to DB
        // For Single Store MVP, we update the first store found (or identified by context)
        const supabase = await createClient();

        // 1. Find the store (Assume single store for now)
        const { data: store, error: storeError } = await supabase
            .from('stores')
            .select('id')
            .limit(1)
            .single();

        if (storeError || !store) {
            throw new Error('Store not found');
        }

        // 2. Update tokens
        const { error: updateError } = await supabase
            .from('stores')
            .update({
                google_refresh_token: tokens.refresh_token, // Only returned on first consent or force prompt
                google_access_token: tokens.access_token,
                google_token_expiry: tokens.expiry_date,
            })
            .eq('id', store.id);

        if (updateError) {
            throw updateError;
        }

        return NextResponse.redirect(new URL(state, request.url)); // Redirect back to settings

    } catch (error) {
        console.error('OAuth Callback Error:', error);
        return NextResponse.redirect(new URL('/admin/settings?error=callback_failed', request.url));
    }
}
