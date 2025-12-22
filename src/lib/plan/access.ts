import { createClient } from '@/lib/supabase/server';

export type PlanType = 'starter' | 'growth' | 'enterprise';

export interface PlanAccess {
    canUseLine: boolean;
    canUseAnalytics: boolean;
    canUseGoogleCalendar: boolean;
    canUseAiBooking: boolean;
}

const PLAN_FEATURES: Record<PlanType, PlanAccess> = {
    starter: {
        canUseLine: false,
        canUseAnalytics: false,
        canUseGoogleCalendar: false,
        canUseAiBooking: false,
    },
    growth: {
        canUseLine: true,
        canUseAnalytics: true,
        canUseGoogleCalendar: true,
        canUseAiBooking: false,
    },
    enterprise: {
        canUseLine: true,
        canUseAnalytics: true,
        canUseGoogleCalendar: true,
        canUseAiBooking: true,
    },
};

export async function getPlanAccess(orgId: string): Promise<PlanAccess> {
    const supabase = await createClient();

    const { data: org, error } = await supabase
        .from('organizations')
        .select('plan_type')
        .eq('id', orgId)
        .single();

    if (error || !org) {
        console.error('Error fetching plan access:', error);
        return PLAN_FEATURES.starter; // Fallback to safest
    }

    return PLAN_FEATURES[org.plan_type as PlanType] || PLAN_FEATURES.starter;
}

export async function checkResourceLimit(orgId: string, resource: 'stores' | 'staff' | 'house_assets'): Promise<{ allowed: boolean; current: number; limit: number }> {
    const supabase = await createClient();

    // 1. Get Limits
    const { data: org } = await supabase
        .from('organizations')
        .select('max_stores, max_staff, max_house_assets')
        .eq('id', orgId)
        .single();

    if (!org) return { allowed: false, current: 0, limit: 0 };

    let current = 0;
    let limit = 0;

    // 2. Count Current Usage
    if (resource === 'stores') {
        const { count } = await supabase.from('stores').select('*', { count: 'exact', head: true }).eq('organization_id', orgId);
        current = count || 0;
        limit = org.max_stores;
    } else if (resource === 'staff') {
        const { count } = await supabase.from('staff').select('*', { count: 'exact', head: true }).eq('organization_id', orgId);
        current = count || 0;
        limit = org.max_staff;
    } else if (resource === 'house_assets') {
        const { count } = await supabase.from('house_assets').select('*, customers!inner(*)', { count: 'exact', head: true }).eq('customers.organization_id', orgId);
        current = count || 0;
        limit = org.max_house_assets;
    }

    return {
        allowed: current < limit,
        current,
        limit
    };
}

export async function validateFeatureAccess(orgId: string, feature: keyof PlanAccess): Promise<boolean> {
    const access = await getPlanAccess(orgId);
    return !!access[feature];
}
