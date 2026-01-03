
import { createClient } from '@/lib/supabase/server';
import { google } from '@ai-sdk/google';
import { streamText, tool } from 'ai';
import { z } from 'zod';

// Config: Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
    const { messages, storeSlug, cartItems } = await req.json();
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

    // ストア情報とサービス情報を取得
    let storeId: string | null = null;
    let organizationId: string | null = null;
    let allServices: any[] = [];
    let currentCartServices: any[] = [];

    if (storeSlug) {
        const { data: storeData } = await supabase
            .from('stores')
            .select('id, organization_id')
            .eq('slug', storeSlug)
            .single();
        
        if (storeData) {
            storeId = storeData.id;
            organizationId = storeData.organization_id;
            
            // 全サービスを取得（詳細情報含む）
            const { data: services } = await supabase
                .from('services')
                .select('id, title, description, price, duration_minutes, category')
                .eq('store_id', storeId)
                .eq('is_active', true)
                .order('price', { ascending: true });
            
            allServices = services || [];

            // カート内のサービス情報を取得
            if (cartItems && cartItems.length > 0) {
                const cartServiceIds = cartItems.map((item: any) => item.serviceId);
                currentCartServices = allServices.filter(s => cartServiceIds.includes(s.id));
            }
        }
    }

    // カート内容をテキスト形式で生成
    const cartSummary = currentCartServices.length > 0
        ? `現在カートに入っているサービス: ${currentCartServices.map(s => s.title).join('、')}`
        : '現在カートは空です。';

    const result = await streamText({
        model: google('models/gemini-1.5-pro-latest') as any,
        system: `あなたは「Amber House（アンバーハウス）」の予約受付AIアシスタントです。
        以下の指示に従ってください：
        1. 丁寧で親しみやすい口調で話してください（例：「ございます」「ですね」）。
        2. 料金やサービスに関する質問には \`getServices\` ツールを使って正確に答えてください。
        3. 空き状況の確認には \`checkAvailability\` ツールを使ってください。
        4. 予約を希望された場合は、必要な情報（名前、電話番号、希望日時、メニュー）を聞き出し、全て揃ったら \`createBooking\` ツールを実行してください。
        5. 予約完了後は「予約を受け付けました。ご来店をお待ちしております」と伝えてください。
        
        【アップセル・クロスセル戦略】
        ${cartSummary}
        
        会話の中で自然に以下の戦略でサービスを提案してください：
        - **アップセル**: 現在のカート内容より高価なサービスや、より高品質なプランを提案
        - **クロスセル**: 現在のカート内容と関連する別カテゴリのサービスを提案（例：エアコン掃除→キッチン掃除）
        - **セットプラン**: 複数のサービスを組み合わせたお得なセットプランを提案
        
        提案する際は、\`suggestServices\` ツールを使用してください。提案理由も含めて自然な会話の中で紹介してください。
        `,
        // removed maxSteps to avoid type error if version mismatch
        messages,
        tools: {
            getServices: tool({
                description: '提供している掃除サービスのリストと料金を取得します',
                parameters: z.object({}),
                execute: async () => {
                    if (!storeId) return '店舗情報が見つかりませんでした。';
                    return allServices.map(s => `${s.title}: ${s.price}円 (${s.duration_minutes}分)${s.description ? ` - ${s.description}` : ''}`) || [];
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

                    if (!storeId || !organizationId) {
                        return '店舗情報が正しく取得できませんでした。';
                    }

                    let customerId;
                    // 既存顧客を検索（store_idでスコープ）
                    const { data: existingCustomer } = await supabase
                        .from('customers')
                        .select('id')
                        .eq('phone', customerPhone)
                        .eq('store_id', storeId)
                        .single();
                    
                    if (existingCustomer) {
                        customerId = existingCustomer.id;
                    } else {
                        // 新規顧客作成（store_idを設定）
                        const { data: newCustomer, error: cError } = await supabase
                            .from('customers')
                            .insert({
                                full_name: customerName,
                                phone: customerPhone,
                                store_id: storeId
                            })
                            .select()
                            .single();
                        if (cError) return '顧客情報の登録に失敗しました。';
                        customerId = newCustomer.id;
                    }

                    const startDateTime = new Date(`${date}T${time}`);
                    const endDateTime = new Date(startDateTime.getTime() + service.duration_minutes * 60000);

                    // 予約作成（store_idとorganization_idを設定）
                    const { data: booking, error: bError } = await supabase
                        .from('bookings')
                        .insert({
                            customer_id: customerId,
                            store_id: storeId,
                            organization_id: organizationId,
                            start_time: startDateTime.toISOString(),
                            end_time: endDateTime.toISOString(),
                            status: 'pending',
                            total_amount: service.price,
                        })
                        .select()
                        .single();

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
            suggestServices: tool({
                description: 'ユーザーにサービスを提案します。アップセル、クロスセル、セットプランの提案に使用します。',
                parameters: z.object({
                    serviceIds: z.array(z.string()).describe('提案するサービスのID配列'),
                    suggestionType: z.enum(['upsell', 'cross_sell', 'combo']).describe('提案タイプ: upsell=より高価なサービス, cross_sell=関連サービス, combo=セットプラン'),
                    reason: z.string().optional().describe('提案理由（自然な日本語で）'),
                }),
                execute: async (args) => {
                    const { serviceIds, suggestionType, reason } = args;
                    
                    if (!storeId) return '店舗情報が見つかりませんでした。';
                    
                    const suggestedServices = allServices.filter(s => serviceIds.includes(s.id));
                    
                    if (suggestedServices.length === 0) {
                        return '提案するサービスが見つかりませんでした。';
                    }

                    // JSON形式でサービス提案を返す（AIがこれを解析して表示する）
                    return JSON.stringify({
                        type: 'service_suggestion',
                        services: suggestedServices.map(s => ({
                            id: s.id,
                            title: s.title,
                            price: s.price,
                            description: s.description || '',
                            duration_minutes: s.duration_minutes,
                            reason: reason || `${s.title}はいかがでしょうか？`
                        })),
                        suggestion_type: suggestionType
                    });
                },
            }),
        },
    });

    return result.toDataStreamResponse();
}
