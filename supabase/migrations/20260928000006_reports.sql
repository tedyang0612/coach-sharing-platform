-- reports：教練平台檢舉學員機制（PRD 五-5.0，單向——只有教練檢舉學員，PRD 沒提到反向）

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reported_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid references public.courses (id) on delete set null,

  reason text not null,
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),

  created_at timestamptz not null default now(),

  check (reporter_id <> reported_id)
);

create index if not exists reports_status_idx on public.reports (status);

-- RLS
alter table public.reports enable row level security;

-- 檢舉紀錄不公開：只有提出檢舉的教練自己，或後台管理者（service role）看得到
-- 這裡先不特別開放給某個 admin 角色，MVP 階段由 Ted／牛牛用 service role key 在後台查
drop policy if exists "reporters can view own reports" on public.reports;
create policy "reporters can view own reports"
  on public.reports for select
  to authenticated
  using (reporter_id = auth.uid());

drop policy if exists "coaches can create reports" on public.reports;
create policy "coaches can create reports"
  on public.reports for insert
  to authenticated
  with check (
    reporter_id = auth.uid()
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'coach')
    and exists (select 1 from public.profiles where id = reported_id and role = 'learner')
  );
