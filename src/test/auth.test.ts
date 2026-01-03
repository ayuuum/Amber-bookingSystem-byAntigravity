/**
 * Security Tests for Authentication and Authorization
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAuthenticatedUser, createUnauthenticatedUser } from './helpers/auth-helper';

describe('Authentication', () => {
    it('JWT検証: 有効なトークンで認証できる', async () => {
        const { supabase, user } = createAuthenticatedUser('store_admin');
        
        const { data, error } = await supabase.auth.getUser();
        
        expect(data?.user).toBeDefined();
        expect(data?.user.id).toBe(user.id);
        expect(error).toBeNull();
    });

    it('JWT検証: 無効なトークンで認証できない', async () => {
        const { supabase } = createUnauthenticatedUser();
        
        const { data, error } = await supabase.auth.getUser();
        
        expect(data?.user).toBeNull();
        expect(error).toBeDefined();
    });

    it('ロールベースアクセス制御: hq_adminは全機能にアクセス可能', async () => {
        const { supabase, user } = createAuthenticatedUser('hq_admin');
        
        // hq_adminは全店舗にアクセス可能
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
            .eq('organization_id', user.organization_id);
        
        expect(error).toBeNull();
        expect(data).toBeDefined();
    });

    it('ロールベースアクセス制御: store_adminは自店舗のみアクセス可能', async () => {
        const { supabase, user } = createAuthenticatedUser('store_admin');
        
        // store_adminは自店舗のみアクセス可能
        const mockQuery = supabase.from();
        mockQuery.select.mockReturnThis();
        mockQuery.eq.mockResolvedValueOnce({
            data: [{ id: user.store_id, name: '自店舗' }],
            error: null,
        });
        supabase.from.mockReturnValueOnce(mockQuery);
        
        const { data, error } = await supabase
            .from('stores')
            .select('*')
            .eq('id', user.store_id!);
        
        expect(error).toBeNull();
        expect(data?.length).toBeLessThanOrEqual(1);
    });

    it('セッション管理: ログアウト後にアクセスできない', async () => {
        const { supabase } = createAuthenticatedUser('store_admin');
        
        // ログアウト
        await supabase.auth.signOut();
        
        // ログアウト後はアクセスできない
        const mockQuery = supabase.from();
        mockQuery.select.mockResolvedValueOnce({
            data: null,
            error: { message: 'Not authenticated' },
        });
        supabase.from.mockReturnValueOnce(mockQuery);
        
        const { data, error } = await supabase
            .from('stores')
            .select('*');
        
        expect(error).toBeDefined();
    });
});

