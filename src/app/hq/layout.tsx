import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AdminNavbar from '@/components/layout/AdminNavbar'; // 既存のコンポーネントを流用

export default async function HQLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // 権限チェック
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'super_admin') {
        redirect('/admin'); // 店舗管理者画面へリダイレクト
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
