-- 修正每週撥款的結算區間，對齊 PRD：「每週三撥付上週一到週日完成的課程」。
--
-- 原本 run_weekly_payouts()（20261002000023）的區間是「7 天前到昨天」，排程在週三跑的話，
-- 就變成「上週三到這週二」，和 PRD 的「上週一到週日」差了幾天：
-- 週三、週四完成的課程會被算進下一期，週一、週二完成的課程則會在週日之前就被撥掉。
--
-- 改成：撥款日（台灣日期，排程固定週三）往前 9 天是上週一、往前 3 天是上週日。
-- 例：2026-10-07（週三）撥款 → 結算 2026-09-28（週一）～2026-10-04（週日）。
--
-- 另外，挑訂單的條件改成「課程結束日 <= 結算區間結束日」，不再限制下限。
-- 這樣萬一某週排程沒跑到、或舊版區間漏掉的訂單，下一次撥款會一併補上，不會永遠卡在待撥款；
-- payouts 裡的 period_start／period_end 仍記錄當週的名義區間。
--
-- 排程本身（每週三 01:00 UTC＝台灣 09:00）不變；函式的執行權限沿用 20261003000029 的設定
-- （create or replace 不會改動既有權限）。

create or replace function public.run_weekly_payouts()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  payout_day date := (now() at time zone 'Asia/Taipei')::date;
  period_start date := payout_day - 9; -- 上週一
  period_end date := payout_day - 3;   -- 上週日
  coach_row record;
  gross numeric(10,2);
  fee numeric(10,2);
  net numeric(10,2);
  new_payout_id uuid;
begin
  for coach_row in
    select distinct c.coach_id
    from public.registrations r
    join public.sessions s on s.id = r.session_id
    join public.courses c on c.id = s.course_id
    where r.status = 'completed' and r.payout_id is null
      and (s.end_at at time zone 'Asia/Taipei')::date <= period_end
  loop
    select coalesce(sum(r.amount), 0) into gross
    from public.registrations r
    join public.sessions s on s.id = r.session_id
    join public.courses c on c.id = s.course_id
    where r.status = 'completed' and r.payout_id is null
      and c.coach_id = coach_row.coach_id
      and (s.end_at at time zone 'Asia/Taipei')::date <= period_end;

    continue when gross = 0;

    fee := round(gross * 0.05, 2);
    net := gross - fee;

    insert into public.payouts (coach_id, period_start, period_end, gross_amount, platform_fee_amount, net_amount, payout_date)
    values (coach_row.coach_id, period_start, period_end, gross, fee, net, payout_day)
    returning id into new_payout_id;

    update public.registrations r
    set payout_id = new_payout_id
    from public.sessions s, public.courses c
    where r.session_id = s.id and s.course_id = c.id
      and r.status = 'completed' and r.payout_id is null
      and c.coach_id = coach_row.coach_id
      and (s.end_at at time zone 'Asia/Taipei')::date <= period_end;

    perform public.create_notification(
      coach_row.coach_id, 'payout_completed',
      '撥款完成',
      '本期撥款 NT$' || net || '（已扣 5% 媒合費）。',
      '/coach/payouts', true
    );
  end loop;
end;
$$;
