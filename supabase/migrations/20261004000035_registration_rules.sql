-- 3.0 報名規則的兩個調整（10/4 決定）：
-- (1) 取消後可以重新報名同一場次
-- (2) 教練不能用學員身分報名自己開的課
--
-- (1) 原本 registrations 有 unique (session_id, learner_id)，學員取消後那筆（status = 'cancelled'）還留著，
--     重新報名會撞到唯一限制。改成「只限制還沒取消的報名」：同一個學員在同一個場次，
--     同時只能有一筆有效報名；取消過的歷史紀錄可以有很多筆。
--     注意：這個定義（status <> 'cancelled'）必須和 guard_registration_insert() 的額滿判斷、
--     get_session_enrollment_counts()、process_session_matching() 一致。
--     refunded／partial_refunded 只會發生在成團（報名截止）之後，那時已經不能再報名，所以不影響重報。
--
-- (2) 在報名前防呆 trigger 加上「報名者不能是課程的教練」。函式本體沿用
--     20261003000026，只多一段檢查。

-- ============================================================
-- 一、唯一限制改成只限制有效報名
-- ============================================================

-- 原本是建表時寫的 unique (session_id, learner_id)，限制名稱是系統自動取的；
-- 這裡不寫死名稱，直接找出「剛好涵蓋這兩欄」的唯一限制再移除，避免名稱不同時 drop 悄悄沒生效。
do $$
declare
  con record;
begin
  for con in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.registrations'::regclass
      and c.contype = 'u'
      and (
        select array_agg(a.attname::text order by a.attname::text)
        from unnest(c.conkey) as k(attnum)
        join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum
      ) = array['learner_id', 'session_id']
  loop
    execute format('alter table public.registrations drop constraint %I', con.conname);
  end loop;
end;
$$;

create unique index if not exists registrations_active_session_learner_idx
  on public.registrations (session_id, learner_id)
  where status <> 'cancelled';

comment on index public.registrations_active_session_learner_idx is
  '同一學員在同一場次只能有一筆有效報名（status <> cancelled）；取消後可重新報名';

-- ============================================================
-- 二、教練不能報名自己的課
-- ============================================================

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

  if v_course.coach_id = new.learner_id then
    raise exception '不能報名自己開設的課程';
  end if;

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
