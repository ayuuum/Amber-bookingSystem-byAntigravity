import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const supabase = await createClient();

        const status: any = {
            timestamp: new Date().toISOString(),
            tables: {},
            functions: {},
            policies: {},
            errors: []
        };

        // 1. Check tables and their data
        const tables = ['organizations', 'stores', 'services', 'staff', 'profiles'];
        
        for (const table of tables) {
            try {
                const { data, error, count } = await supabase
                    .from(table)
                    .select('*', { count: 'exact', head: false })
                    .limit(5);

                status.tables[table] = {
                    exists: !error || error.code !== 'PGRST116',
                    rowCount: count || 0,
                    sampleData: data || [],
                    error: error ? error.message : null
                };
            } catch (err: any) {
                status.tables[table] = {
                    exists: false,
                    error: err.message
                };
                status.errors.push(`Table ${table}: ${err.message}`);
            }
        }

        // 2. Check if RPC function exists
        try {
            const { data, error } = await supabase.rpc('seed_demo_data');
            status.functions['seed_demo_data'] = {
                exists: !error,
                error: error ? error.message : null
            };
        } catch (err: any) {
            status.functions['seed_demo_data'] = {
                exists: false,
                error: err.message
            };
        }

        // 3. Check organizations table structure (slug column)
        try {
            const { data: orgs } = await supabase
                .from('organizations')
                .select('*')
                .limit(1);
            
            if (orgs && orgs.length > 0) {
                status.tables['organizations'].hasSlugColumn = 'slug' in orgs[0];
            } else {
                // Try to check schema by attempting to select slug
                const { error: slugError } = await supabase
                    .from('organizations')
                    .select('slug')
                    .limit(0);
                status.tables['organizations'].hasSlugColumn = !slugError;
            }
        } catch (err: any) {
            status.tables['organizations'].hasSlugColumn = false;
        }

        // 4. Check stores table structure
        try {
            const { data: stores } = await supabase
                .from('stores')
                .select('*')
                .limit(1);
            
            if (stores && stores.length > 0) {
                status.tables['stores'].hasSlugColumn = 'slug' in stores[0];
                status.tables['stores'].hasOrgIdColumn = 'organization_id' in stores[0];
            }
        } catch (err: any) {
            // Ignore
        }

        return NextResponse.json(status, { status: 200 });

    } catch (error: any) {
        return NextResponse.json({ 
            error: error.message,
            stack: error.stack 
        }, { status: 500 });
    }
}














