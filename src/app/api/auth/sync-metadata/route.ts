import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * Sync user's profile data to JWT app_metadata
 * This ensures that auth.jwt_*() functions work correctly for RLS policies
 */
export async function POST() {
    try {
        const supabase = await createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user's profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role, organization_id, store_id')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        // Use service role client to update auth.users metadata
        const serviceClient = createServiceRoleClient();
        
        const { error: updateError } = await serviceClient.auth.admin.updateUserById(
            user.id,
            {
                app_metadata: {
                    role: profile.role || 'customer',
                    org_id: profile.organization_id || null,
                    store_id: profile.store_id || null,
                },
            }
        );

        if (updateError) {
            // Log error but don't expose internal details to client
            return NextResponse.json(
                { error: 'Failed to sync metadata' },
                { status: 500 }
            );
        }

        // Refresh session to get new JWT with updated metadata
        const { error: refreshError } = await supabase.auth.refreshSession();

        if (refreshError) {
            // Log error but don't fail the request - metadata is already updated
            // Client will get updated metadata on next request
        }

        return NextResponse.json({ success: true, message: 'Metadata synced successfully' });
    } catch (error: unknown) {
        // Log error but don't expose internal details to client
        const errorMessage = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}


