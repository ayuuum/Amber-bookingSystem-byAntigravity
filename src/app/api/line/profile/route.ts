import { createServiceRoleClient } from '@/lib/supabase/server';
import { AmberErrors, errorResponse } from '@/lib/errors';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * POST /api/line/profile
 * LINEプロフィール取得・保存
 * LIFFから呼び出し、customersテーブルにline_user_idとプロフィール情報を保存
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { line_user_id, display_name, picture_url, organization_id, store_id } = body;

        if (!line_user_id || !organization_id || !store_id) {
            return errorResponse(AmberErrors.VALIDATION_ERROR('line_user_id, organization_id, store_id are required'));
        }

        const supabase = createServiceRoleClient();

        // 既存の顧客を検索（line_user_idまたはphoneで）
        const { data: existingCustomer } = await supabase
            .from('customers')
            .select('id, line_user_id, phone')
            .eq('organization_id', organization_id)
            .eq('store_id', store_id)
            .or(`line_user_id.eq.${line_user_id},phone.eq.${body.phone || ''}`)
            .limit(1)
            .maybeSingle();

        if (existingCustomer) {
            // 既存顧客を更新
            const { data: updated, error: updateError } = await supabase
                .from('customers')
                .update({
                    line_user_id: line_user_id,
                    full_name: display_name || existingCustomer.full_name,
                    // line_display_nameとline_picture_urlはマイグレーション後に追加
                })
                .eq('id', existingCustomer.id)
                .select()
                .single();

            if (updateError) {
                logger.error('Failed to update customer with LINE profile', {
                    error: updateError,
                    customerId: existingCustomer.id,
                    lineUserId: line_user_id,
                });
                return errorResponse(AmberErrors.DATABASE_ERROR(updateError.message));
            }

            return NextResponse.json({ customer: updated, created: false });
        } else {
            // 新規顧客を作成
            const { data: newCustomer, error: insertError } = await supabase
                .from('customers')
                .insert({
                    organization_id,
                    store_id,
                    line_user_id: line_user_id,
                    full_name: display_name || 'LINE User',
                    phone: body.phone || 'LINE_Linked',
                    email: body.email || null,
                    address: body.address || null,
                })
                .select()
                .single();

            if (insertError) {
                logger.error('Failed to create customer with LINE profile', {
                    error: insertError,
                    lineUserId: line_user_id,
                    organizationId: organization_id,
                    storeId: store_id,
                });
                return errorResponse(AmberErrors.DATABASE_ERROR(insertError.message));
            }

            return NextResponse.json({ customer: newCustomer, created: true });
        }
    } catch (error: any) {
        logger.error('LINE profile API error', { error });
        return errorResponse(AmberErrors.INTERNAL_ERROR());
    }
}

