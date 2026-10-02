-- coach_profiles：教練身分審核（PRD 4.0）＋教練個人檔案（PRD 9.0），兩個功能共用同一張表
-- 一個帳號最多一份教練申請／檔案（1-1 對 profiles），審核通過前就會有這筆資料，只是 application_status 還不是 approved

create table if not exists public.coach_profiles (
  id uuid primary key references public.profiles (id) on delete cascade,

  -- 公開欄位（9.0 教練個人檔案）
  photo_url text not null,
  sport_categories text[] not null default '{}',
  tags text[] not null default '{}',
  years_experience int,
  bio_experience text not null,
  bio_intro text not null,

  -- 審核欄位（4.0，不公開）
  contact_phone text,
  contact_line text,
  contact_email text,
  contact_social text,
  criminal_record_url text not null,
  criminal_record_uploaded_at timestamptz not null default now(),
  criminal_record_deleted boolean not null default false,
  consent_at timestamptz not null default now(),

  application_status text not null default 'pending'
    check (application_status in ('pending', 'approved', 'needs_more_info', 'rejected')),
  rejection_reason text,
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint coach_profiles_tags_limit check (array_length(tags, 1) is null or array_length(tags, 1) <= 5),
  constraint coach_profiles_rejection_reason_required check (
    application_status not in ('needs_more_info', 'rejected') or rejection_reason is not null
  )
);

comment on table public.coach_profiles is 'PRD 4.0 身分審核 + 9.0 個人檔案；1-1 對應 profiles';
comment on column public.coach_profiles.tags is '特色Tag，上限5個，每個建議10字內（長度由前端表單把關，從平台預設清單選）';
comment on column public.coach_profiles.criminal_record_url is '良民證掃描檔，審核完成7天後應清掉原檔（見排程），這裡只能標記 deleted，實際檔案需在 Storage 層另外刪除';
comment on column public.coach_profiles.application_status is 'pending=審核中；approved=通過；needs_more_info=需補件；rejected=未通過';

create index if not exists coach_profiles_status_idx on public.coach_profiles (application_status);

create trigger set_coach_profiles_updated_at
  before update on public.coach_profiles
  for each row
  execute function public.set_updated_at();

-- 證照：PRD 4.0「證照另外一張一張審核，只要有一張通過就顯示已認證徽章」，所以跟教練檔案本體分開存
create table if not exists public.coach_licenses (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coach_profiles (id) on delete cascade,
  file_url text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists coach_licenses_coach_id_idx on public.coach_licenses (coach_id);

-- RLS
alter table public.coach_profiles enable row level security;
alter table public.coach_licenses enable row level security;

-- 已通過審核的教練檔案公開可讀（含未登入訪客，見 10.0 連結分享）；教練自己任何狀態都看得到自己的
drop policy if exists "approved coach profiles are publicly readable" on public.coach_profiles;
create policy "approved coach profiles are publicly readable"
  on public.coach_profiles for select
  using (application_status = 'approved' or id = auth.uid());

-- 管理員看得到所有申請（審核用）
drop policy if exists "admins can view all coach applications" on public.coach_profiles;
create policy "admins can view all coach applications"
  on public.coach_profiles for select
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin));

-- 使用者可以申請成為教練（建立自己的那一筆）
drop policy if exists "users can apply to become coach" on public.coach_profiles;
create policy "users can apply to become coach"
  on public.coach_profiles for insert
  to authenticated
  with check (id = auth.uid());

-- 教練可以改自己的公開欄位／補件重新送審；但 application_status／reviewed_* 只有管理員能動，用下面的 trigger 擋
drop policy if exists "coaches can update own profile" on public.coach_profiles;
create policy "coaches can update own profile"
  on public.coach_profiles for update
  to authenticated
  using (id = auth.uid() or exists (select 1 from public.profiles where id = auth.uid() and is_admin))
  with check (id = auth.uid() or exists (select 1 from public.profiles where id = auth.uid() and is_admin));

-- 擋下非管理員修改審核欄位（教練補件只能把狀態改回 pending，不能自己核准自己）
create or replace function public.guard_coach_application_fields()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  acting_is_admin boolean;
begin
  select is_admin into acting_is_admin from public.profiles where id = auth.uid();

  if coalesce(acting_is_admin, false) then
    return new;
  end if;

  -- 非管理員：審核相關欄位一律維持原值，且狀態只能被使用者自己改成 'pending'（補件重新送審）
  new.application_status := case when old.application_status = 'needs_more_info' then 'pending' else old.application_status end;
  new.rejection_reason := old.rejection_reason;
  new.reviewed_by := old.reviewed_by;
  new.reviewed_at := old.reviewed_at;
  return new;
end;
$$;

drop trigger if exists guard_coach_application_fields on public.coach_profiles;
create trigger guard_coach_application_fields
  before update on public.coach_profiles
  for each row
  execute function public.guard_coach_application_fields();

-- 證照：教練看得到自己的、管理員看全部；公開頁不需要直接讀這張表（徽章用 EXISTS 判斷即可）
drop policy if exists "coaches can view own licenses" on public.coach_licenses;
create policy "coaches can view own licenses"
  on public.coach_licenses for select
  to authenticated
  using (coach_id = auth.uid() or exists (select 1 from public.profiles where id = auth.uid() and is_admin));

drop policy if exists "coaches can upload own licenses" on public.coach_licenses;
create policy "coaches can upload own licenses"
  on public.coach_licenses for insert
  to authenticated
  with check (coach_id = auth.uid());

-- 證照審核狀態只有管理員能改
drop policy if exists "admins can review licenses" on public.coach_licenses;
create policy "admins can review licenses"
  on public.coach_licenses for update
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin))
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin));
