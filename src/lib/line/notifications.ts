import { lineClient } from './client';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

export async function sendBookingConfirmationLine(to: string, booking: any) {
    if (!to) return;

    const dateStr = format(new Date(booking.start_time), 'yyyy年MM月dd日(EEEE) HH:mm', { locale: ja });

    const message = `【Amber】予約が確定しました ✨
    
■日時
${dateStr} 〜

■サービス内容
${booking.booking_items?.map((item: any) => `・${item.services?.title} x${item.quantity}`).join('\n')}

■合計金額
${booking.total_amount.toLocaleString()}円 (${booking.payment_method === 'online_card' ? '決済済み' : '現地決済'})

■場所
${booking.customers?.address}

当日、スタッフがお伺いいたします。
よろしくお願いいたします。`;

    try {
        await lineClient.pushMessage({
            to,
            messages: [{ type: 'text', text: message }],
        });
    } catch (error) {
        console.error('Failed to send LINE notification:', error);
    }
}
