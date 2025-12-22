
const { createClient } = require('@supabase/supabase-js');

// Mock Env
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://bnsancyvflsdeqtnydpo.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJuc2FuY3l2ZmxzZGVxdG55ZHBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3NDIyNTEsImV4cCI6MjA4MTMxODI1MX0.B9Bqzibm0SY9-_Y549ji0TftZHI0d77tKwvPgLLI_XI';

async function verify() {
    console.log('--- STARTING VERIFICATION ---');

    console.log('1. Testing ADMIN SECURITY middleware...');
    try {
        const res = await fetch('http://localhost:3000/admin/settings', { redirect: 'manual' });
        console.log(`Access /admin/settings: Status ${res.status} (Expected 307/302 to /login for unauth)`);
        if (res.status === 307 || res.status === 302) console.log('PASS: Redirected');
        else console.log('FAIL: Auth check missing?');
    } catch (e) { console.error('Connection failed (server running?)', e.message); }

    console.log('\n2. Testing AVAILABILITY API (Business Hours)...');
    try {
        // Assume today is Wednesday (open). 
        // We will mock the request.
        const res = await fetch('http://localhost:3000/api/availability', {
            method: 'POST',
            body: JSON.stringify({ date: '2025-12-25', serviceId: 'dummy' }), // 2025-12-25 is Thursday
        });
        const json = await res.json();
        console.log('Availability Result (Thu):', Array.isArray(json) ? `Slots found: ${json.length}` : json);
    } catch (e) { console.error(e.message); }

    console.log('\n3. Testing API EXISTENCE...');
    const endpoints = [
        '/api/line/webhook',
        '/api/bookings',
        '/admin/staff' // Page
    ];
    for (const ep of endpoints) {
        const r = await fetch(`http://localhost:3000${ep}`, { method: 'HEAD' });
        // HEAD on API might be 405 (Method Not Allowed) but means it exists. 404 means missing.
        console.log(`Endpoint ${ep}: ${r.status}`);
    }
}

verify();
