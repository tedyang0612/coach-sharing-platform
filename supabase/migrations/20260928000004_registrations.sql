-- registrations：報名與成團（PRD 五-3.0）
-- 涵蓋：一鍵報名、健康聲明勾選、額滿候補、取消報名、48hr 未成團自動取消
-- 「加入 Google 日曆」改用一鍵連結（Google Calendar 的 render URL），不用 OAuth、不用存 token，
-- 所以這裡沒有任何日曆相關欄位——連結是用 courses 的時間/地點資料在前端組出來的

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  learner_id uuid not null references public.profiles (id) on delete cascade,

  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'waitlisted', 'cancelled')),

  -- 一鍵報名的當下就要勾健康聲明，所以這裡直接要求 true，不允許存在「未勾但已報名」的資料
  health_declaration_agreed boolean not null check (health_declaration_agreed = true),
  health_declaration_agreed_at timestamptz not null default now(),

  created_at timestamptz not null default now(),
  cancelled_at timestamptz,

  -- 同一個學員對同一堂課只會有一筆報名紀錄，取消/候補都是改這筆的 status，不是刪除重建
  unique (course_id, learner_id)
);

comment on column public.registrations.status is 'pending=候處理；confirmed=已成團確認；waitlisted=候補中；cancelled=已取消（含48hr未成團自動取消）';

create index if not exists registrations_course_id_idx on public.registrations (course_id);
create index if not exists registrations_learner_id_idx on public.registrations (learner_id);

-- RLS
alter table public.registrations enable row level security;

-- 學員只能看到自己的報名紀錄
drop policy if exists "learners can view own registrations" on public.registrations;
create policy "learners can view own registrations"
  on public.registrations for select
  to authenticated
  using (learner_id = auth.uid());

-- 教練可以看到自己課程底下的所有報名名單（管理成團狀況要用）
drop policy if exists "coaches can view registrations for own courses" on public.registrations;
create policy "coaches can view registrations for own courses"
  on public.registrations for select
  to authenticated
  using (
    exists (
      select 1 from public.courses
      where courses.id = registrations.course_id
        and courses.coach_id = auth.uid()
    )
  );

-- 學員只能幫自己報名，且身份必須是 learner
drop policy if exists "learners can create own registrations" on public.registrations;
create policy "learners can create own registrations"
  on public.registrations for insert
  to authenticated
  with check (
    learner_id = auth.uid()
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'learner')
  );

-- 學員可以改自己的報名（主要用途：取消報名，把 status 改成 cancelled）
drop policy if exists "learners can update own registrations" on public.registrations;
create policy "learners can update own registrations"
  on public.registrations for update
  to authenticated
  using (learner_id = auth.uid())
  with check (learner_id = auth.uid());
