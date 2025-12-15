import { getAuthUrl } from '@/lib/google/oauth';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const returnUrl = searchParams.get('returnUrl') || '/admin/settings';

    // We can pass state to persist specific store ID or return URL
    // For MVP single store, we just pass returnUrl
    const url = getAuthUrl(returnUrl);
    console.log('[OAuth Debug] Generated Auth URL:', url);
    console.log('[OAuth Debug] Redirect URI used in generation:', `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/auth/google/callback`);

    return NextResponse.redirect(url);
}
