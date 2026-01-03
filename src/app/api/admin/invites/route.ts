/**
 * Invitations Management API
 * 
 * GET /api/admin/invites - 送信済み招待一覧取得
 * DELETE /api/admin/invites/[id] - 招待の取り消し
 */

import { createClient } from '@/lib/supabase/server';
import { AmberErrors, errorResponse } from '@/lib/errors';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middleware';

async function getHandler(request: NextRequest, context: any) {
    try {
        const { supabase, user } = context;

        const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id, role')
            .eq('id', user.id)
            .single();

        if (!profile?.organization_id) {
            return errorResponse(AmberErrors.AUTH_ORG_ACCESS_DENIED());
        }

        // Get all invitations for the organization
        const { data: invitations, error } = await supabase
            .from('invitations')
            .select(`
                *,
                store:store_id (id, name),
                inviter:invited_by (id, email)
            `)
            .eq('organization_id', profile.organization_id)
            .order('created_at', { ascending: false });

        if (error) {
            return errorResponse(AmberErrors.DATABASE_ERROR(error.message));
        }

        return NextResponse.json({ invitations: invitations || [] });
    } catch (error: any) {
        return errorResponse(AmberErrors.INTERNAL_ERROR());
    }
}

export const GET = withAuth(getHandler);

