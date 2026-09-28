-- courses：教練開課上架（PRD 五-1.0）
-- sport_type 故意用一般文字而非資料庫層級的清單，之後要加新運動類型不用跑 migration，
-- 建議的選項清單維護在前端／types 層即可（見 types/database.ts 的 SPORT_TYPES）

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,

  title text not null,
  description text,
  sport_type text not null,
  level text not null check (level in ('beginner', 'intermediate', 'advanced')),

  -- 地點：location 是顯示用地址文字，latitude/longitude 用來做距離排序（見 earthdistance 擴充套件）
  -- 地址怎麼轉成座標（手動選點 / Geocoding API）是上架頁面 UI 的事，不影響這裡的欄位設計
  location text not null,
  latitude double precision,
  longitude double precision,

  start_time timestamptz not null,
  end_time timestamptz not null,
  min_participants int not null check (min_participants >= 1),
  max_participants int not null check (max_participants >= min_participants),

  status text not null default 'draft'
    check (status in ('draft', 'published', 'cancelled', 'completed')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint courses_time_order check (end_time > start_time)
);

comment on column public.courses.sport_type is '一般文字欄位，非資料庫層級 enum；建議選項清單見 types/database.ts';
comment on column public.courses.status is 'draft=草稿未發佈；published=已發佈；cancelled=取消（含48hr未成團自動取消）；completed=已結束';

create index if not exists courses_status_start_time_idx on public.courses (status, start_time);
create index if not exists courses_coach_id_idx on public.courses (coach_id);

create trigger set_courses_updated_at
  before update on public.courses
  for each row
  execute function public.set_updated_at();

-- RLS
alter table public.courses enable row level security;

-- 所有人（含未登入訪客）都能看已發佈的課程；教練自己則不管狀態都能看到自己的課程（含草稿）
drop policy if exists "published courses are publicly readable" on public.courses;
create policy "published courses are publicly readable"
  on public.courses for select
  using (status = 'published' or coach_id = auth.uid());

drop policy if exists "coaches can insert own courses" on public.courses;
create policy "coaches can insert own courses"
  on public.courses for insert
  to authenticated
  with check (
    coach_id = auth.uid()
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'coach')
  );

drop policy if exists "coaches can update own courses" on public.courses;
create policy "coaches can update own courses"
  on public.courses for update
  to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

drop policy if exists "coaches can delete own courses" on public.courses;
create policy "coaches can delete own courses"
  on public.courses for delete
  to authenticated
  using (coach_id = auth.uid());
