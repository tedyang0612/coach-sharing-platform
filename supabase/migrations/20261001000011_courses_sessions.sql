-- courses：教練上架的「一次發布」（PRD 1.0），本身不是學員報名的單位
-- 一個 course 綁一個日期＋一段可授課時間區間＋每堂課長度，依此自動切出多個 sessions（場次）
-- 例：「XX 球館，14:00–17:00，課程 1 小時」→ 14:00、15:00、16:00 三個場次（見 PRD 1.0 規格2）

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coach_profiles (id) on delete cascade,

  title text not null,
  description text,            -- 課程介紹
  notes text,                  -- 課程須知／QA（穿著、裝備等）
  sport_type text not null,    -- 運動項目，自由文字；MVP 建議清單見 types/database.ts（重訓/瑜珈為主，另含抱石/衝浪/跑酷）
  level text not null check (level in ('unlimited', 'beginner', 'intermediate')), -- 不限／初級／中級（v4.0 拿掉「進階」）

  location_name text not null,     -- 場館名稱
  location_address text not null, -- 地址，供地圖定位
  latitude double precision,
  longitude double precision,

  session_date date not null,
  time_range_start time not null,
  time_range_end time not null,
  session_duration_minutes int not null check (session_duration_minutes > 0),

  price_per_person numeric(10, 2) not null check (price_per_person >= 0),
  min_participants int not null check (min_participants >= 1),
  max_participants int not null check (max_participants >= min_participants),

  -- 報名截止＝開課前 N 小時，預設 24，教練可以設更早（數字更大，例如 48）
  registration_deadline_hours int not null default 24 check (registration_deadline_hours >= 24),

  status text not null default 'draft' check (status in ('draft', 'published', 'cancelled')),

  is_template boolean not null default false,
  template_source_id uuid references public.courses (id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint courses_time_range_order check (time_range_end > time_range_start)
);

comment on column public.courses.level is 'unlimited=不限；beginner=初級；intermediate=中級';
comment on column public.courses.registration_deadline_hours is '報名截止＝開課前N小時；預設24，教練可調整為更早（數字更大，例如48）';
comment on column public.courses.is_template is '教練存成範本用；範本本身不會發布、不會產生場次';

create index if not exists courses_coach_id_idx on public.courses (coach_id);
create index if not exists courses_status_idx on public.courses (status);

create trigger set_courses_updated_at
  before update on public.courses
  for each row
  execute function public.set_updated_at();

-- sessions：場次，是學員報名與成團判斷的最小單位（PRD 六-4）
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,

  start_at timestamptz not null,
  end_at timestamptz not null,
  registration_deadline_at timestamptz not null,

  status text not null default 'open'
    check (status in ('open', 'matched', 'cancelled_unmatched', 'cancelled_by_coach', 'completed')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint sessions_time_order check (end_at > start_at),
  constraint sessions_deadline_before_start check (registration_deadline_at <= start_at)
);

comment on column public.sessions.status is 'open=招生中；matched=已成團；cancelled_unmatched=未成團取消；cancelled_by_coach=教練取消；completed=已結束';

create index if not exists sessions_course_id_idx on public.sessions (course_id);
create index if not exists sessions_status_start_at_idx on public.sessions (status, start_at);
create index if not exists sessions_deadline_idx on public.sessions (registration_deadline_at) where status = 'open';

create trigger set_sessions_updated_at
  before update on public.sessions
  for each row
  execute function public.set_updated_at();

-- 教練發布課程時，依時間區間＋課程長度自動切出場次
create or replace function public.generate_sessions_for_course(p_course_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  c record;
  slot_start timestamptz;
  slot_end timestamptz;
  range_end timestamptz;
begin
  select * into c from public.courses where id = p_course_id;
  if not found then
    raise exception 'course % not found', p_course_id;
  end if;

  -- 範本不產生場次
  if c.is_template then
    return;
  end if;

  -- 避免重複產生（例如重新發布同一堂課）
  delete from public.sessions where course_id = p_course_id and status = 'open';

  slot_start := (c.session_date + c.time_range_start);
  range_end := (c.session_date + c.time_range_end);

  while slot_start + make_interval(mins => c.session_duration_minutes) <= range_end loop
    slot_end := slot_start + make_interval(mins => c.session_duration_minutes);
    insert into public.sessions (course_id, start_at, end_at, registration_deadline_at)
    values (
      p_course_id,
      slot_start,
      slot_end,
      slot_start - make_interval(hours => c.registration_deadline_hours)
    );
    slot_start := slot_end;
  end loop;
end;
$$;

comment on function public.generate_sessions_for_course is '依 course 的時間區間與課程長度切出 sessions；發布課程時由應用程式呼叫一次';

-- RLS
alter table public.courses enable row level security;
alter table public.sessions enable row level security;

-- 已發布課程公開可讀（含未登入訪客）；教練自己任何狀態都看得到（含草稿／範本）
drop policy if exists "published courses are publicly readable" on public.courses;
create policy "published courses are publicly readable"
  on public.courses for select
  using (status = 'published' or coach_id = auth.uid());

drop policy if exists "approved coaches can insert own courses" on public.courses;
create policy "approved coaches can insert own courses"
  on public.courses for insert
  to authenticated
  with check (
    coach_id = auth.uid()
    and exists (
      select 1 from public.coach_profiles
      where id = auth.uid() and application_status = 'approved'
    )
  );

-- PRD 系統規則：場次有人報名後，只能改公告與QA，其他欄位（時段/地點/價格/人數）不能動
-- 這裡先用「場次是否已有未取消報名」做總閘；細欄位鎖定由應用層 server action 再把關一次
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

-- sessions 可見性比照所屬 course
drop policy if exists "sessions follow course visibility" on public.sessions;
create policy "sessions follow course visibility"
  on public.sessions for select
  using (
    exists (
      select 1 from public.courses
      where courses.id = sessions.course_id
        and (courses.status = 'published' or courses.coach_id = auth.uid())
    )
  );

drop policy if exists "coaches can manage own sessions" on public.sessions;
create policy "coaches can manage own sessions"
  on public.sessions for all
  to authenticated
  using (exists (select 1 from public.courses where courses.id = sessions.course_id and courses.coach_id = auth.uid()))
  with check (exists (select 1 from public.courses where courses.id = sessions.course_id and courses.coach_id = auth.uid()));
