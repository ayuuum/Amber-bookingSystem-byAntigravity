/**
 * Pricing Calculation Logic
 * 
 * Centralized pricing calculation for bookings.
 * This logic is used in both API routes and RPC functions.
 */

export interface CartItem {
    serviceId: string;
    quantity: number;
    selectedOptions?: string[];
}

export interface Service {
    id: string;
    price: number;
    duration_minutes: number;
    buffer_minutes?: number;
}

export interface ServiceOption {
    id: string;
    price: number;
    duration_minutes: number;
}

export interface PricingResult {
    totalAmount: number;
    totalDurationMinutes: number;
    itemBreakdown: Array<{
        serviceId: string;
        quantity: number;
        servicePrice: number;
        optionsPrice: number;
        subtotal: number;
        duration: number;
    }>;
}

/**
 * Calculate total price and duration for a booking
 */
/**
 * 予約の合計料金と所要時間を計算する
 * 
 * 【複雑なロジック】料金計算のルール:
 * - サービス料金 = 単価 × 数量
 * - オプション料金 = オプション単価 × 数量（オプションは選択したサービス全てに適用）
 * - バッファ時間 = サービスごとのバッファ × 数量
 * - 移動時間 = 予約全体で1回のみ追加（最後に加算）
 * 
 * 例: エアコン2台 + コーティングオプション
 *   - サービス料金: 5000円 × 2 = 10000円
 *   - オプション料金: 1000円 × 2 = 2000円（2台全てにコーティング適用）
 *   - 合計: 12000円
 */
export function calculateBookingPrice(
    cartItems: CartItem[],
    services: Service[],
    options: ServiceOption[],
    travelPaddingMinutes: number = 30
): PricingResult {
    let totalAmount = 0;
    let totalDurationMinutes = 0;
    const itemBreakdown: PricingResult['itemBreakdown'] = [];

    // カート内の各アイテム（サービス）をループ処理
    for (const item of cartItems) {
        const service = services.find((s) => s.id === item.serviceId);
        if (!service) {
            throw new Error(`Service ${item.serviceId} not found`);
        }

        // サービス基本料金の計算
        // 例: エアコンクリーニング 5000円 × 2台 = 10000円
        const servicePrice = item.quantity * service.price;
        // サービス基本時間の計算
        // 例: 60分 × 2台 = 120分
        const serviceDuration = item.quantity * service.duration_minutes;
        // バッファ時間の計算（サービスごとに設定可能な準備・片付け時間）
        // 例: 10分 × 2台 = 20分
        const bufferDuration = item.quantity * (service.buffer_minutes || 0);

        // 【複雑なロジック】オプション料金・時間の計算
        // オプションは選択したサービス全ての数量に適用される
        // 例: エアコン2台にコーティングオプションを選択 → コーティング料金 × 2
        let optionsPrice = 0;
        let optionsDuration = 0;

        if (item.selectedOptions && item.selectedOptions.length > 0) {
            for (const optionId of item.selectedOptions) {
                const option = options.find((o) => o.id === optionId);
                if (option) {
                    // オプション料金 = オプション単価 × サービス数量
                    // 例: コーティング 1000円 × 2台 = 2000円
                    optionsPrice += item.quantity * option.price;
                    // オプション時間 = オプション所要時間 × サービス数量
                    // 例: コーティング 15分 × 2台 = 30分
                    optionsDuration += item.quantity * option.duration_minutes;
                }
            }
        }

        // このアイテムの小計（サービス料金 + オプション料金）
        const itemSubtotal = servicePrice + optionsPrice;
        // このアイテムの合計時間（サービス時間 + バッファ時間 + オプション時間）
        const itemDuration = serviceDuration + bufferDuration + optionsDuration;

        // 全体の合計に加算
        totalAmount += itemSubtotal;
        totalDurationMinutes += itemDuration;

        // 内訳を記録（レシート表示やデバッグ用）
        itemBreakdown.push({
            serviceId: item.serviceId,
            quantity: item.quantity,
            servicePrice,
            optionsPrice,
            subtotal: itemSubtotal,
            duration: itemDuration,
        });
    }

    // 移動時間を最後に1回だけ追加（予約全体で1回の移動を想定）
    // 例: 店舗から現場への移動時間として30分を追加
    totalDurationMinutes += travelPaddingMinutes;

    return {
        totalAmount,
        totalDurationMinutes,
        itemBreakdown,
    };
}

/**
 * キャンセル料を計算する
 * 
 * 【複雑なロジック】予約日時とキャンセル日時の時間差に応じて段階的にキャンセル料を計算
 * 
 * デフォルトポリシー:
 * - 48時間以上前: 無料（全額返金）
 * - 24-48時間前: 30%（70%返金）
 * - 0-24時間前: 50%（50%返金）
 * - 当日または予約時刻を過ぎた場合: 100%（返金なし）
 * 
 * 例: 予約日時が 2024-12-25 10:00 の場合
 *   - 2024-12-23 10:00 にキャンセル → 48時間前 → 無料
 *   - 2024-12-24 10:00 にキャンセル → 24時間前 → 30%
 *   - 2024-12-25 09:00 にキャンセル → 1時間前 → 50%
 *   - 2024-12-25 10:00 以降にキャンセル → 当日 → 100%
 */
export function calculateCancellationFee(
    bookingAmount: number,
    bookingDate: Date,
    cancellationDate: Date,
    policy?: {
        freeUntilHours?: number;
        fee30PercentUntilHours?: number;
        fee50PercentUntilHours?: number;
    }
): number {
    // デフォルトポリシー（店舗がカスタムポリシーを設定していない場合）
    const defaultPolicy = {
        freeUntilHours: 48,
        fee30PercentUntilHours: 24,
        fee50PercentUntilHours: 0,
    };

    const effectivePolicy = policy || defaultPolicy;
    
    // 予約日時とキャンセル日時の時間差を計算（ミリ秒 → 時間に変換）
    // 正の値 = キャンセル日時が予約日時より前（通常のケース）
    // 負の値 = キャンセル日時が予約日時より後（予約時刻を過ぎてからのキャンセル）
    const hoursUntilBooking = (bookingDate.getTime() - cancellationDate.getTime()) / (1000 * 60 * 60);

    // 48時間以上前: 無料キャンセル
    if (hoursUntilBooking >= effectivePolicy.freeUntilHours!) {
        return 0;
    }

    // 24-48時間前: キャンセル料30%
    if (hoursUntilBooking >= effectivePolicy.fee30PercentUntilHours!) {
        return Math.floor(bookingAmount * 0.3);
    }

    // 0時間以上24時間未満: キャンセル料50%
    // （hoursUntilBooking > 0 は「予約時刻より前だが24時間以内」を意味する）
    if (hoursUntilBooking > 0) {
        return Math.floor(bookingAmount * 0.5);
    }

    // 当日または予約時刻を過ぎた場合（hoursUntilBooking <= 0）: キャンセル料100%
    // 予約時刻を過ぎてからのキャンセルは「ノーショー」扱いで返金なし
    return bookingAmount;
}

