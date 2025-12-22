import React from 'react';

export default function HQBilling() {
    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-bold text-neutral-900 font-outfit">請求・精算管理</h1>
                <p className="text-neutral-500 mt-2">店舗別ロイヤリティ（7%）の集計と請求書発行</p>
            </header>

            <div className="bg-white rounded-2xl border shadow-sm p-6 overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex gap-4 items-center">
                        <h2 className="font-bold text-lg">2024年12月度 請求一覧</h2>
                        <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">未確定</span>
                    </div>
                    <button className="bg-amber-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-amber-200 hover:bg-amber-700 transition-all">
                        請求書を一括発行
                    </button>
                </div>

                <table className="w-full text-left">
                    <thead className="bg-neutral-50 text-neutral-500 text-sm">
                        <tr>
                            <th className="px-6 py-4">店舗名</th>
                            <th className="px-6 py-4 text-right">完了GMV</th>
                            <th className="px-6 py-4 text-right">本部手数料 (7%)</th>
                            <th className="px-6 py-4 text-center">支払状況</th>
                            <th className="px-6 py-4 text-center">アクション</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y text-neutral-700">
                        <tr>
                            <td className="px-6 py-4 font-medium text-neutral-900">Amber 新宿店</td>
                            <td className="px-6 py-4 text-right">¥2,400,000</td>
                            <td className="px-6 py-4 text-right font-bold text-amber-600">¥168,000</td>
                            <td className="px-6 py-4 text-center">
                                <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">未入金</span>
                            </td>
                            <td className="px-6 py-4 text-center text-amber-600 font-medium hover:underline cursor-pointer">
                                請求書表示
                            </td>
                        </tr>
                        <tr>
                            <td className="px-6 py-4 font-medium text-neutral-900">Amber 横浜店</td>
                            <td className="px-6 py-4 text-right">¥1,850,000</td>
                            <td className="px-6 py-4 text-right font-bold text-amber-600">¥129,500</td>
                            <td className="px-6 py-4 text-center">
                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">入金済</span>
                            </td>
                            <td className="px-6 py-4 text-center text-amber-600 font-medium hover:underline cursor-pointer">
                                領収書表示
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
