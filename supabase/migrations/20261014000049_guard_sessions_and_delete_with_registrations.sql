-- 安全修補（Security Review M1、M2）
--
-- M1：教練可以直接改 sessions.status
--   sessions 的 RLS policy「coaches can manage own sessions」是 for all，教練拿自己的登入 token 直接對 PostgREST
--   update／insert sessions，能把場次直接改成 matched／completed（跳過成團流程，影響撥款資格），
--   或 insert 一筆 status = 'matched' 的場次。20261003000031 只鎖了時間欄位，status 等系統欄位沒鎖。
-- M2：教練可以刪除已有報名的課程／場次
--   courses／sessions 的 delete policy 讓教練能刪自己的課；registrations.session_id、sessions.course_id 都是
--   on delete cascade，刪課會連帶把已付款（待成團／訂單成立／已退款）的報名紀錄一起刪掉，金流紀錄與退款義務就消失了。
--
-- 做法：兩支 trigger function 只限制「使用者直接對資料表下指令」的情況（PostgREST 的 authenticated／anon 角色）。
-- 用 current_user 判斷，而且 function 刻意不是 security definer：
--   * 由 security definer 函式（coach_cancel_session、process_session_matching、排程等，以 owner 身分執行）
--     發出的 update，current_user 是 owner，不受限，所以既有的取消、成團、完課、撥款流程照常運作；
--   * pg_cron、Dashboard／service_role 的管理操作 current_user 也不是 authenticated／anon，同樣不受限；
--   * 注意：不能用 auth.uid() 判斷——security definer 不會改變 auth.uid()（它讀 request JWT），
--     教練呼叫 coach_cancel_session() 時 auth.uid() 仍是那位教練。
--
-- 應用層（app/courses/actions.ts）只會刪「沒有任何報名紀錄」的場次、只 insert 預設 status 的場次，不受影響。

-- ============================================================
-- 一、sessions：使用者不能直接 insert／update 系統欄位（M1）
-- ============================================================

create or replace function public.guard_session_system_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status <> 'open'
       or new.reminder_sent_at is not null
       or new.min_reached_notified_at is not null
       or new.cancel_reason is not null
       or new.cancel_note is not null then
      raise exception '新增場次時狀態一律是招生中，不能指定場次狀態或系統欄位';
    end if;
    return new;
  end if;

  -- UPDATE
  if new.status is distinct from old.status
     or new.reminder_sent_at is distinct from old.reminder_sent_at
     or new.min_reached_notified_at is distinct from old.min_reached_notified_at
     or new.cancel_reason is distinct from old.cancel_reason
     or new.cancel_note is distinct from old.cancel_note then
    raise exception '場次狀態與系統欄位只能由系統變更（取消場次請使用「取消場次」功能）';
  end if;
  return new;
end;
$$;

comment on function public.guard_session_system_fields is
  '使用者（authenticated／anon）不能直接 insert／update sessions 的 status、reminder_sent_at、min_reached_notified_at、cancel_*；系統函式（security definer）與排程不受限';

drop trigger if exists guard_session_system_fields on public.sessions;
create trigger guard_session_system_fields
  before insert or update on public.sessions
  for each row
  execute function public.guard_session_system_fields();

-- ============================================================
-- 二、courses／sessions：已有報名紀錄就不能直接刪除（M2）
-- ============================================================
-- 「有報名紀錄」＝存在 status 不是 cancelled 的報名（待成團、訂單成立、已退款、部分退款、課程完成都算，
-- 這些都有金流或撥款紀錄）。只有已取消（未扣款）報名的課程／場次可以刪。
-- 教練讀得到自己場次的報名（RLS：coaches can view registrations for own sessions），所以 exists 查得到。

create or replace function public.guard_delete_session_with_registrations()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return old;
  end if;

  if exists (
    select 1 from public.registrations r
    where r.session_id = old.id and r.status <> 'cancelled'
  ) then
    raise exception '這個場次已有學員報名，不能刪除（刪除會一併刪掉報名與付款紀錄）';
  end if;
  return old;
end;
$$;

create or replace function public.guard_delete_course_with_registrations()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return old;
  end if;

  if exists (
    select 1
    from public.registrations r
    join public.sessions s on s.id = r.session_id
    where s.course_id = old.id and r.status <> 'cancelled'
  ) then
    raise exception '這堂課已有學員報名，不能刪除（刪除會一併刪掉報名與付款紀錄）';
  end if;
  return old;
end;
$$;

comment on function public.guard_delete_session_with_registrations is
  '使用者直接刪除 sessions 時，若有未取消的報名就擋下（避免 cascade 刪掉報名與付款紀錄）';
comment on function public.guard_delete_course_with_registrations is
  '使用者直接刪除 courses 時，若任一場次有未取消的報名就擋下（避免 cascade 刪掉報名與付款紀錄）';

drop trigger if exists guard_delete_session_with_registrations on public.sessions;
create trigger guard_delete_session_with_registrations
  before delete on public.sessions
  for each row
  execute function public.guard_delete_session_with_registrations();

drop trigger if exists guard_delete_course_with_registrations on public.courses;
create trigger guard_delete_course_with_registrations
  before delete on public.courses
  for each row
  execute function public.guard_delete_course_with_registrations();

-- trigger function 不需要被 RPC 呼叫
revoke execute on function public.guard_session_system_fields() from public, anon, authenticated;
revoke execute on function public.guard_delete_session_with_registrations() from public, anon, authenticated;
revoke execute on function public.guard_delete_course_with_registrations() from public, anon, authenticated;
