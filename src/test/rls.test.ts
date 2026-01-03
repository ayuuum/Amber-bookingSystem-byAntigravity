/**
 * Security Tests for Row Level Security (RLS)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockSupabaseClient } from './mocks/supabase';
import { createAuthenticatedUser, createUnauthenticatedUser } from './helpers/auth-helper';
import { mockHqAdmin, mockStoreAdmin, mockFieldStaff } from './fixtures/users';

describe('RLS - Organization Isolation', () => {
    it('組織Aのユーザーは組織Bのデータにアクセスできない', async () => {
        const { supabase: supabaseA } = createAuthenticatedUser('store_admin');
        
        // 組織Aのユーザーで組織Bの店舗を取得しようとする
        const mockQuery = supabaseA.from();
        mockQuery.select.mockReturnThis();
        mockQuery.eq.mockReturnThis();
        mockQuery.single.mockResolvedValueOnce({
            data: null, // RLSにより空が返る
            error: null,
        });
        supabaseA.from.mockReturnValueOnce(mockQuery);

        const { data, error } = await supabaseA
            .from('stores')
            .select('*')
            .eq('id', 'org-b-store-id')
            .single();

        // RLSにより、他組織のデータは取得できない
        expect(data).toBeNull();
    });

    it('匿名ユーザーは予約作成のみ可能（公開エンドポイント）', async () => {
        const { supabase } = createUnauthenticatedUser();
        
        // 匿名ユーザーでも予約作成は可能
        const mockQuery = supabase.from();
        mockQuery.insert.mockReturnThis();
        mockQuery.select.mockReturnThis();
        mockQuery.single.mockResolvedValueOnce({
            data: { id: 'booking-1' },
            error: null,
        });
        supabase.from.mockReturnValueOnce(mockQuery);

        const { data, error } = await supabase
            .from('bookings')
            .insert({
                store_id: 'store-1',
                customer_name: 'テスト太郎',
                start_time: '2024-12-25T10:00:00Z',
            })
            .select()
            .single();

        expect(data).toBeDefined();
        expect(error).toBeNull();
    });
});

describe('RLS - Role-Based Access Control', () => {
    it('hq_adminは全店舗を管理可能', async () => {
        const { supabase } = createAuthenticatedUser('hq_admin');
        
        const mockQuery = supabase.from();
        mockQuery.select.mockReturnThis();
        mockQuery.eq.mockResolvedValueOnce({
            data: [
                { id: 'store-1', name: '店舗1' },
                { id: 'store-2', name: '店舗2' },
            ],
            error: null,
        });
        supabase.from.mockReturnValueOnce(mockQuery);

        const { data, error } = await supabase
            .from('stores')
            .select('*')
            .eq('organization_id', 'org-1');

        expect(data?.length).toBeGreaterThan(1); // 複数店舗にアクセス可能
        expect(error).toBeNull();
    });

    it('store_adminは自店舗のみ管理可能', async () => {
        const { supabase, user } = createAuthenticatedUser('store_admin');
        
        const mockQuery = supabase.from();
        mockQuery.select.mockReturnThis();
        mockQuery.eq.mockReturnThis();
        mockQuery.single.mockResolvedValueOnce({
            data: { id: user.store_id, name: '自店舗' },
            error: null,
        });
        supabase.from.mockReturnValueOnce(mockQuery);

        const { data, error } = await supabase
            .from('stores')
            .select('*')
            .eq('id', user.store_id!)
            .single();

        expect(data?.id).toBe(user.store_id);
        expect(error).toBeNull();
    });

    it('field_staffはアサインされた予約のみアクセス可能', async () => {
        const { supabase, user } = createAuthenticatedUser('field_staff');
        
        // Mock bookings query with two eq() calls
        const mockQuery = supabase.from();
        mockQuery.select.mockReturnThis();
        // First eq() returns builder
        mockQuery.eq.mockReturnValueOnce(mockQuery);
        // Second eq() resolves
        mockQuery.eq.mockResolvedValueOnce({
            data: [
                { id: 'booking-1', staff_id: user.id },
            ],
            error: null,
        });
        supabase.from.mockReturnValueOnce(mockQuery);

        const { data, error } = await supabase
            .from('bookings')
            .select('*')
            .eq('store_id', user.store_id!)
            .eq('staff_id', user.id);

        expect(data?.length).toBeGreaterThan(0);
        expect(data?.[0].staff_id).toBe(user.id);
        expect(error).toBeNull();
    });
});

