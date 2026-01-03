
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bnsancyvflsdeqtnydpo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJuc2FuY3l2ZmxzZGVxdG55ZHBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3NDIyNTEsImV4cCI6MjA4MTMxODI1MX0.B9Bqzibm0SY9-_Y549ji0TftZHI0d77tKwvPgLLI_XI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
    console.log('Fetching active staff...');
    const { data: staff, error: staffError } = await supabase
        .from('staff')
        .select('id, name')
        .eq('is_active', true);

    if (staffError) {
        console.error('Error fetching staff:', staffError);
        return;
    }

    console.log(`Found ${staff.length} active staff.`);

    const schedules = [];
    for (const member of staff) {
        // Mon (1) to Sat (6)
        for (let day = 1; day <= 6; day++) {
            schedules.push({
                staff_id: member.id,
                day_of_week: day,
                start_time: '09:00:00',
                end_time: '18:00:00'
            });
        }
    }

    console.log(`Inserting ${schedules.length} schedule records...`);

    // UPSERT to avoid duplicates
    const { error: insertError } = await supabase
        .from('staff_schedules')
        .upsert(schedules, { onConflict: 'staff_id,day_of_week' });

    if (insertError) {
        console.error('Error inserting schedules:', insertError);
    } else {
        console.log('Successfully seeded all staff schedules!');
    }
}

seed();
