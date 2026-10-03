-- PRD 系統規則：場次有人報名後，課程只能改公告與 QA。
-- 原本只在應用層（app/courses/actions.ts updateCourse）把關，courses／sessions 的 UPDATE policy
-- 只檢查擁有權（20261001000011_courses_sessions.sql），直接打 API 就能改價格、人數、時間等欄位。
--
-- 「有人報名」＝該課程（或該場次）有任一筆 registrations.status <> 'cancelled'，
-- 與 guard_registration_insert() 計算額滿的定義一致（20261003000026）。
-- 注意：這個定義會把 refunded／partial_refunded 也算進去，比應用層的 ACTIVE_REGISTRATION_STATUSES 寬。
--
-- 公告是獨立的 announcements 表（只有 insert），不受這裡影響；QA 對應 courses.notes。
-- 封面圖（cover_image_url）依 Ted 決定，有人報名後仍可修改（與 PRD 原文不同）。

-- ============================================================
-- 一、courses：有人報名後只允許改 notes／cover_image_url／updated_at
-- ============================================================
-- 用 to_jsonb 去掉白名單欄位後整列比對，之後新增的欄位也會自動被鎖住，不用回來改白名單。
-- 目前沒有任何 DB 函式會 update courses（只有 set_updated_at trigger 改 updated_at，在白名單內），
-- 所以不需要區分呼叫者。

create or replace function public.guard_course_update_after_registration()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  editable_fields constant text[] := array['notes', 'cover_image_url', 'updated_at'];
begin
  if (to_jsonb(new) - editable_fields) is not distinct from (to_jsonb(old) - editable_fields) then
    return new;
  end if;

  if exists (
    select 1
    from public.registrations r
    join public.sessions s on s.id = r.session_id
    where s.course_id = old.id
      and r.status <> 'cancelled'
  ) then
    raise exception '已有學員報名，僅能修改課程須知與封面圖';
  end if;

  return new;
end;
$$;

comment on function public.guard_course_update_after_registration is
  '課程任一場次有未取消報名時，courses 只允許改 notes／cover_image_url／updated_at';

drop trigger if exists guard_course_update_after_registration on public.courses;
create trigger guard_course_update_after_registration
  before update on public.courses
  for each row
  execute function public.guard_course_update_after_registration();

-- ============================================================
-- 二、sessions：有人報名後鎖住 start_at／end_at／registration_deadline_at
-- ============================================================
-- 系統函式（process_session_matching／send_session_reminders／complete_finished_sessions／
-- coach_cancel_session／notify_min_participants_reached）只改 status／reminder_sent_at／
-- min_reached_notified_at，不會碰這三欄，所以不需要區分呼叫者。
-- status 與其他欄位這支不處理。

create or replace function public.guard_session_time_after_registration()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (new.start_at, new.end_at, new.registration_deadline_at)
     is not distinct from (old.start_at, old.end_at, old.registration_deadline_at) then
    return new;
  end if;

  if exists (
    select 1
    from public.registrations r
    where r.session_id = old.id
      and r.status <> 'cancelled'
  ) then
    raise exception '已有學員報名，無法修改場次時間與報名截止時間';
  end if;

  return new;
end;
$$;

comment on function public.guard_session_time_after_registration is
  '場次有未取消報名時，鎖住 start_at／end_at／registration_deadline_at';

drop trigger if exists guard_session_time_after_registration on public.sessions;
create trigger guard_session_time_after_registration
  before update on public.sessions
  for each row
  execute function public.guard_session_time_after_registration();
