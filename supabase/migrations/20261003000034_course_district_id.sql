-- courses 改用 district_id 參照 districts（20261003000033），取代 20261002000021 的 city／district 文字欄位。
-- 縣市由 district_id 反查 districts.city，不另外存。
--
-- 舊的 city／district 兩欄在線上 6 筆課程全部是 NULL，沒有資料需要遷移，直接移除（連同索引一起 drop）。
-- 更新鎖：guard_course_update_after_registration()（20261003000031）用 to_jsonb 整列比對，
-- district_id 不在白名單內，有人報名後會自動被鎖，不用改那支 trigger。

-- ============================================================
-- 一、courses：新增 district_id、移除舊文字欄位
-- ============================================================

alter table public.courses
  add column if not exists district_id integer references public.districts (id);

drop index if exists public.courses_city_district_idx;
alter table public.courses drop column if exists city;
alter table public.courses drop column if exists district;

create index if not exists courses_district_id_idx on public.courses (district_id);

comment on column public.courses.district_id is '上課地點的縣市／行政區（參照 districts）；草稿可為空，發布時必填';

-- ============================================================
-- 二、發布時必填 district_id
-- ============================================================
-- 用 trigger 而不是 check constraint：check 會連「已經是 published、但還沒有 district_id 的舊課程」
-- 一起擋住，連改個須知／封面圖都會失敗。這裡只擋「新發布」與「發布後把地點清空」：
--   * 新增時就是 published
--   * 狀態從別的值變成 published
--   * 已發布且原本有地點，卻被改成空
-- 已發布的舊資料（地點為空）照常可以更新其他欄位，等教練補上地點即可。

create or replace function public.require_district_when_published()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'published'
     and new.district_id is null
     and (
       tg_op = 'INSERT'
       or old.status is distinct from 'published'
       or old.district_id is not null
     ) then
    raise exception '發布課程前請先選擇縣市與行政區';
  end if;

  return new;
end;
$$;

comment on function public.require_district_when_published is
  '課程發布（或已發布後）district_id 不得為空；已發布且原本就沒有地點的舊資料不受影響';

drop trigger if exists courses_require_district_when_published on public.courses;
create trigger courses_require_district_when_published
  before insert or update on public.courses
  for each row
  execute function public.require_district_when_published();
