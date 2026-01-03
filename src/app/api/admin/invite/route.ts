import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { AmberErrors, errorResponse } from '@/lib/errors';
import { logger } from '@/lib/logger';

// Generate secure random token
function generateToken(): string {
    return randomBytes(32).toString('hex');
}

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return errorResponse(AmberErrors.UNAUTHORIZED());
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id, role')
            .eq('id', user.id)
            .single();

        if (!profile?.organization_id || profile.role !== 'hq_admin') {
            return errorResponse(AmberErrors.FORBIDDEN());
        }

        const body = await req.json();
        const { email, role, storeId } = body;

        if (!email || !role) {
            return errorResponse(AmberErrors.VALIDATION_ERROR('Emailと役割は必須です。'));
        }

        if (!['store_admin', 'field_staff'].includes(role)) {
            return errorResponse(AmberErrors.VALIDATION_ERROR('無効な役割です。'));
        }

        // Check if user already exists
        const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', email)
            .single();

        if (existingProfile) {
            return errorResponse(AmberErrors.VALIDATION_ERROR('このメールアドレスは既に登録されています。'));
        }

        // Check if there's a pending invitation
        const { data: existingInvite } = await supabase
            .from('invitations')
            .select('id')
            .eq('email', email)
            .eq('organization_id', profile.organization_id)
            .is('accepted_at', null)
            .gt('expires_at', new Date().toISOString())
            .single();

        if (existingInvite) {
            return errorResponse(AmberErrors.VALIDATION_ERROR('このメールアドレスには既に招待が送信されています。'));
        }

        // Generate token and set expiration (7 days)
        const token = generateToken();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        // Create invitation
        const { data: invitation, error: inviteError } = await supabase
            .from('invitations')
            .insert({
                email,
                token,
                organization_id: profile.organization_id,
                store_id: storeId || null,
                role,
                invited_by: user.id,
                expires_at: expiresAt.toISOString(),
            })
            .select()
            .single();

        if (inviteError) {
            logger.error('Invitation creation error', { error: inviteError, email, role });
            return errorResponse(AmberErrors.DATABASE_ERROR(inviteError.message));
        }

        // Send invitation email using Supabase Auth
        // Note: In production, you might want to use a dedicated email service
        const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${token}`;

        // For now, we'll use Supabase Auth's invite function
        // This requires service role key, so we'll return the invite URL for manual sending
        // In production, integrate with Resend, SendGrid, or similar

        return NextResponse.json({
            success: true,
            invitation: {
                id: invitation.id,
                email: invitation.email,
                role: invitation.role,
                expiresAt: invitation.expires_at,
            },
            inviteUrl, // For development/testing - in production, send email automatically
            message: '招待が作成されました。メールを送信してください。',
        });

    } catch (error: any) {
        logger.error('Invite Error', { error });
        return errorResponse(AmberErrors.INTERNAL_ERROR());
    }
}



