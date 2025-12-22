/**
 * LINE Notification Service
 * 
 * Handles sending formatted notifications via LINE Messaging API.
 * PRD Reference: Section 10-5 (LINE Webhook Processing Flow)
 */

import { AmberErrors } from '@/lib/errors';

export class LineNotificationService {
    private static CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

    /**
     * 予約完了通知 (Flex Message)
     */
    static async sendBookingConfirmation(to: string, bookingDetails: any) {
        return this.sendFlexMessage(to, '予約が完了しました', {
            type: 'bubble',
            body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    { type: 'text', text: '予約完了通知', weight: 'bold', size: 'xl', color: '#B45309' },
                    { type: 'text', text: `店舗: ${bookingDetails.store_name}`, margin: 'md' },
                    { type: 'text', text: `日時: ${bookingDetails.start_time}` },
                    { type: 'text', text: `合計: ¥${bookingDetails.total_price.toLocaleString()}` },
                    {
                        type: 'button',
                        action: { type: 'uri', label: '詳細を確認', uri: `${process.env.NEXT_PUBLIC_BASE_URL}/booking/${bookingDetails.id}` },
                        style: 'primary',
                        color: '#D97706',
                        margin: 'xl'
                    }
                ]
            }
        });
    }

    /**
     * リマインド通知
     */
    static async sendReminder(to: string, bookingDetails: any) {
        return this.sendTextMessage(to, `【リマインド】明日 ${bookingDetails.start_time} より予約がございます。ご来店をお待ちしております。`);
    }

    private static async sendFlexMessage(to: string, altText: string, contents: any) {
        return this.apiRequest('/v2/bot/message/push', {
            to,
            messages: [{
                type: 'flex',
                altText,
                contents
            }]
        });
    }

    private static async sendTextMessage(to: string, text: string) {
        return this.apiRequest('/v2/bot/message/push', {
            to,
            messages: [{ type: 'text', text }]
        });
    }

    private static async apiRequest(endpoint: string, body: any) {
        if (!this.CHANNEL_ACCESS_TOKEN) return console.warn('LINE_CHANNEL_ACCESS_TOKEN is not set');

        const response = await fetch(`https://api.line.me${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.CHANNEL_ACCESS_TOKEN}`
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('LINE API Error:', error);
            throw new Error('Failed to send LINE notification');
        }

        return response.json();
    }
}
