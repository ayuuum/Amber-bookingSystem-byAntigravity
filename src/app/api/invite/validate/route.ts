import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const token = searchParams.get('token');

        if (!token) {
            return NextResponse.json(
                { error: 'トークンが指定されていません。' },
                { status: 400 }
            );
        }

        const supabase = await createClient();

        const { data: invitation, error } = await supabase
            .from('invitations')
            .select('*')
            .eq('token', token)
            .single();

        if (error || !invitation) {
            return NextResponse.json(
                { error: '招待リンクが見つかりません。' },
                { status: 404 }
            );
        }

        // Check if already accepted
        if (invitation.accepted_at) {
            return NextResponse.json(
                { error: 'この招待は既に承認されています。' },
                { status: 400 }
            );
        }

        // Check if expired
        if (new Date(invitation.expires_at) < new Date()) {
            return NextResponse.json(
                { error: 'この招待リンクの有効期限が切れています。' },
                { status: 400 }
            );
        }

        return NextResponse.json({
            valid: true,
            invitation: {
                email: invitation.email,
                role: invitation.role,
                organization_id: invitation.organization_id,
                store_id: invitation.store_id,
            },
        });

    } catch (error: any) {
        console.error('Invite Validate Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}














