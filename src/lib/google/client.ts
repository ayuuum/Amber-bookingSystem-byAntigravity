import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

export function getGoogleCalendarClient() {
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!clientEmail || !privateKey) {
        console.error('Missing Google Service Account credentials');
        return null;
    }

    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: clientEmail,
            private_key: privateKey,
        },
        scopes: SCOPES,
    });

    return google.calendar({ version: 'v3', auth });
}
