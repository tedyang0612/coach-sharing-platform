-- PRD v4.8 1.0 規格 4／AC 10：同一堂課只要任一場次有人報名，課程共用資料（名稱、運動、程度、地點、價格、人數、
-- 報名截止設定、介紹）全部鎖定；但場次時間各自判斷：有人報名的場次不能改時間，沒有人報名的場次仍可調整時間、
-- 刪除，也可以新增場次。
--
-- 場次本身（sessions）的時間鎖定早就是逐場次判斷（20261003000031 的 guard_session_time_after_registration），不用改。
-- 要改的是課程層：courses 上還存著各場次時間的彙整（session_slots，以及舊欄位 time_range_start／time_range_end／
-- session_duration_minutes）。教練調整、刪除或新增沒人報名的場次後，應用層要同步更新這幾欄；
-- 但 20261005000039 的鎖定白名單只有 notes、cover_image_url、qa、updated_at，更新這幾欄會被「已有學員報名」擋下。
-- 這裡把這四個欄位加進白名單。它們只是場次時間的彙整（供表單、範本與複製使用），真正的時間以 sessions 為準，
-- 有人報名的場次時間仍然由 sessions 的 trigger 擋住，所以不會讓有人報名的場次時間被改掉。
--
-- 其餘邏輯與 20261005000039 相同（用 to_jsonb 去掉白名單欄位後整列比對，新增的欄位預設就是鎖住的）。

create or replace function public.guard_course_update_after_registration()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  editable_fields constant text[] := array[
    'notes', 'cover_image_url', 'qa', 'updated_at',
    'session_slots', 'time_range_start', 'time_range_end', 'session_duration_minutes'
  ];
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
    raise exception '已有學員報名，課程的名稱、地點、價格、人數等共用資料無法修改，僅能修改課程須知、課程 QA、封面圖與沒有人報名的場次時間';
  end if;

  return new;
end;
$$;

comment on function public.guard_course_update_after_registration is
  '課程任一場次有未取消報名時，courses 只允許改 notes／cover_image_url／qa／updated_at，以及場次時間彙整（session_slots、time_range_*、session_duration_minutes）';
