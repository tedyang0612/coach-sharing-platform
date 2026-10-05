-- 修 guard_registration_insert() 的 bug（Ted 測 1.0 PR #3 時發現）：
-- 函式裡宣告了一個叫 c 的 record 變數，又在同一段 select 裡把 courses 也取別名成 c，
-- 導致 Postgres 分不清楚 c.* 指的是變數還是 table，報
-- "ERROR: 42702: column reference "c.*" is ambiguous"。
-- 這是 20261002000020_coach_security_and_confirmed_fixes.sql 這支本身的 bug，
-- 跟牛牛的任何 handoff 內容無關，單純改 table alias 名稱避開衝突，邏輯完全不變。

create or replace function public.guard_registration_insert()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  s record;
  current_count int;
  v_course record;
begin
  select * into s from public.sessions where id = new.session_id for update;
  if not found then
    raise exception '場次不存在';
  end if;
  if s.status <> 'open' then
    raise exception '這個場次目前無法報名（狀態：%）', s.status;
  end if;
  if now() >= s.registration_deadline_at then
    raise exception '已超過報名截止時間';
  end if;

  select * into v_course from public.courses where id = s.course_id;

  select count(*) into current_count
  from public.registrations
  where session_id = new.session_id and status <> 'cancelled';

  if current_count >= v_course.max_participants then
    raise exception '這個場次已額滿';
  end if;

  -- 報名當下一律是「待成團」，金額用課程目前的每人費用當快照；
  -- 不開放使用者在 insert 時夾帶 status/charged_at/refund_* 直接偽造成已完成/已扣款的訂單
  new.amount := v_course.price_per_person;
  new.status := 'pending_match';
  new.charged_at := null;
  new.cancelled_at := null;
  new.refund_amount := null;
  new.refund_fee_amount := null;
  return new;
end;
$$;

-- trigger 已存在（20261001000012_registrations.sql 建立），函式用 create or replace 直接生效
