-- 首頁「推薦教練」（PRD 14.0 規格 6）的資料函式：未登入也能呼叫。
--
-- 為什麼要用資料庫函式：coach_profiles 對 anon 只開放少數欄位（display_name、avg_rating、review_count、
-- lifestyle_photo_url），photo_url、sport_categories、tags、application_status 都沒開；前端用 anon 直接 select
-- 會被擋下。這裡用 security definer 函式只回傳「公開欄位」，不開放表格本身，聯絡方式與真實姓名完全不會出現。
--
-- 規則（PRD 14.0 規格 6、AC 4／5）：
--   * 只列「已認證」的教練：審核通過（application_status = approved）且至少一張證照通過（coach_licenses.status = approved）
--   * 依「當月（台灣時間）課程完成的場次數」由多到少；同數時依招生中的課程數、再依名稱排，確保每次結果一致
--   * 招生中的課程數：已發布、不是範本、至少有一個還沒到報名截止的場次（status = open）的課程數
--   * 沒有符合的教練就回傳空集合（畫面整個區塊不顯示）
--   * p_limit 預設 5、最多 50（PRD 沒有規定張數，由畫面決定）
--
-- 當月完成的場次數以場次「開始時間」落在台灣時間本月為準（status = completed）。

create or replace function public.get_recommended_coaches(p_limit int default 5)
returns table (
  id uuid,
  display_name text,
  photo_url text,
  lifestyle_photo_url text,
  sport_categories text[],
  tags text[],
  avg_rating numeric,
  review_count int,
  open_course_count int,
  month_completed_sessions int
)
language sql
stable
security definer set search_path = public
as $$
  with bounds as (
    select
      (date_trunc('month', now() at time zone 'Asia/Taipei')) at time zone 'Asia/Taipei' as month_start,
      (date_trunc('month', now() at time zone 'Asia/Taipei') + interval '1 month') at time zone 'Asia/Taipei' as month_end
  ),
  verified as (
    select cp.*
    from public.coach_profiles cp
    where cp.application_status = 'approved'
      and exists (
        select 1 from public.coach_licenses l
        where l.coach_id = cp.id and l.status = 'approved'
      )
  ),
  done as (
    select c.coach_id, count(*)::int as n
    from public.sessions s
    join public.courses c on c.id = s.course_id
    cross join bounds b
    where s.status = 'completed'
      and s.start_at >= b.month_start and s.start_at < b.month_end
    group by c.coach_id
  ),
  open_courses as (
    select c.coach_id, count(distinct c.id)::int as n
    from public.courses c
    join public.sessions s on s.course_id = c.id
    where c.status = 'published' and not c.is_template
      and s.status = 'open' and s.registration_deadline_at > now()
    group by c.coach_id
  )
  select
    v.id,
    v.display_name,
    v.photo_url,
    v.lifestyle_photo_url,
    v.sport_categories,
    v.tags,
    v.avg_rating,
    v.review_count,
    coalesce(oc.n, 0) as open_course_count,
    coalesce(d.n, 0) as month_completed_sessions
  from verified v
  left join done d on d.coach_id = v.id
  left join open_courses oc on oc.coach_id = v.id
  order by coalesce(d.n, 0) desc, coalesce(oc.n, 0) desc, v.display_name, v.id
  limit greatest(least(coalesce(p_limit, 5), 50), 0);
$$;

comment on function public.get_recommended_coaches(int) is
  '首頁推薦教練（PRD 14.0）：只列已認證教練，依當月完成場次數排序；只回傳公開欄位，未登入可呼叫';

revoke execute on function public.get_recommended_coaches(int) from public;
grant execute on function public.get_recommended_coaches(int) to anon, authenticated;
