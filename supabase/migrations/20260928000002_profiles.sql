-- profiles：延伸 auth.users 的使用者資料，教練/學員共用同一張表，用 role 區分
-- 對應：協作文件「登入註冊／個人資料頁（角色區分教練/學員）」＋ PRD 4.0（教練特色標籤／證照審核）

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('coach', 'learner')),
  display_name text not null,
  phone text,

  -- PRD 4.0：教練特色標籤，20 字，禁填聯絡方式（禁填內容由前端表單驗證把關，這裡先只限制長度）
  coach_tagline varchar(20),

  -- PRD 4.0：證照審核與認證徽章
  certification_status text not null default 'unverified'
    check (certification_status in ('unverified', 'pending', 'verified')),
  certification_file_url text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is '延伸 auth.users 的角色資料（教練／學員）';
comment on column public.profiles.coach_tagline is 'PRD 4.0：20 字特色標籤，禁填聯絡方式（前端表單驗證）';
comment on column public.profiles.certification_status is 'PRD 4.0：教練證照審核狀態，MVP 先做人工審核簡化版';

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- 新使用者註冊（auth.users 新增一筆）時，自動在 profiles 建一筆對應資料
-- role / display_name 要在前端呼叫 supabase.auth.signUp() 時透過 options.data 帶進來，
-- 例如：supabase.auth.signUp({ email, password, options: { data: { role: 'coach', display_name: 'xxx' } } })
-- 若沒有帶 role，預設當作學員，避免 signup 直接失敗
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'role', 'learner'),
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;

-- 所有登入者都能讀所有 profile（篩選瀏覽、評價顯示對方名稱都需要）
drop policy if exists "profiles are readable by any authenticated user" on public.profiles;
create policy "profiles are readable by any authenticated user"
  on public.profiles for select
  to authenticated
  using (true);

-- 只能改自己的 profile
drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- insert 只透過上面的 trigger（security definer）進行，不開放一般使用者直接 insert
