-- reviews：v4.0 改成單向（只有學員評教練，拿掉教練評學員／檢舉功能，見 PRD 四、Out-of-Scope）
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null unique references public.registrations (id) on delete cascade, -- 每筆訂單限評一次
  coach_id uuid not null references public.coach_profiles (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,

  rating int not null check (rating between 1 and 5),
  comment text,

  created_at timestamptz not null default now()
);

create index if not exists reviews_coach_id_idx on public.reviews (coach_id);

alter table public.reviews enable row level security;

drop policy if exists "reviews are publicly readable" on public.reviews;
create policy "reviews are publicly readable"
  on public.reviews for select
  using (true);

-- 只有該筆訂單本人，且訂單狀態是「課程完成」才能評價
drop policy if exists "learners can review completed registrations" on public.reviews;
create policy "learners can review completed registrations"
  on public.reviews for insert
  to authenticated
  with check (
    reviewer_id = auth.uid()
    and exists (
      select 1 from public.registrations
      where registrations.id = reviews.registration_id
        and registrations.learner_id = auth.uid()
        and registrations.status = 'completed'
    )
  );

-- announcements：教練對單一場次未取消的報名學員群發公告（PRD 7.0）
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  coach_id uuid not null references public.coach_profiles (id) on delete cascade,
  content text not null,
  sent_at timestamptz not null default now()
);

comment on column public.announcements.content is '純文字，不可填聯絡資訊（由前端/防呆規則把關，聯絡方式統一走行前公告）';

create index if not exists announcements_session_id_idx on public.announcements (session_id);

alter table public.announcements enable row level security;

-- 只有該場次教練自己，以及該場次「未取消」報名的學員看得到
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
        and registrations.status <> 'cancelled'
    )
  );

drop policy if exists "coaches can send announcements for own sessions" on public.announcements;
create policy "coaches can send announcements for own sessions"
  on public.announcements for insert
  to authenticated
  with check (
    coach_id = auth.uid()
    and exists (
      select 1 from public.sessions
      join public.courses on courses.id = sessions.course_id
      where sessions.id = announcements.session_id
        and courses.coach_id = auth.uid()
    )
  );

-- notifications：站內通知中心（PRD 7.0 通知事件表）
-- 設計上不開放使用者直接 insert，一律由 SECURITY DEFINER 的排程/trigger 函式產生，避免偽造通知
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  notification_type text not null,
  title text not null,
  body text,
  link_path text,
  email_sent boolean not null default false, -- MVP 模擬寄信，只記錄「這則有沒有要發 Email」
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

comment on column public.notifications.notification_type is '對照 PRD 7.0 通知事件表，例如 registration_success / matched / unmatched / reminder_24h / pre_class_announcement / session_cancelled / review_invite / review_received / payout_completed / coach_review_result';

create index if not exists notifications_recipient_unread_idx on public.notifications (recipient_id, is_read);

alter table public.notifications enable row level security;

drop policy if exists "users can view own notifications" on public.notifications;
create policy "users can view own notifications"
  on public.notifications for select
  to authenticated
  using (recipient_id = auth.uid());

drop policy if exists "users can mark own notifications read" on public.notifications;
create policy "users can mark own notifications read"
  on public.notifications for update
  to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- 共用的通知建立函式，給下面的排程／trigger 呼叫
create or replace function public.create_notification(
  p_recipient_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_link_path text,
  p_email boolean default false
) returns void
language sql
security definer set search_path = public
as $$
  insert into public.notifications (recipient_id, notification_type, title, body, link_path, email_sent)
  values (p_recipient_id, p_type, p_title, p_body, p_link_path, p_email);
$$;
