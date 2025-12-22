-- Phase 1.1: Multi-tenant Scaling - Indexing Optimization

-- 1. 拡張機能の有効化
-- GiST インデックスで btree 型のカラム（staff_id 等）を扱うために必要です。
create extension if not exists btree_gist;

-- 2. 予約重複防止の物理制約 (Constraint)
-- 同じスタッフに対して、時間が重なる予約（tstzrange）が入るのをデータベースレベルで防ぎます。
-- 既存のデータに重複がある場合はエラーになるため、事前に確認が必要です。
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'bookings_staff_overlap_idx') then
    alter table public.bookings
    add constraint bookings_staff_overlap_idx exclude using gist (
      staff_id with =,
      tstzrange(start_time, end_time, '[)') with &&
    );
  end if;
exception
  when others then
    -- 重複データがある場合は制約の追加をスキップし、警告を出力（またはインデックスのみ作成）
    raise notice 'Could not add exclusion constraint. Possibly due to existing overlapping data.';
end $$;

-- 3. 検索パフォーマンス向上のためのインデックス
-- 店舗ごとの予約取得や、期間指定のクエリを高速化します。
create index if not exists idx_bookings_store_start_time on public.bookings (store_id, start_time);
create index if not exists idx_bookings_organization_id on public.bookings (organization_id);

-- 4. スタッフの空き時間検索用のインデックス
create index if not exists idx_shifts_staff_time on public.shifts (staff_id, start_time, end_time);
create index if not exists idx_shifts_organization_id on public.shifts (organization_id);

-- 5. 顧客検索用のインデックス（電話番号での名寄せ用）
create index if not exists idx_customers_phone on public.customers (phone);
create index if not exists idx_customers_store_id on public.customers (store_id);
