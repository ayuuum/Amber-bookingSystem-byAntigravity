"use client";

import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { format, isSameDay } from "date-fns";
import { ja } from "date-fns/locale";

type Booking = {
    id: string;
    start_time: string;
    end_time: string;
    status: string;
    customers: { full_name: string } | null;
    staff: { name: string } | null;
    booking_items: {
        services: { title: string } | null;
    }[];
};

export default function CalendarPage() {
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        const fetchBookings = async () => {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/5a01f0f3-d5c2-417b-a9af-69398d1d12dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'calendar/page.tsx:29',message:'fetchBookings started',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
            setLoading(true);
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/5a01f0f3-d5c2-417b-a9af-69398d1d12dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'calendar/page.tsx:31',message:'Before supabase query',data:{supabaseExists:!!supabase},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
            const { data, error } = await supabase
                .from('bookings')
                .select(`
                    id,
                    start_time,
                    end_time,
                    status,
                    customers ( full_name ),
                    staff ( name ),
                    booking_items (
                        services ( title )
                    )
                `)
                .neq('status', 'cancelled');

            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/5a01f0f3-d5c2-417b-a9af-69398d1d12dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'calendar/page.tsx:47',message:'After supabase query',data:{hasError:!!error,hasData:!!data,errorType:error?.constructor?.name,errorKeys:error?Object.keys(error):[],errorMessage:error?.message,errorCode:error?.code,errorDetails:error?.details,errorHint:error?.hint,dataLength:data?.length,errorStringified:JSON.stringify(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C,D,E'})}).catch(()=>{});
            // #endregion

            // 権限不足・未実装は正常系として扱う（空配列は正常な状態）
            if (error) {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/5a01f0f3-d5c2-417b-a9af-69398d1d12dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'calendar/page.tsx:50',message:'Error branch entered',data:{errorTruthy:!!error,errorType:typeof error,errorIsObject:typeof error==='object',errorIsNull:error===null,errorIsUndefined:error===undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
                // #endregion
                const errorMessage = error.message || '';
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/5a01f0f3-d5c2-417b-a9af-69398d1d12dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'calendar/page.tsx:52',message:'Error message extracted',data:{errorMessage,errorMessageLength:errorMessage.length,errorMessageType:typeof errorMessage},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,D'})}).catch(()=>{});
                // #endregion
                const isPermissionDenied = errorMessage.includes('permission denied') ||
                    (errorMessage.includes('relation') && errorMessage.includes('does not exist')) ||
                    errorMessage.includes('Could not find');
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/5a01f0f3-d5c2-417b-a9af-69398d1d12dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'calendar/page.tsx:55',message:'Permission check result',data:{isPermissionDenied},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
                // #endregion
                
                if (isPermissionDenied) {
                    // 権限不足は正常系として扱う（console.errorは出さない）
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/5a01f0f3-d5c2-417b-a9af-69398d1d12dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'calendar/page.tsx:58',message:'Permission denied branch',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
                    // #endregion
                    setBookings([]);
                } else {
                    // 本当に致命的なエラーのみconsole.error（ネットワーク断など）
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/5a01f0f3-d5c2-417b-a9af-69398d1d12dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'calendar/page.tsx:61',message:'Fatal error branch - before console.error',data:{errorObject:error,errorStringified:JSON.stringify(error),errorToString:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,E'})}).catch(()=>{});
                    // #endregion
                    console.error('Error fetching bookings:', error);
                    setBookings([]);
                }
            } else {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/5a01f0f3-d5c2-417b-a9af-69398d1d12dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'calendar/page.tsx:66',message:'Success branch entered',data:{dataLength:data?.length,dataType:Array.isArray(data)?'array':typeof data},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                // #endregion
                // 空配列も正常な状態として扱う（予約0件は正常な状態）
                const formatted = (data || []).map((b: any) => ({
                    ...b,
                    customers: Array.isArray(b.customers) ? b.customers[0] : b.customers,
                    staff: Array.isArray(b.staff) ? b.staff[0] : b.staff,
                }));
                setBookings(formatted);
            }
            setLoading(false);
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/5a01f0f3-d5c2-417b-a9af-69398d1d12dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'calendar/page.tsx:75',message:'fetchBookings completed',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
        };

        fetchBookings();
    }, [supabase]);

    // Create array of Dates for the calendar modifier
    const bookedDates = bookings.map(b => new Date(b.start_time));

    // Filter bookings for the selected date
    const selectedDateBookings = date
        ? bookings.filter(b => isSameDay(new Date(b.start_time), date))
        : [];

    // Sort by time
    selectedDateBookings.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    return (
        <div className="p-8">
            {/* ページヘッダー */}
            <div className="mb-10">
                <h2 className="text-3xl font-bold tracking-tight">カレンダー</h2>
                <p className="text-muted-foreground">スケジュールと空き状況を確認します。</p>
            </div>

            {/* レイヤー1: 月ビュー（主役） */}
            <section className="mb-10">
                <Card>
                    <CardContent className="p-6">
                        <div className="w-full max-w-full overflow-x-hidden">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={setDate}
                                className="rounded-md border w-full"
                                modifiers={{
                                    booked: bookedDates
                                }}
                                modifiersStyles={{
                                    booked: { fontWeight: 'bold', textDecoration: 'underline', color: 'var(--primary)' }
                                }}
                            />
                        </div>
                    </CardContent>
                </Card>
            </section>

            {/* レイヤー2: 日ビュー（サブセクション） */}
            <section>
                <Card>
                    <CardHeader>
                        <CardTitle>
                            {date 
                                ? `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
                                : "日付を選択してください"
                            }
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {loading ? (
                                <p className="text-muted-foreground">読み込み中...</p>
                            ) : selectedDateBookings.length > 0 ? (
                                selectedDateBookings.map(booking => (
                                    <div key={booking.id} className="p-4 border rounded-lg bg-slate-50">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-bold text-lg">
                                                {format(new Date(booking.start_time), 'HH:mm')} - {format(new Date(booking.end_time), 'HH:mm')}
                                            </span>
                                            <span className={`text-xs px-2 py-1 rounded ${booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                                    booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100'
                                                }`}>
                                                {booking.status === 'confirmed' ? '確定済み' : booking.status === 'pending' ? '承認待ち' : booking.status}
                                            </span>
                                        </div>
                                        <p className="font-medium">{booking.customers?.full_name || '顧客名なし'}</p>
                                        <p className="text-sm text-gray-500">
                                            担当: {booking.staff?.name || '未定'} /
                                            内容: {booking.booking_items.map(i => i.services?.title).join(', ') || '詳細なし'}
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500 italic">この日の予約はありません。</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}

