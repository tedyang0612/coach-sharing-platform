-- PRD v4.7 6.0：開課前 24 小時內由教練協助退款時，學員退 50%，另外 50% 為取消手續費，
-- 其中 25% 給教練（作為時間與場地成本補償）、25% 歸平台（原本是退 70%、30% 全歸平台、教練不撥款）。
--
-- 教練的 25%（取消補償）：
--   * 以場次結束日為準，算進該週的結算，下個週三撥款（與一般課程完成的訂單同一套邏輯，20261004000036）
--   * 不再扣 5% 媒合費（PRD 5.4：平台 25%、教練 25%，沒有第三項；5% 只針對課程完成的款項）
--
-- 資料庫變動：
--   一、registrations.coach_compensation_amount：這筆報名教練分得的取消補償（只有 partial_refunded 會有值）
--   二、payouts.compensation_amount：這期撥款裡的取消補償合計；net_amount ＝ gross － 5% 媒合費 ＋ 取消補償
--       （gross_amount 仍只計課程完成的款項，媒合費 5% 也只對它計算）
--   三、coach_assist_refund() 改成 50／25／25
--   四、run_weekly_payouts() 把取消補償一併撥款（沿用 036 的結算區間邏輯）
--
-- 函式的執行權限沿用 20261003000029／030 的設定（create or replace 不會改動既有權限）。

-- ============================================================
-- 一、registrations.coach_compensation_amount
-- ============================================================

alter table public.registrations add column if not exists coach_compensation_amount numeric(10, 2);

comment on column public.registrations.refund_amount is '實際退款金額（全額，或 24 小時內教練協助退款時的 50%）';
comment on column public.registrations.refund_fee_amount is '取消手續費合計（24 小時內教練協助退款：課程費用的 50%，其中 25% 給教練、25% 歸平台）';
comment on column public.registrations.coach_compensation_amount is
  '24 小時內教練協助退款時，教練分得的取消補償（課程費用的 25%）；只有 partial_refunded 會有值，撥款時列入待撥款';
comment on column public.registrations.status is
  'pending_match=已報名待確認開課；confirmed=訂單成立(確定開課已扣款)；cancelled=已取消(未扣款)；refunded=已退款(全額)；partial_refunded=部分退款(24小時內退50%，手續費50%：教練25%、平台25%)；completed=課程完成';

-- 已經存在、而且已經是新規則（退 50%）的部分退款：補上教練的 25%。
-- 舊規則（退 70%）留下的紀錄不補，維持「教練不撥款」。
update public.registrations
set coach_compensation_amount = round(amount * 0.25, 2)
where status = 'partial_refunded'
  and coach_compensation_amount is null
  and refund_amount = round(amount * 0.50, 2);

-- ============================================================
-- 二、payouts.compensation_amount
-- ============================================================

alter table public.payouts add column if not exists compensation_amount numeric(10, 2) not null default 0;

comment on column public.payouts.gross_amount is '結算期間內「課程完成」訂單的總金額（不含取消補償）';
comment on column public.payouts.platform_fee_amount is '5% 媒合費，只對 gross_amount 計算，取消補償不扣';
comment on column public.payouts.compensation_amount is '結算期間內 24 小時內取消的訂單，教練分得的取消補償（課程費用的 25%）合計';
comment on column public.payouts.net_amount is '教練實收 = gross_amount － platform_fee_amount ＋ compensation_amount';

-- ============================================================
-- 三、coach_assist_refund()：退 50%，手續費 50% 中教練 25%、平台 25%（20261003000030 的版本，改金額與通知）
-- ============================================================

create or replace function public.coach_assist_refund(p_registration_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  r record;
  s record;
  c record;
  fee numeric(10,2);
  compensation numeric(10,2);
begin
  if auth.uid() is null then
    raise exception '請先登入';
  end if;

  select * into r from public.registrations where id = p_registration_id for update;
  if not found then
    raise exception '找不到這筆報名';
  end if;

  select sess.*, co.coach_id into s from public.sessions sess
    join public.courses co on co.id = sess.course_id
    where sess.id = r.session_id;

  if s.coach_id <> auth.uid() then
    raise exception '只有該場次的教練可以協助退款';
  end if;
  if r.status <> 'confirmed' then
    raise exception '只有已扣款（訂單成立）的報名才能協助退款';
  end if;

  select * into c from public.courses where id = s.course_id;

  -- 手續費 50%（四捨五入到分）；教練分 25%，其餘歸平台，這樣三方加總一定等於原金額
  fee := round(r.amount * 0.50, 2);
  compensation := round(r.amount * 0.25, 2);

  update public.registrations
  set status = 'partial_refunded',
      cancelled_at = now(),
      refund_amount = r.amount - fee,
      refund_fee_amount = fee,
      coach_compensation_amount = compensation
  where id = r.id;

  perform public.create_notification(
    r.learner_id, 'refunded_by_coach',
    '已退款：' || c.title,
    '教練已協助處理退款 NT$' || (r.amount - fee) || '（已扣 50% 取消手續費）。',
    '/my-courses', true
  );
end;
$$;

-- ============================================================
-- 四、run_weekly_payouts()：取消補償一併撥款（20261004000036 的版本，加上取消補償）
-- ============================================================
-- 撥款對象：課程結束日 <= 結算區間結束日，而且還沒撥款（payout_id 為空）的
--   a) 課程完成（completed）的報名：課程金額，扣 5% 媒合費
--   b) 部分退款（partial_refunded）而且有取消補償的報名：取消補償，不扣媒合費
-- 教練的 gross、補償各自加總；兩者都是 0 才跳過。

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
