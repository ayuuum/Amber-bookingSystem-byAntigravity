import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function HQLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    
    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        // Network errors in server components are rare, but handle gracefully
        if (authError) {
            if (authError.message?.includes('Failed to fetch') || 
                authError.message?.includes('NetworkError') ||
                authError.name === 'NetworkError') {
                console.error('[HQLayout] Network error during auth check:', authError.message);
                // On network errors, redirect to login to prevent infinite loops
                redirect('/login');
            }
            // Other auth errors should redirect
            redirect('/login');
        }

        if (!user) {
            redirect('/login');
        }

        // 権限チェック
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        // Network errors on profile fetch should redirect to prevent issues
        if (profileError) {
            if (profileError.message?.includes('Failed to fetch') || 
                profileError.message?.includes('NetworkError')) {
                console.error('[HQLayout] Network error during profile check:', profileError.message);
                redirect('/login');
            }
        }

        if (profile?.role !== 'hq_admin') {
            redirect('/admin'); // 店舗管理者画面へリダイレクト
        }
    } catch (err: any) {
        // Catch any unexpected errors
        if (err?.message?.includes('Failed to fetch') || 
            err?.name === 'TypeError' ||
            err?.message?.includes('network')) {
            console.error('[HQLayout] Network error during auth check:', err.message);
        } else {
            console.error('[HQLayout] Auth check error:', err);
        }
        redirect('/login');
    }

    return (
        <div className="min-h-screen bg-neutral-50">
            <div className="flex">
                {/* サイドバー（HQ専用） */}
                <aside className="w-64 bg-white border-r h-screen sticky top-0 p-6">
                    <div className="mb-10 text-2xl font-bold text-amber-600">Amber HQ</div>
                    <nav className="space-y-2">
                        <a href="/hq" className="block px-4 py-2 rounded-lg hover:bg-amber-50 text-neutral-700">ダッシュボード</a>
                        <a href="/hq/stores" className="block px-4 py-2 rounded-lg hover:bg-amber-50 text-neutral-700">店舗管理</a>
                        <a href="/hq/analytics" className="block px-4 py-2 rounded-lg hover:bg-amber-50 text-neutral-700">横断分析</a>
                        <a href="/hq/billing" className="block px-4 py-2 rounded-lg hover:bg-amber-50 text-neutral-700">請求・精算</a>
                        <a href="/admin" className="block px-4 py-2 mt-10 text-sm text-neutral-500 hover:text-amber-600">店舗管理画面へ</a>
                    </nav>
                </aside>

                {/* メインコンテンツ */}
                <main className="flex-1 p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
