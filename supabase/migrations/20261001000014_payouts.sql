-- payouts：每週三撥款紀錄（PRD 6.0／11.0），MVP 僅模擬金流，不實際轉帳
create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coach_profiles (id) on delete cascade,

  period_start date not null,
  period_end date not null,
  gross_amount numeric(10, 2) not null,       -- 結算期間內「課程完成」訂單的總金額
  platform_fee_amount numeric(10, 2) not null, -- 5% 媒合費
  net_amount numeric(10, 2) not null,          -- 教練實收

  payout_date date not null,
  created_at timestamptz not null default now()
);

create index if not exists payouts_coach_id_idx on public.payouts (coach_id);

alter table public.payouts enable row level security;

drop policy if exists "coaches can view own payouts" on public.payouts;
create policy "coaches can view own payouts"
  on public.payouts for select
  to authenticated
  using (coach_id = auth.uid());

-- 撥款紀錄只能由排程（見下一支 migration）寫入，不開放一般使用者 insert/update
