import { Booking } from "@/types";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, User, Calendar, Clock, CreditCard } from "lucide-react";

interface BookingTimelineProps {
    bookings: any[]; // Extended with services, staff, stores
}

export function BookingTimeline({ bookings }: BookingTimelineProps) {
    if (bookings.length === 0) {
        return (
            <div className="py-20 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 space-y-4">
                <Calendar className="w-12 h-12 opacity-20" />
                <p className="font-bold text-sm italic">予約履歴がありません。</p>
            </div>
        );
    }

    return (
        <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
            {bookings.map((booking, index) => (
                <div key={booking.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    {/* Icon */}
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-100 group-[.is-active]:bg-amber-500 text-slate-500 group-[.is-active]:text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 transition-colors duration-500">
                        <Calendar className="w-5 h-5" />
                    </div>

                    {/* Content */}
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)]">
                        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl group-hover:shadow-[0_8px_30px_rgb(245,158,11,0.08)] transition-all duration-300">
                            <CardContent className="p-6 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <time className="text-sm font-black text-amber-600 uppercase tracking-widest">
                                            {format(new Date(booking.start_time), "yyyy MMMM do", { locale: ja })}
                                        </time>
                                        <h4 className="text-xl font-black text-slate-800 tracking-tight">
                                            {booking.services?.title || "サービス名称なし"}
                                        </h4>
                                    </div>
                                    <Badge variant={booking.status === 'completed' ? 'default' : 'outline'} className={`rounded-lg font-bold ${booking.status === 'completed' ? 'bg-emerald-500 text-white border-none' : 'text-slate-500 border-slate-200'}`}>
                                        {booking.status}
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-xs font-bold text-slate-500 uppercase tracking-tighter">
                                    <div className="flex items-center gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                        <User className="w-3.5 h-3.5 text-slate-400" />
                                        <span className="truncate">{booking.staff?.name || "担当スタッフなし"}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                        <span className="truncate">{booking.stores?.name || "店舗情報なし"}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                                        <span>{format(new Date(booking.start_time), "HH:mm")} - {format(new Date(booking.end_time), "HH:mm")}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-amber-50 p-2 rounded-lg border border-amber-100 text-amber-700">
                                        <CreditCard className="w-3.5 h-3.5 text-amber-500" />
                                        <span>¥{(booking.total_amount || 0).toLocaleString()}</span>
                                    </div>
                                </div>

                                {booking.notes && (
                                    <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100/50">
                                        <p className="text-xs text-slate-400 font-black uppercase mb-1 tracking-widest">Feedback / Notes</p>
                                        <p className="text-sm text-slate-600 font-medium leading-relaxed italic">
                                            "{booking.notes}"
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            ))}
        </div>
    );
}
