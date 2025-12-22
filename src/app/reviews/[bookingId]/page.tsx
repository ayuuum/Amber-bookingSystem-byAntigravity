"use client";

import { useEffect, useState } from "react";
import { Star, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { useParams } from "next/navigation";

export default function ReviewPage() {
    const params = useParams();
    const bookingId = params.bookingId as string;
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [booking, setBooking] = useState<any>(null);

    const supabase = createClient();

    useEffect(() => {
        const fetchBooking = async () => {
            const { data } = await supabase
                .from('bookings')
                .select('*, booking_items(*, services(*))')
                .eq('id', bookingId)
                .single();

            if (data) setBooking(data);
            setLoading(false);
        };
        if (bookingId) fetchBooking();
    }, [bookingId, supabase]);

    const handleSubmit = async () => {
        if (rating === 0) return alert("評価を選択してください");

        const { error: insertError } = await supabase.from('reviews').insert({
            booking_id: bookingId,
            rating,
            comment
        });

        if (!insertError) setSubmitted(true);
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50">Loading...</div>;

    if (submitted) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50">
                <div className="bg-white p-12 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] text-center max-w-md w-full border border-slate-100">
                    <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8">
                        <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h1 className="text-3xl font-black mb-4 text-slate-900">投稿完了</h1>
                    <p className="text-slate-500 font-medium mb-12">
                        貴重なご意見をありがとうございます。<br />
                        またのご利用をスタッフ一同<br />心よりお待ちしております。
                    </p>
                    <Button onClick={() => window.close()} className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-lg">
                        画面を閉じる
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50/50">
            <div className="bg-white p-10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] max-w-md w-full border border-slate-100">
                <div className="text-center mb-10">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500 mb-2 block">Voice of Customer</span>
                    <h1 className="text-3xl font-black mb-3 text-slate-900 leading-tight">サービスの評価</h1>
                    <p className="text-slate-400 font-bold text-xs">
                        {booking?.booking_items?.[0]?.services?.title || '本日のサービス'} はいかがでしたか？
                    </p>
                </div>

                <div className="flex justify-center gap-3 mb-10">
                    {[1, 2, 3, 4, 5].map((s) => (
                        <button
                            key={s}
                            onClick={() => setRating(s)}
                            className="transition-all active:scale-95"
                        >
                            <Star className={`w-12 h-12 transition-colors ${rating >= s ? 'text-amber-400 fill-amber-400' : 'text-slate-100'}`} />
                        </button>
                    ))}
                </div>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-400">コメント (任意)</label>
                        <Textarea
                            placeholder="仕上がりやスタッフの対応など..."
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className="rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-amber-500 font-bold min-h-[120px] p-4 text-slate-900 placeholder:text-slate-300 transition-all"
                        />
                    </div>
                    <Button
                        onClick={handleSubmit}
                        className="w-full h-16 rounded-2xl text-xl font-black bg-amber-500 hover:bg-amber-600 text-white shadow-[0_10px_20px_rgba(245,158,11,0.2)] hover:shadow-[0_15px_30px_rgba(245,158,11,0.3)] hover:translate-y-[-2px] active:translate-y-[0px] transition-all border-none"
                    >
                        評価を送信する
                    </Button>
                </div>
            </div>
        </div>
    );
}
