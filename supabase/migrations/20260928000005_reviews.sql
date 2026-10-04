-- reviews：雙向評價（PRD 五-5.0）
-- 不額外存「方向」欄位——要判斷是「教練評學員」還是「學員評教練」，
-- 用 reviewer_id 是否等於該堂課的 courses.coach_id 判斷即可，查詢時 join courses 就知道

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  reviewee_id uuid not null references public.profiles (id) on delete cascade,

  rating int not null check (rating between 1 and 5),
  comment text,

  created_at timestamptz not null default now(),

  -- 同一堂課裡，同一個人對同一個對象只能評一次
  unique (course_id, reviewer_id, reviewee_id),
  check (reviewer_id <> reviewee_id)
);

create index if not exists reviews_reviewee_id_idx on public.reviews (reviewee_id);

-- RLS
alter table public.reviews enable row level security;

-- 評價公開可讀（教練/學員的 Profile 頁要能顯示對方收到的評價）
drop policy if exists "reviews are publicly readable" on public.reviews;
create policy "reviews are publicly readable"
  on public.reviews for select
  using (true);

-- 只有實際參與過該堂課的人，才能對另一方留評價：
-- 情況一：reviewer 是這堂課的教練，reviewee 是這堂課裡「已確認成團」的學員
-- 情況二：reviewer 是這堂課裡「已確認成團」的學員，reviewee 是這堂課的教練
drop policy if exists "only actual course participants can leave a review" on public.reviews;
create policy "only actual course participants can leave a review"
  on public.reviews for insert
  to authenticated
  with check (
    reviewer_id = auth.uid()
    and (
      (
        exists (
          select 1 from public.courses
          where courses.id = course_id
            and courses.coach_id = auth.uid()
        )
        and exists (
          select 1 from public.registrations
          where registrations.course_id = reviews.course_id
            and registrations.learner_id = reviews.reviewee_id
            and registrations.status = 'confirmed'
        )
      )
      or
      (
        exists (
          select 1 from public.registrations
          where registrations.course_id = reviews.course_id
            and registrations.learner_id = auth.uid()
            and registrations.status = 'confirmed'
        )
        and exists (
          select 1 from public.courses
          where courses.id = reviews.course_id
            and courses.coach_id = reviews.reviewee_id
        )
      )
    )
  );
