import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function LawPage() {
    return (
        <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1 container py-12 max-w-4xl">
                <h1 className="text-3xl font-bold mb-8">特定商取引法に基づく表記</h1>

                <section className="space-y-6 text-slate-700 leading-relaxed">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-b pb-4">
                        <div className="font-bold text-slate-900">販売業者</div>
                        <div className="md:col-span-3">株式会社Amber</div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-b pb-4">
                        <div className="font-bold text-slate-900">代表責任者</div>
                        <div className="md:col-span-3">松井 歩武</div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-b pb-4">
                        <div className="font-bold text-slate-900">所在地</div>
                        <div className="md:col-span-3">東京都渋谷区...（以下、省略）</div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-b pb-4">
                        <div className="font-bold text-slate-900">電話番号</div>
                        <div className="md:col-span-3">03-xxxx-xxxx</div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-b pb-4">
                        <div className="font-bold text-slate-900">メールアドレス</div>
                        <div className="md:col-span-3">support@amber-house.jp</div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-b pb-4">
                        <div className="font-bold text-slate-900">販売価格</div>
                        <div className="md:col-span-3">各サービスの予約ページに表示された価格に基づきます。</div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-b pb-4">
                        <div className="font-bold text-slate-900">支払方法</div>
                        <div className="md:col-span-3">クレジットカード決済、現地決済</div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-b pb-4">
                        <div className="font-bold text-slate-900">支払時期</div>
                        <div className="md:col-span-3">クレジットカード決済：予約確定時に決済。現地決済：サービス提供完了時に支払い。</div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-b pb-4">
                        <div className="font-bold text-slate-900">役務の提供時期</div>
                        <div className="md:col-span-3">予約時に指定された日時に提供いたします。</div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-b pb-4">
                        <div className="font-bold text-slate-900">キャンセル・返品</div>
                        <div className="md:col-span-3">
                            サービスの性質上、返品・交換はできません。
                            キャンセルについては、利用規約および店舗ごとのキャンセルポリシーに基づき、所定のキャンセル料が発生する場合があります。
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}
