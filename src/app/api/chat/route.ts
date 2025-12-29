
import { createClient } from '@/lib/supabase/server';
import { google } from '@ai-sdk/google';
import { streamText, tool } from 'ai';
import { z } from 'zod';

// Config: Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
    const { messages } = await req.json();
    const supabase = await createClient();

    // Fallback if no API key is set
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
        return new Response(JSON.stringify({
            messages: [{
                role: 'assistant',
                content: '申し訳ありません。現在AIサービスの設定が完了していません (GOOGLE_GENERATIVE_AI_API_KEY missing)。',
            }]
        }), { status: 200 }); // Or handle gracefully as stream
    }

    const result = await streamText({
        model: google('models/gemini-1.5-pro-latest') as any,
        system: `あなたは「Haukuri Pro（ハウクリプロ）」の予約受付AIアシスタントです。
        以下の指示に従ってください：
        1. 丁寧で親しみやすい口調で話してください（例：「ございます」「ですね」）。
        2. 料金やサービスに関する質問には \`getServices\` ツールを使って正確に答えてください。
        3. 空き状況の確認には \`checkAvailability\` ツールを使ってください。
        4. 予約を希望された場合は、必要な情報（名前、電話番号、希望日時、メニュー）を聞き出し、全て揃ったら \`createBooking\` ツールを実行してください。
        5. 予約完了後は「予約を受け付けました。ご来店をお待ちしております」と伝えてください。
        `,
        // removed maxSteps to avoid type error if version mismatch
        messages,
        tools: {
            getServices: tool({
                description: '提供している掃除サービスのリストと料金を取得します',
                parameters: z.object({}),
                execute: async () => {
                    const { data } = await supabase.from('services').select('title, price, duration_minutes');
                    return data?.map(s => `${s.title}: ${s.price}円 (${s.duration_minutes}分)`) || [];
                },
            }),
            checkAvailability: tool({
                description: '指定された日付の空き状況を確認します',
                parameters: z.object({
                    date: z.string().describe('YYYY-MM-DD format'),
                    time: z.string().optional().describe('HH:mm format (approximate)'),
                }),
                execute: async (args) => {
                    const { date, time } = args;
                    const { count } = await supabase
                        .from('bookings')
                        .select('id', { count: 'exact', head: true })
                        .gte('start_time', `${date}T00:00:00`)
                        .lte('start_time', `${date}T23:59:59`)
                        .neq('status', 'cancelled');

                    if ((count || 0) > 5) return `申し訳ありません。${date} は予約が埋まっています。`;
                    return `${date} はまだ空きがあります！${time ? time + '頃も可能です。' : '午前・午後ともに調整可能です。'}`;
                },
            }),
            createBooking: tool({
                description: '予約を作成します。全ての情報（名前、電話、日時、メニュー）が揃ってからのみ実行してください。',
                parameters: z.object({
                    customerName: z.string(),
                    customerPhone: z.string(),
                    date: z.string().describe('YYYY-MM-DD'),
                    time: z.string().describe('HH:mm'),
                    serviceName: z.string(),
                }),
                execute: async (args) => {
                    const { customerName, customerPhone, date, time, serviceName } = args;
                    const { data: service } = await supabase
                        .from('services')
                        .select('id, price, duration_minutes')
                        .ilike('title', `%${serviceName}%`)
                        .limit(1)
                        .single();

                    if (!service) return 'サービスが見つかりませんでした。正確なメニュー名を教えてください。';

                    let customerId;
                    const { data: existingCustomer } = await supabase.from('customers').select('id').eq('phone', customerPhone).single();
                    if (existingCustomer) {
                        customerId = existingCustomer.id;
                    } else {
                        const { data: newCustomer, error: cError } = await supabase.from('customers').insert({
                            full_name: customerName,
                            phone: customerPhone
                        }).select().single();
                        if (cError) return '顧客情報の登録に失敗しました。';
                        customerId = newCustomer.id;
                    }

                    const startDateTime = new Date(`${date}T${time}`);
                    const endDateTime = new Date(startDateTime.getTime() + service.duration_minutes * 60000);

                    const { data: booking, error: bError } = await supabase.from('bookings').insert({
                        customer_id: customerId,
                        start_time: startDateTime.toISOString(),
                        end_time: endDateTime.toISOString(),
                        status: 'pending',
                        total_amount: service.price,
                    }).select().single();

                    if (bError) return '予約作成に失敗しました。';

                    await supabase.from('booking_items').insert({
                        booking_id: booking.id,
                        service_id: service.id,
                        quantity: 1,
                        unit_price: service.price,
                        subtotal: service.price
                    });

                    return `予約を受け付けました (ID: ${booking.id}) 。担当者からの連絡をお待ちください。`;
                },
            }),
        },
    });

    return result.toDataStreamResponse();
}
