-- 修補安全性漏洞：profiles 的 UPDATE policy 只檢查「改的是不是自己那一列」
-- (auth.uid() = id)，沒有限制「能改哪些欄位」。20261001000009_profiles.sql
-- 幫 profiles 加上 is_admin 欄位時，沒有一併收緊這條 policy，導致任何登入
-- 使用者都能直接執行：
--   update profiles set is_admin = true where id = auth.uid()
-- 自行把自己升級成管理員。
--
-- RLS policy 沒辦法表達「這一列可以改，但其中某個欄位不能改」，所以用
-- trigger 在 update 前把關：一般使用者（auth.uid() 等於自己）更新自己
-- profile 時，is_admin 一律維持原值，無視傳入的新值；透過 Supabase
-- Dashboard／service_role 操作（這種情境下 auth.uid() 是 null，不等於
-- old.id）則不受影響——管理員要手動把某人升級成 is_admin，只能透過這個
-- 資料庫層管道，這本來就是 is_admin 唯一設計的升級方式（見
-- 20261001000009_profiles.sql 的 comment）。

create or replace function public.guard_profiles_update()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- 只在「使用者更新自己的 profile」這個情境擋 is_admin；
  -- auth.uid() 為 null（Dashboard/service_role 的管理操作）時不受限。
  if auth.uid() is not null and auth.uid() = old.id then
    new.is_admin := old.is_admin;
  end if;
  return new;
end;
$$;

comment on function public.guard_profiles_update is
  '擋掉一般使用者透過 update profiles 自行把 is_admin 改成 true；'
  'Dashboard/service_role（auth.uid() 為 null）的管理操作不受影響';

drop trigger if exists guard_profiles_update on public.profiles;
create trigger guard_profiles_update
  before update on public.profiles
  for each row
  execute function public.guard_profiles_update();
