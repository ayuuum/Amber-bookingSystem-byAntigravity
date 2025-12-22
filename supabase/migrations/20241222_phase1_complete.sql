-- Phase 1.1 Robust Migration
-- Syncs existing tables and adds missing structures from PRD Section 9

-- =============================================
-- 1. customers テーブルの調整
-- =============================================
DO $$ 
BEGIN 
    -- 既存の customers テーブルがあるか確認
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'customers') THEN
        -- カラム名変更: name -> full_name
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'name') THEN
            ALTER TABLE public.customers RENAME COLUMN name TO full_name;
        END IF;

        -- 不足カラムの追加
        ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS normalized_phone TEXT;
        ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS total_visits INTEGER DEFAULT 0;
        ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS total_spent INTEGER DEFAULT 0;
        ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS last_visit_at TIMESTAMPTZ;
        
        -- 制約の調整
        ALTER TABLE public.customers ALTER COLUMN store_id SET NOT NULL;
        ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_store_id_phone_key;
        ALTER TABLE public.customers ADD CONSTRAINT customers_store_id_phone_key UNIQUE(store_id, phone);
    ELSE
        -- 新規作成
        CREATE TABLE public.customers (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
            phone TEXT NOT NULL,
            normalized_phone TEXT,
            email TEXT,
            full_name TEXT,
            address TEXT,
            notes TEXT,
            total_visits INTEGER DEFAULT 0,
            total_spent INTEGER DEFAULT 0,
            last_visit_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(store_id, phone)
        );
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_customers_store_phone ON public.customers(store_id, phone);
CREATE INDEX IF NOT EXISTS idx_customers_store_name ON public.customers(store_id, full_name);

-- =============================================
-- 2. booking_items テーブルの調整
-- =============================================
DO $$ 
BEGIN 
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'booking_items') THEN
        ALTER TABLE public.booking_items ADD COLUMN IF NOT EXISTS snapshot_duration INTEGER DEFAULT 0;
    ELSE
        CREATE TABLE public.booking_items (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
            service_id UUID REFERENCES public.services(id) NOT NULL,
            quantity INTEGER DEFAULT 1 NOT NULL,
            unit_price INTEGER NOT NULL,
            snapshot_duration INTEGER NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_booking_items_booking ON public.booking_items(booking_id);

-- =============================================
-- 3. profiles_stores テーブル (新規)
-- =============================================
CREATE TABLE IF NOT EXISTS public.profiles_stores (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    role TEXT DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(profile_id, store_id)
);

CREATE INDEX IF NOT EXISTS idx_profiles_stores_profile ON public.profiles_stores(profile_id);
CREATE INDEX IF NOT EXISTS idx_profiles_stores_store ON public.profiles_stores(store_id);

-- =============================================
-- 4. payment_events テーブル (新規)
-- =============================================
CREATE TABLE IF NOT EXISTS public.payment_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    stripe_event_id TEXT UNIQUE NOT NULL,
    booking_id UUID REFERENCES public.bookings(id),
    event_type TEXT NOT NULL,
    payload JSONB,
    processed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_events_stripe ON public.payment_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_booking ON public.payment_events(booking_id);

-- =============================================
-- 5. bookings テーブル拡張
-- =============================================
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS refund_amount INTEGER;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS refund_at TIMESTAMPTZ;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- ステータス制約更新
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check 
CHECK (status IN ('pending', 'pending_payment', 'confirmed', 'working', 'completed', 'cancelled'));

-- is_active 同期トリガー
CREATE OR REPLACE FUNCTION public.sync_booking_is_active()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'cancelled' THEN
        NEW.is_active := false;
    ELSE
        NEW.is_active := true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_booking_is_active ON public.bookings;
CREATE TRIGGER trg_sync_booking_is_active
    BEFORE INSERT OR UPDATE OF status ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_booking_is_active();

-- EXCLUDE制約 (GIST)
-- ※btree_gist 拡張、または gist への対応が必要（マスターリセットSQLで対応済み想定）
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_no_overlap;
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_no_overlap_active;
ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_no_overlap_active 
EXCLUDE USING gist (
    staff_id WITH =,
    tstzrange(start_time, end_time, '[)') WITH &&
) WHERE (is_active = true);

-- =============================================
-- 6. stores テーブル拡張
-- =============================================
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS cancellation_policy JSONB DEFAULT '{
    "free_until_hours": 48,
    "tiers": [
        {"hours_before": 48, "fee_percent": 0},
        {"hours_before": 24, "fee_percent": 30},
        {"hours_before": 0, "fee_percent": 50}
    ]
}'::jsonb;

-- =============================================
-- 7. 顧客統計更新トリガー
-- =============================================
CREATE OR REPLACE FUNCTION public.update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
        -- 電話番号と店舗IDで名寄せ
        UPDATE public.customers
        SET 
            total_visits = total_visits + 1,
            total_spent = total_spent + COALESCE(NEW.total_price, 0),
            last_visit_at = NEW.end_time
        WHERE phone = NEW.customer_phone AND store_id = NEW.store_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_customer_stats ON public.bookings;
CREATE TRIGGER trg_update_customer_stats
    AFTER UPDATE OF status ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_customer_stats();

-- =============================================
-- 8. 決済タイムアウト自動キャンセル関数
-- =============================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_pending_payments()
RETURNS INTEGER AS $$
DECLARE
    affected_count INTEGER;
BEGIN
    UPDATE public.bookings
    SET 
        status = 'cancelled',
        cancellation_reason = 'payment_timeout',
        is_active = false
    WHERE 
        status = 'pending_payment'
        AND expires_at IS NOT NULL
        AND expires_at < NOW();
    
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    RETURN affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 9. RLSポリシーの設定
-- =============================================

-- customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store members can view customers" ON public.customers;
CREATE POLICY "Store members can view customers" ON public.customers
    FOR SELECT USING (
        store_id IN (
            SELECT store_id FROM public.profiles_stores 
            WHERE profile_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Store admins can manage customers" ON public.customers;
CREATE POLICY "Store admins can manage customers" ON public.customers
    FOR ALL USING (
        store_id IN (
            SELECT store_id FROM public.profiles_stores 
            WHERE profile_id = auth.uid() AND role = 'admin'
        )
    );

-- booking_items
ALTER TABLE public.booking_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Access booking items through booking" ON public.booking_items;
CREATE POLICY "Access booking items through booking" ON public.booking_items
    FOR ALL USING (
        booking_id IN (
            SELECT id FROM public.bookings 
            WHERE store_id IN (
                SELECT store_id FROM public.profiles_stores 
                WHERE profile_id = auth.uid()
            )
        )
    );

-- profiles_stores
ALTER TABLE public.profiles_stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own store memberships" ON public.profiles_stores;
CREATE POLICY "Users can view own store memberships" ON public.profiles_stores
    FOR SELECT USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage store memberships" ON public.profiles_stores;
CREATE POLICY "Admins can manage store memberships" ON public.profiles_stores
    FOR ALL USING (
        store_id IN (
            SELECT store_id FROM public.profiles_stores 
            WHERE profile_id = auth.uid() AND role = 'admin'
        )
    );

-- payment_events
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role only" ON public.payment_events;
CREATE POLICY "Service role only" ON public.payment_events
    FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE public.customers IS 'PRD Section 9-2-A: 顧客マスタ（店舗単位管理）';
COMMENT ON TABLE public.booking_items IS 'PRD Section 9-2-B: 予約明細';
COMMENT ON TABLE public.profiles_stores IS 'PRD Section 9-2-C: ユーザー-店舗紐付';
COMMENT ON TABLE public.payment_events IS 'PRD Section 9-1: Webhook冪等性担保';

