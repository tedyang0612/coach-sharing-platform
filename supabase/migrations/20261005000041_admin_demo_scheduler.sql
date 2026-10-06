-- Demo 排程頁（PRD 第六章 6「Demo 建議」）：發表現場不用等時間，由管理員在 /admin/demo 按一下就執行排程。
--
-- 排程函式（process_session_matching 等）在 20261003000029 已經收回對 anon／authenticated 的執行權限，
-- 頁面不能直接呼叫，所以這裡新增兩個「只有管理員能用」的包裝函式與一張執行紀錄表：
--   admin_demo_overview()        回傳四個排程目前各有多少待處理（畫面卡片上的數字）
--   admin_run_demo_job(p_job)    執行指定排程、回傳處理結果（matching／reminders／complete／payouts），並記錄到 scheduled_job_runs
--   scheduled_job_runs           手動執行的紀錄（畫面卡片上的「最近一次」），只有管理員讀得到，寫入只能透過 admin_run_demo_job()
--
-- 管理員判斷沿用 profiles.is_admin（只能由資料庫手動設定，沒有自助升級管道，見 20261002000019）。
-- 兩個函式都在內部檢查 is_admin，不是管理員就丟錯；執行權限只開給 authenticated（anon 不能呼叫），
-- 所以就算有人直接打 RPC，也只有管理員執行得了。
-- 這裡不修改任何排程函式本身，只是包一層呼叫並統計結果。

-- ============================================================
-- 一、管理員檢查
-- ============================================================

create or replace function public.assert_demo_admin()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception '請先登入';
  end if;
  if not coalesce((select is_admin from public.profiles where id = auth.uid()), false) then
    raise exception '只有管理員可以使用 Demo 排程';
  end if;
end;
$$;

-- ============================================================
-- 一之二、手動執行紀錄表
-- ============================================================

create table if not exists public.scheduled_job_runs (
  id bigint generated always as identity primary key,
  job text not null check (job in ('matching', 'reminders', 'complete', 'payouts')),
  affected_count int not null default 0,
  result jsonb,
  run_by uuid references public.profiles (id) on delete set null,
  ran_at timestamptz not null default now()
);

comment on table public.scheduled_job_runs is 'Demo 頁手動執行排程的紀錄（只記手動執行，pg_cron 自動執行不記）';
create index if not exists scheduled_job_runs_job_ran_at_idx on public.scheduled_job_runs (job, ran_at desc);

alter table public.scheduled_job_runs enable row level security;

-- 只有管理員讀得到；沒有 insert／update／delete policy，寫入只能透過下面的 security definer 函式
drop policy if exists "admins can view job runs" on public.scheduled_job_runs;
create policy "admins can view job runs"
  on public.scheduled_job_runs for select
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

revoke insert, update, delete, truncate on public.scheduled_job_runs from anon, authenticated;

-- ============================================================
-- 二、待處理數量（和各排程函式挑資料的條件一致）
-- ============================================================

create or replace function public.admin_demo_overview()
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  payout_day date := (now() at time zone 'Asia/Taipei')::date;
  period_end date := payout_day - 3; -- 與 run_weekly_payouts() 相同：上週日
  v_matching int;
  v_reminders int;
  v_complete int;
  v_payout_regs int;
  v_payout_amount numeric(10,2);
begin
  perform public.assert_demo_admin();

  select count(*) into v_matching
  from public.sessions
  where status = 'open' and registration_deadline_at <= now();

  select count(*) into v_reminders
  from public.sessions
  where status = 'matched' and reminder_sent_at is null and start_at <= now() + interval '24 hours';

  select count(*) into v_complete
  from public.sessions
  where status = 'matched' and end_at <= now();

  -- 可撥款的報名：課程完成，或有取消補償的部分退款；課程結束日 <= 結算區間結束日，而且還沒撥款
  select
    count(*),
    coalesce(sum(case when r.status = 'completed' then r.amount * 0.95 else coalesce(r.coach_compensation_amount, 0) end), 0)
  into v_payout_regs, v_payout_amount
  from public.registrations r
  join public.sessions s on s.id = r.session_id
  where r.payout_id is null
    and (
      r.status = 'completed'
      or (r.status = 'partial_refunded' and coalesce(r.coach_compensation_amount, 0) > 0)
    )
    and (s.end_at at time zone 'Asia/Taipei')::date <= period_end;

  return jsonb_build_object(
    'matching_pending', v_matching,
    'reminders_pending', v_reminders,
    'complete_pending', v_complete,
    'payout_registrations', v_payout_regs,
    'payout_net_estimate', v_payout_amount
  );
end;
$$;

-- ============================================================
-- 三、執行排程並回傳結果
-- ============================================================

create or replace function public.admin_run_demo_job(p_job text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  ids uuid[];
  payout_ids_before uuid[];
  n_confirmed int;
  n_cancelled int;
  n_payouts int;
  v_net numeric(10,2);
  v_comp numeric(10,2);
  result jsonb;
begin
  perform public.assert_demo_admin();

  if p_job = 'matching' then
    ids := array(select id from public.sessions where status = 'open' and registration_deadline_at <= now());
    perform public.process_session_matching();
    select count(*) filter (where status = 'matched'), count(*) filter (where status = 'cancelled_unmatched')
    into n_confirmed, n_cancelled
    from public.sessions where id = any (ids);
    result := jsonb_build_object('job', p_job, 'processed', coalesce(array_length(ids, 1), 0),
                                 'confirmed', n_confirmed, 'cancelled', n_cancelled);

  elsif p_job = 'reminders' then
    ids := array(
      select id from public.sessions
      where status = 'matched' and reminder_sent_at is null and start_at <= now() + interval '24 hours'
    );
    perform public.send_session_reminders();
    result := jsonb_build_object('job', p_job, 'processed', coalesce(array_length(ids, 1), 0));

  elsif p_job = 'complete' then
    ids := array(select id from public.sessions where status = 'matched' and end_at <= now());
    perform public.complete_finished_sessions();
    result := jsonb_build_object('job', p_job, 'processed', coalesce(array_length(ids, 1), 0));

  elsif p_job = 'payouts' then
    payout_ids_before := array(select id from public.payouts);
    perform public.run_weekly_payouts();
    select count(*), coalesce(sum(net_amount), 0), coalesce(sum(compensation_amount), 0)
    into n_payouts, v_net, v_comp
    from public.payouts where id <> all (payout_ids_before);
    result := jsonb_build_object('job', p_job, 'processed', n_payouts, 'net_total', v_net, 'compensation_total', v_comp);

  else
    raise exception '不認得的排程項目：%', p_job;
  end if;

  insert into public.scheduled_job_runs (job, affected_count, result, run_by)
  values (p_job, (result->>'processed')::int, result, auth.uid());

  return result;
end;
$$;

-- ============================================================
-- 四、權限：只開給登入者（函式內再檢查是不是管理員）；assert_demo_admin 只給其他函式內部呼叫
-- ============================================================

revoke execute on function public.assert_demo_admin() from public, anon, authenticated;
revoke execute on function public.admin_demo_overview() from public, anon;
revoke execute on function public.admin_run_demo_job(text) from public, anon;
grant execute on function public.admin_demo_overview() to authenticated;
grant execute on function public.admin_run_demo_job(text) to authenticated;
