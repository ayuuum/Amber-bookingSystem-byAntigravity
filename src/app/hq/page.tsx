import React from 'react';

export default function HQDashboard() {
    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-bold text-neutral-900 font-outfit">本部ダッシュボード</h1>
                <p className="text-neutral-500 mt-2">全店舗の稼働状況と売上サマリー</p>
            </header>

            {/* 統計カード（モックアップUI） */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl border shadow-sm">
                    <div className="text-sm text-neutral-500 mb-2">総売上 (GMV)</div>
                    <div className="text-3xl font-bold text-neutral-900">¥12,450,000</div>
                    <div className="text-xs text-green-600 mt-2">前月比 +12%</div>
                </div>
                <div className="bg-white p-6 rounded-2xl border shadow-sm">
                    <div className="text-sm text-neutral-500 mb-2">手数料収益 (7%)</div>
                    <div className="text-3xl font-bold text-amber-600">¥871,500</div>
                    <div className="text-xs text-green-600 mt-2">前月比 +12%</div>
                </div>
                <div className="bg-white p-6 rounded-2xl border shadow-sm">
                    <div className="text-sm text-neutral-500 mb-2">アクティブ店舗数</div>
                    <div className="text-3xl font-bold text-neutral-900">42 / 50</div>
                    <div className="text-xs text-neutral-400 mt-2">稼働率 84%</div>
                </div>
                <div className="bg-white p-6 rounded-2xl border shadow-sm">
                    <div className="text-sm text-neutral-500 mb-2">月間予約数</div>
                    <div className="text-3xl font-bold text-neutral-900">1,240</div>
                    <div className="text-xs text-red-600 mt-2">前月比 -2%</div>
                </div>
            </div>

            {/* 店舗ランキング（モックアップUI） */}
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                <div className="p-6 border-b flex justify-between items-center">
                    <h2 className="font-bold text-lg">店舗別パフォーマンス</h2>
                    <button className="text-amber-600 text-sm font-medium">詳細を見る</button>
                </div>
                <table className="w-full text-left">
                    <thead className="bg-neutral-50 text-neutral-500 text-sm uppercase">
                        <tr>
                            <th className="px-6 py-4">店舗名</th>
                            <th className="px-6 py-4 text-right">月間売上</th>
                            <th className="px-6 py-4 text-right">予約数</th>
                            <th className="px-6 py-4 text-center">ステータス</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y text-neutral-700">
                        <tr>
                            <td className="px-6 py-4 font-medium text-neutral-900">Amber 新宿店</td>
                            <td className="px-6 py-4 text-right font-mono">¥2,400,000</td>
                            <td className="px-6 py-4 text-right">240</td>
                            <td className="px-6 py-4 text-center">
                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">優良</span>
                            </td>
                        </tr>
                        <tr>
                            <td className="px-6 py-4 font-medium text-neutral-900">Amber 横浜店</td>
                            <td className="px-6 py-4 text-right font-mono">¥1,850,000</td>
                            <td className="px-6 py-4 text-right">180</td>
                            <td className="px-6 py-4 text-center">
                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">優良</span>
                            </td>
                        </tr>
                        <tr>
                            <td className="px-6 py-4 font-medium text-neutral-900">Amber 渋谷店</td>
                            <td className="px-6 py-4 text-right font-mono">¥1,200,000</td>
                            <td className="px-6 py-4 text-right">120</td>
                            <td className="px-6 py-4 text-center">
                                <span className="px-2 py-1 bg-neutral-100 text-neutral-600 rounded-full text-xs">標準</span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
