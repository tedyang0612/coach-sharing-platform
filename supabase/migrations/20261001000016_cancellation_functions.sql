-- 取消／退款／教練取消場次（PRD 6.0、系統規則總覽），包成 RPC function 讓前端呼叫，
-- 一方面確保時間規則／金額計算都在 DB 層把關一次，不只靠前端擋

-- 學員自己線上取消：開課前 24hr 以上才可以；未扣款不退款（本來就沒扣）、已扣款全額退回
create or replace function public.learner_cancel_registration(p_registration_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  r record;
  s record;
begin
  select * into r from public.registrations where id = p_registration_id for update;
  if not found then
    raise exception '找不到這筆報名';
  end if;
  if r.learner_id <> auth.uid() then
    raise exception '沒有權限取消這筆報名';
  end if;

  select * into s from public.sessions where id = r.session_id;

  if now() > s.start_at - interval '24 hours' then
    raise exception '開課前 24 小時內無法自行取消，請聯絡教練協助處理';
  end if;

  if r.status = 'confirmed' then
    update public.registrations
    set status = 'refunded', cancelled_at = now(), refund_amount = r.amount, refund_fee_amount = 0
    where id = r.id;
  elsif r.status = 'pending_match' then
    update public.registrations
    set status = 'cancelled', cancelled_at = now()
    where id = r.id;
  else
    raise exception '這筆報名目前狀態無法取消（%）', r.status;
  end if;
end;
$$;

-- 教練後台協助 24hr 內退款：固定扣 30% 手續費歸平台，教練該筆不撥款
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
begin
  select * into r from public.registrations where id = p_registration_id for update;
  if not found then
    raise exception '找不到這筆報名';
  end if;

  select s.*, co.coach_id into s from public.sessions s
    join public.courses co on co.id = s.course_id
    where s.id = r.session_id;

  if s.coach_id <> auth.uid() then
    raise exception '只有該場次的教練可以協助退款';
  end if;
  if r.status <> 'confirmed' then
    raise exception '只有已扣款（訂單成立）的報名才能協助退款';
  end if;

  fee := round(r.amount * 0.30, 2);

  update public.registrations
  set status = 'partial_refunded',
      cancelled_at = now(),
      refund_amount = r.amount - fee,
      refund_fee_amount = fee
  where id = r.id;
end;
$$;

-- 教練取消場次：開課前 48hr 以上且尚未成團時才可以；已報名學員直接取消、不扣款
create or replace function public.coach_cancel_session(p_session_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  s record;
  c record;
  r record;
begin
  select * into s from public.sessions where id = p_session_id for update;
  if not found then
    raise exception '找不到這個場次';
  end if;

  select * into c from public.courses where id = s.course_id;
  if c.coach_id <> auth.uid() then
    raise exception '只有這堂課的教練可以取消場次';
  end if;
  if s.status <> 'open' then
    raise exception '這個場次目前狀態無法由教練取消（%）', s.status;
  end if;
  if now() > s.start_at - interval '48 hours' then
    raise exception '開課前 48 小時內，或已成團後，系統不提供取消';
  end if;

  update public.sessions set status = 'cancelled_by_coach' where id = s.id;

  for r in select * from public.registrations where session_id = s.id and status <> 'cancelled' loop
    update public.registrations set status = 'cancelled', cancelled_at = now() where id = r.id;

    perform public.create_notification(
      r.learner_id, 'session_cancelled',
      '課程已取消：' || c.title,
      '教練取消了這個場次，未扣款。',
      '/courses/' || c.id, true
    );
  end loop;
end;
$$;
