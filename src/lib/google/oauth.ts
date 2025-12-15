import { google } from 'googleapis';

export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
export const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

console.log('[OAuth Debug] Loading Credentials...');
console.log('[OAuth Debug] GOOGLE_CLIENT_ID exists:', !!process.env.GOOGLE_CLIENT_ID);
console.log('[OAuth Debug] GOOGLE_CLIENT_SECRET exists:', !!process.env.GOOGLE_CLIENT_SECRET);
console.log('[OAuth Debug] NEXT_PUBLIC_BASE_URL:', process.env.NEXT_PUBLIC_BASE_URL);

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.error('[OAuth Error] Missing Google OAuth credentials');
}

export const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    `${BASE_URL}/api/auth/google/callback`
);

const SCOPES = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
];

export function getAuthUrl(state?: string) {
    return oauth2Client.generateAuthUrl({
        access_type: 'offline', // Required to get refresh_token
        scope: SCOPES,
        prompt: 'consent', // Force consent to ensure refresh_token is returned
        state,
        redirect_uri: `${BASE_URL}/api/auth/google/callback`,
    });
}
