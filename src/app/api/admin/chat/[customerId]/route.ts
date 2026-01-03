import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendLineMessage } from '@/lib/line/messaging';

/**
 * GET /api/admin/chat/[customerId]
 * Fetch chat history
 */
export async function GET(
    req: Request,
    { params }: { params: { customerId: string } }
) {
    try {
        const supabase = await createClient();
        const { data: messages, error } = await supabase
            .from('line_messages')
            .select('*')
            .eq('customer_id', params.customerId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        return NextResponse.json(messages);
    } catch (error: any) {
        console.error('Chat History Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * POST /api/admin/chat/[customerId]
 * Send a message to the customer
 */
export async function POST(
    req: Request,
    { params }: { params: { customerId: string } }
) {
    try {
        const supabase = await createClient();
        const { content } = await req.json();

        // 1. Get Customer's LINE User ID
        const { data: customer, error: custError } = await supabase
            .from('customers')
            .select('line_user_id, organization_id')
            .eq('id', params.customerId)
            .single();

        if (custError || !customer?.line_user_id) {
            return NextResponse.json({ error: 'Customer not found or not linked to LINE' }, { status: 404 });
        }

        // 2. Send via LINE Messaging API
        await sendLineMessage(customer.line_user_id, [{
            type: 'text',
            text: content
        }]);

        // 3. Save to line_messages DB
        const { data: newMessage, error: msgError } = await supabase
            .from('line_messages')
            .insert({
                organization_id: customer.organization_id,
                customer_id: params.customerId,
                sender_type: 'admin',
                content: content
            })
            .select()
            .single();

        if (msgError) throw msgError;

        return NextResponse.json(newMessage);
    } catch (error: any) {
        console.error('Send Chat Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
