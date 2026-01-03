/**
 * Invitation Management API
 * 
 * DELETE /api/admin/invites/[id] - 招待の取り消し
 */

import { createClient } from '@/lib/supabase/server';
import { AmberErrors, errorResponse } from '@/lib/errors';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middleware';

interface RouteParams {
    params: Promise<{ id: string }>;
}

async function deleteHandler(request: NextRequest, context: any, invitationId: string) {
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

        // Check if invitation exists and belongs to the organization
        const { data: invitation, error: fetchError } = await supabase
            .from('invitations')
            .select('id, organization_id')
            .eq('id', invitationId)
            .eq('organization_id', profile.organization_id)
            .single();

        if (fetchError || !invitation) {
            return errorResponse(AmberErrors.NOT_FOUND('招待'));
        }

        // Delete the invitation
        const { error: deleteError } = await supabase
            .from('invitations')
            .delete()
            .eq('id', invitationId);

        if (deleteError) {
            return errorResponse(AmberErrors.DATABASE_ERROR(deleteError.message));
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return errorResponse(AmberErrors.INTERNAL_ERROR());
    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    const handler = async (req: NextRequest, context: any) => {
        const { id } = await params;
        return deleteHandler(req, context, id);
    };
    return withAuth(handler)(request);
}

