-- 每週撥款的結算區間改成「依週計算」：不管哪一天執行，都是結算「上週一到上週日」完成的課程（PRD：每週三撥付上週一至週日完成的課程）。
--
-- 原本（20261004000036）是「撥款日往前 9 天～3 天」，只有週三執行時剛好是上週一到週日；
-- Demo 排程頁（20261005000041）讓管理員可以在任何一天手動執行，例如週四執行就會變成「上週二到這週一」。
-- 改成：以撥款日（台灣日期）所在那一週的週一為基準，上週日＝週一前一天、上週一＝再往前 6 天。
-- 週三執行的結果和原本完全一樣（週一＝撥款日往前 2 天，上週日＝往前 3 天），排程不受影響。
--
-- 其餘邏輯（撥款對象、5% 媒合費、取消補償、通知）與 20261005000040 完全相同；
-- 同時更新 admin_demo_overview() 裡「待撥款」的結算區間，讓畫面上的數字與實際撥款一致。
-- 函式的執行權限不變（create or replace 不會改動既有權限）。

create or replace function public.run_weekly_payouts()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  payout_day date := (now() at time zone 'Asia/Taipei')::date;
  period_end date := date_trunc('week', payout_day::timestamp)::date - 1; -- 上週日
  period_start date := date_trunc('week', payout_day::timestamp)::date - 7; -- 上週一
  coach_row record;
  gross numeric(10,2);
  compensation numeric(10,2);
  fee numeric(10,2);
  net numeric(10,2);
  new_payout_id uuid;
begin
  for coach_row in
    select distinct c.coach_id
    from public.registrations r
    join public.sessions s on s.id = r.session_id
    join public.courses c on c.id = s.course_id
    where r.payout_id is null
      and (
        r.status = 'completed'
        or (r.status = 'partial_refunded' and coalesce(r.coach_compensation_amount, 0) > 0)
      )
      and (s.end_at at time zone 'Asia/Taipei')::date <= period_end
  loop
    select
      coalesce(sum(r.amount) filter (where r.status = 'completed'), 0),
      coalesce(sum(r.coach_compensation_amount) filter (where r.status = 'partial_refunded'), 0)
    into gross, compensation
    from public.registrations r
    join public.sessions s on s.id = r.session_id
    join public.courses c on c.id = s.course_id
    where r.payout_id is null
      and c.coach_id = coach_row.coach_id
      and (
        r.status = 'completed'
        or (r.status = 'partial_refunded' and coalesce(r.coach_compensation_amount, 0) > 0)
      )
      and (s.end_at at time zone 'Asia/Taipei')::date <= period_end;

    continue when gross = 0 and compensation = 0;

    fee := round(gross * 0.05, 2);
    net := gross - fee + compensation;

    insert into public.payouts (coach_id, period_start, period_end, gross_amount, platform_fee_amount, compensation_amount, net_amount, payout_date)
    values (coach_row.coach_id, period_start, period_end, gross, fee, compensation, net, payout_day)
    returning id into new_payout_id;

    update public.registrations r
    set payout_id = new_payout_id
    from public.sessions s, public.courses c
    where r.session_id = s.id and s.course_id = c.id
      and r.payout_id is null
      and c.coach_id = coach_row.coach_id
      and (
        r.status = 'completed'
        or (r.status = 'partial_refunded' and coalesce(r.coach_compensation_amount, 0) > 0)
      )
      and (s.end_at at time zone 'Asia/Taipei')::date <= period_end;

    perform public.create_notification(
      coach_row.coach_id, 'payout_completed',
      '撥款完成',
      '本期撥款 NT$' || net || '（已扣 5% 媒合費'
        || case when compensation > 0 then '；含取消補償 NT$' || compensation else '' end
        || '）。',
      '/coach/payouts', true
    );
  end loop;
end;
$$;

-- admin_demo_overview()：只改結算區間（period_end），其餘與 20261005000041 相同
create or replace function public.admin_demo_overview()
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  payout_day date := (now() at time zone 'Asia/Taipei')::date;
  period_end date := date_trunc('week', payout_day::timestamp)::date - 1; -- 與 run_weekly_payouts() 相同：上週日
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
