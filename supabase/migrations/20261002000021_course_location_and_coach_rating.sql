-- 解決鯨魚 P02（課程搜尋結果）／P03（課程詳情）精修版跟目前 schema 的兩個落差：
-- (1) P02 要「縣市 → 行政區」兩層篩選，但 courses 目前只有自由文字的 location_address，
--     沒有結構化欄位可以篩。
-- (2) P02 的 Session Card、P03 的教練摘要都要顯示「教練平均評分＋評價數」，
--     但目前 reviews 只存單筆評價，沒有任何彙總/快取機制。
--
-- 這支只先加欄位跟同步機制；city/district 實際的縣市/行政區清單，
-- 請跟小柔（Task 2.0 篩選 UI）對過要用哪一份固定清單（直接共用同一份常數檔），
-- 這支 migration 不內建 check 清單，由表單下拉選單把關，保留彈性。

-- ============================================================
-- 一、courses：補結構化地點欄位
-- ============================================================

alter table public.courses add column if not exists city text;
alter table public.courses add column if not exists district text;

comment on column public.courses.city is '縣市，供 P02 地點篩選用；清單由前端共用常數維護，這裡不設 check';
comment on column public.courses.district is '行政區，供 P02 地點篩選用，需搭配 city 一起篩選';

create index if not exists courses_city_district_idx on public.courses (city, district);

-- 先不設 not null：目前已存在的課程資料（草稿/範本）還沒有這兩個值，
-- 等 Task 1.0 開課表單真的加上縣市/行政區選單、小柔的 Task 2.0 篩選也對好清單之後，
-- 再補一支 migration 把這兩欄改成 not null（發布課程時應該要求必填）。

-- ============================================================
-- 二、coach_profiles：教練平均評分／評價數彙總
-- ============================================================

alter table public.coach_profiles add column if not exists avg_rating numeric(2, 1);
alter table public.coach_profiles add column if not exists review_count int not null default 0;

comment on column public.coach_profiles.avg_rating is '教練平均評分（P02 Session Card／P03 教練摘要用），由 sync_coach_rating() 自動同步；null=尚無評價';
comment on column public.coach_profiles.review_count is '教練累積評價數，由 sync_coach_rating() 自動同步';

create or replace function public.sync_coach_rating()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_coach_id uuid;
begin
  v_coach_id := coalesce(new.coach_id, old.coach_id);
  update public.coach_profiles
  set avg_rating = (select round(avg(rating)::numeric, 1) from public.reviews where coach_id = v_coach_id),
      review_count = (select count(*) from public.reviews where coach_id = v_coach_id)
  where id = v_coach_id;
  return coalesce(new, old);
end;
$$;

drop trigger if exists sync_coach_rating on public.reviews;
create trigger sync_coach_rating
  after insert or update or delete on public.reviews
  for each row
  execute function public.sync_coach_rating();

-- avg_rating / review_count 是系統計算欄位，不開放一般使用者直接改——
-- 擴充前一支 migration 已經建立的 guard_coach_application_fields，一併鎖住這兩欄。
create or replace function public.guard_coach_application_fields()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  acting_is_admin boolean;
begin
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

-- avg_rating/review_count 是公開欄位，要讓訪客跟學員查得到——
-- 補進上一支 migration 設的欄位層級 GRANT 白名單。
grant select (avg_rating, review_count) on public.coach_profiles to anon, authenticated;
