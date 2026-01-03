/**
 * Audit Log Helper
 * 
 * 監査ログ記録用のヘルパー関数
 * PRD Reference: Section 9-5
 */

export interface AuditLogData {
    organizationId: string;
    storeId?: string;
    operationType: 'booking.created' | 'booking.updated' | 'booking.cancelled' | 'booking.failed';
    entityType: 'booking';
    entityId: string;
    userId?: string;
    metadata?: Record<string, unknown>;
}

/**
 * 監査ログを記録する
 */
export async function logAuditEvent(
    supabase: any,
    data: AuditLogData
): Promise<void> {
    try {
        const { error } = await supabase
            .from('audit_logs')
            .insert({
                organization_id: data.organizationId,
                store_id: data.storeId || null,
                operation_type: data.operationType,
                entity_type: data.entityType,
                entity_id: data.entityId,
                user_id: data.userId || null,
                metadata: data.metadata || {},
            });

        if (error) {
            // 監査ログの記録失敗は予約処理を阻害しない
            console.error('Audit log error:', error);
        }
    } catch (error) {
        // 監査ログの記録失敗は予約処理を阻害しない
        console.error('Audit log exception:', error);
    }
}












