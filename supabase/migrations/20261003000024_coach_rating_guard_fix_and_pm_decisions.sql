-- 牛牛第二批 handoff，要動手的項目：
-- (2) sync_coach_rating() 被 guard_coach_application_fields() 擋住，星級/評價數永遠不會更新
--     （這是上一輪我自己加鎖 avg_rating/review_count 時造成的regression）
-- (8) reviews 的 insert policy 沒檢查 coach_id，可被繞過前端掛到任何教練身上
-- (13) PM 決定：courses.level 加回「進階」
-- (14) PM 決定：教練申請新增 real_name（不公開）/ display_name（公開）
-- (15) 公告收件人／可見範圍含已退款學員，應排除

-- ============================================================
-- 一、修 sync_coach_rating() 被 guard 擋住的問題（finding #2）
-- ============================================================
-- security definer 不會改變 auth.uid()（它讀的是 request JWT，不是執行角色），
-- 所以 sync_coach_rating()／sync_coach_verified() 這類「由其他 trigger 觸發」的
-- update，一樣會被 guard_coach_application_fields() 當成「使用者本人在改」而鎖欄位。
-- 用 pg_trigger_depth() 判斷：使用者直接 update coach_profiles 時，這個 trigger
-- 是第一層（depth=1）；由 sync_coach_rating／sync_coach_verified 的 AFTER trigger
-- 連帶觸發時，depth 會是 2，可以安全放行（目前只有這兩個系統 trigger 會這樣連帶觸發，
-- 不會因此多開一個使用者可以繞過的後門）。

create or replace function public.guard_coach_application_fields()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  acting_is_admin boolean;
begin
  -- 由其他 trigger（sync_coach_verified／sync_coach_rating）內部觸發的 update，直接放行
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  if auth.uid() is null then
    return new;
  end if;

  select is_admin into acting_is_admin from public.profiles where id = auth.uid();

  if coalesce(acting_is_admin, false) then
    return new;
  end if;

  new.application_status := case
    when old.application_status in ('needs_more_info', 'rejected') then 'pending'
    else old.application_status
  end;
  new.rejection_reason := old.rejection_reason;
  new.reviewed_by := old.reviewed_by;
  new.reviewed_at := old.reviewed_at;
  new.is_verified := old.is_verified;
  new.avg_rating := old.avg_rating;
  new.review_count := old.review_count;
  return new;
end;
$$;

-- ============================================================
-- 二、reviews insert policy 沒檢查 coach_id（finding #8）
-- ============================================================
-- 原本只檢查「這筆 registration 是本人的、狀態是 completed」，沒檢查
-- reviews.coach_id 是不是那筆訂單所屬課程真正的教練。改用 trigger 直接覆寫
-- new.coach_id，前端傳什麼都不採用，從根本上擋掉。

create or replace function public.guard_review_insert()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  actual_coach_id uuid;
begin
  select c.coach_id into actual_coach_id
  from public.registrations r
  join public.sessions s on s.id = r.session_id
  join public.courses c on c.id = s.course_id
  where r.id = new.registration_id;

  if actual_coach_id is null then
    raise exception '找不到這筆訂單對應的教練';
  end if;

  new.coach_id := actual_coach_id;
  return new;
end;
$$;

drop trigger if exists guard_review_insert on public.reviews;
create trigger guard_review_insert
  before insert on public.reviews
  for each row
  execute function public.guard_review_insert();

-- ============================================================
-- 三、courses.level 加回「進階」（finding #13，PM 決定）
-- ============================================================

alter table public.courses drop constraint if exists courses_level_check;
alter table public.courses add constraint courses_level_check
  check (level in ('unlimited', 'beginner', 'intermediate', 'advanced'));

comment on column public.courses.level is 'unlimited=不限；beginner=初級；intermediate=中級；advanced=進階';

-- ============================================================
-- 四、教練申請新增「真實姓名」（不公開）／「暱稱」（公開顯示名稱）（finding #14，PM 決定）
-- ============================================================
-- real_name：管理員核對良民證用，不進白名單，不對外公開。
-- display_name：公開顯示的教練名稱，前端送出時已經算好（有填暱稱用暱稱，沒填用真實姓名），
-- 課程卡片／教練個人檔案／通知建議之後改讀這欄，不要再用 profiles.display_name（那是帳號暱稱）。

alter table public.coach_profiles add column if not exists real_name text not null default '';
alter table public.coach_profiles alter column real_name drop default;
alter table public.coach_profiles add column if not exists display_name text not null default '';
alter table public.coach_profiles alter column display_name drop default;

comment on column public.coach_profiles.real_name is '真實姓名（必填，不公開），管理員核對良民證用';
comment on column public.coach_profiles.display_name is '公開顯示的教練名稱（必填，公開）；前端送出時已處理「有暱稱用暱稱、沒有用真實姓名」的邏輯';

grant select (display_name) on public.coach_profiles to anon, authenticated;

-- ============================================================
-- 五、公告收件人／可見範圍排除已退款學員（finding #15）
-- ============================================================
-- 原本的 status <> 'cancelled' 會把 refunded／partial_refunded／completed 都算進去，
-- PRD 7.0 規格 4／AC 4 的「未取消的報名學員」實際上只該是 pending_match／confirmed。

create or replace function public.notify_announcement_created()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  s record;
  c record;
  r record;
begin
  select * into s from public.sessions where id = new.session_id;
  select * into c from public.courses where id = s.course_id;

  for r in
    select * from public.registrations
    where session_id = new.session_id and status in ('pending_match', 'confirmed')
  loop
    perform public.create_notification(
      r.learner_id, 'coach_announcement',
      '教練公告：' || c.title,
      new.content,
      '/my-courses', true
    );
  end loop;

  return new;
end;
$$;

drop policy if exists "coach and session learners can view announcements" on public.announcements;
create policy "coach and session learners can view announcements"
  on public.announcements for select
  to authenticated
  using (
    coach_id = auth.uid()
    or exists (
      select 1 from public.registrations
      where registrations.session_id = announcements.session_id
        and registrations.learner_id = auth.uid()
        and registrations.status in ('pending_match', 'confirmed')
    )
  );
