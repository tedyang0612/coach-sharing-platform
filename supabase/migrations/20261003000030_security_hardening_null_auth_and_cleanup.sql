-- 安全補強三件事（接續 20261003000029_revoke_function_execute.sql）：
-- (1) learner_cancel_registration／coach_assist_refund／coach_cancel_session 的身分檢查寫成
--     `x <> auth.uid()`，auth.uid() 為 null 時結果是 null（不是 true），raise 不會觸發、檢查被跳過。
--     029 已收回 anon 的 EXECUTE，這裡在函式本體再加一道：未登入一律拒絕。
--     函式內容以最新定義為準（前兩支：20261001000017；coach_cancel_session：20261001000016），
--     只在 begin 後加 null 檢查，其餘邏輯與簽名完全不變。create or replace 會保留 029 設定的權限。
-- (2) create_notification 原本對 anon／authenticated 開放，任何人可對任意使用者寫入任意通知。
--     app 內沒有任何 rpc() 呼叫；DB 內的呼叫者全部是 SECURITY DEFINER 函式（以擁有者身分執行），不受影響。
-- (3) cancel_understaffed_courses() 是 v3 舊 schema 遺留（20260928000007），它引用的表已在
--     20261001000008 drop、排程也已 unschedule，但函式本身沒被 drop；所有分支都沒有其他引用。

-- ============================================================
-- 一、三支取消／退款 RPC：未登入一律拒絕
-- ============================================================

create or replace function public.learner_cancel_registration(p_registration_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  r record;
  s record;
  c record;
begin
  if auth.uid() is null then
    raise exception '請先登入';
  end if;

  select * into r from public.registrations where id = p_registration_id for update;
  if not found then
    raise exception '找不到這筆報名';
  end if;
  if r.learner_id <> auth.uid() then
    raise exception '沒有權限取消這筆報名';
  end if;

  select * into s from public.sessions where id = r.session_id;
  select * into c from public.courses where id = s.course_id;

  if now() > s.start_at - interval '24 hours' then
    raise exception '開課前 24 小時內無法自行取消，請聯絡教練協助處理';
  end if;

  if r.status = 'confirmed' then
    update public.registrations
    set status = 'refunded', cancelled_at = now(), refund_amount = r.amount, refund_fee_amount = 0
    where id = r.id;

    perform public.create_notification(
      r.learner_id, 'learner_cancelled',
      '取消成功：' || c.title,
      '已為你取消報名，款項 NT$' || r.amount || ' 將原路全額退還。',
      '/my-courses', true
    );
  elsif r.status = 'pending_match' then
    update public.registrations
    set status = 'cancelled', cancelled_at = now()
    where id = r.id;

    perform public.create_notification(
      r.learner_id, 'learner_cancelled',
      '取消成功：' || c.title,
      '已為你取消報名，尚未扣款。',
      '/my-courses', true
    );
  else
    raise exception '這筆報名目前狀態無法取消（%）', r.status;
  end if;

  perform public.create_notification(
    c.coach_id, 'learner_cancelled',
    '學員取消報名：' || c.title,
    '有學員取消了這個場次的報名。',
    '/coach/courses/' || c.id, false
  );
end;
$$;

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

  fee := round(r.amount * 0.30, 2);

  update public.registrations
  set status = 'partial_refunded',
      cancelled_at = now(),
      refund_amount = r.amount - fee,
      refund_fee_amount = fee
  where id = r.id;

  perform public.create_notification(
    r.learner_id, 'refunded_by_coach',
    '已退款：' || c.title,
    '教練已協助處理退款 NT$' || (r.amount - fee) || '（已扣30%平台手續費）。',
    '/my-courses', true
  );
end;
$$;

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
  if auth.uid() is null then
    raise exception '請先登入';
  end if;

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

-- ============================================================
-- 二、create_notification：只給系統內部（SECURITY DEFINER 函式／trigger）呼叫
-- ============================================================

revoke execute on function public.create_notification(uuid, text, text, text, text, boolean) from public, anon, authenticated;

-- ============================================================
-- 三、移除 v3 遺留函式
-- ============================================================

drop function if exists public.cancel_understaffed_courses();
