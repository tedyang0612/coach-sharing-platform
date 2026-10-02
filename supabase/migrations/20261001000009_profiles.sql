-- profiles：延伸 auth.users，v4.0 不再用單一 role 欄位
-- 「身分」是動態的：每個帳號預設是學員；是否也是教練看 coach_profiles 是否有 approved 的申請；
-- 是否是管理員看 is_admin（由資料庫層手動設定，不開放一般使用者自己改）

alter table public.profiles drop column if exists role;
alter table public.profiles drop column if exists coach_tagline;
alter table public.profiles drop column if exists certification_status;
alter table public.profiles drop column if exists certification_file_url;

alter table public.profiles add column if not exists is_admin boolean not null default false;

comment on table public.profiles is '延伸 auth.users：所有帳號預設皆為學員身分，教練身分看 coach_profiles，管理員看 is_admin';
comment on column public.profiles.is_admin is '管理員權限，僅能由資料庫層手動設定（無自助升級管道）';

-- 新使用者註冊時自動建立 profile；v4.0 不再從 raw_user_meta_data 讀 role（註冊即學員，見 8.0）
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

-- trigger on_auth_user_created 已在 0002 建立，沿用，不用重建
