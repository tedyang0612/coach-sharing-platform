-- 48hr 未成團自動取消（PRD 五-3.0）
-- 用 Supabase 內建的 pg_cron 排程，每小時檢查一次：
--   距開課不到 48 小時、狀態還是 published、已確認人數還沒到 min_participants 的課程
--   → 課程標記 cancelled，底下還沒取消的報名也一併標記 cancelled

-- 部分 Supabase 專案的 pg_cron 需要先在 Dashboard → Database → Extensions 手動開啟，
-- 如果這行 create extension 失敗，去 Dashboard 開啟後，只要重跑本檔最下面的 cron.schedule 那段即可
create extension if not exists pg_cron;

create or replace function public.cancel_understaffed_courses()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  -- 先把符合條件的課程標記取消
  update public.courses
  set status = 'cancelled'
  where status = 'published'
    and start_time > now()
    and start_time - now() <= interval '48 hours'
    and (
      select count(*) from public.registrations
      where registrations.course_id = courses.id
        and registrations.status = 'confirmed'
    ) < courses.min_participants;

  -- 再把這些剛被取消的課程底下、還沒取消的報名一併取消
  update public.registrations
  set status = 'cancelled', cancelled_at = now()
  where status in ('pending', 'confirmed', 'waitlisted')
    and course_id in (
      select id from public.courses
      where status = 'cancelled'
        and start_time > now()
    );
end;
$$;

comment on function public.cancel_understaffed_courses() is
  'PRD 五-3.0：距開課不到48小時仍未達最低成團人數，自動取消課程與其報名';

-- 每小時的第 0 分執行一次；要調整頻率或先手動測試，可以在 Supabase Dashboard → Integrations → Cron 裡改
select cron.schedule(
  'cancel-understaffed-courses',
  '0 * * * *',
  $$select public.cancel_understaffed_courses();$$
);
