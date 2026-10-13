-- 安全修補（Security Review H1）：coach_profiles INSERT 沒有欄位保護，
-- 任何登入使用者都能直接打 PostgREST 新增一筆 application_status = 'approved'、is_verified = true 的申請，
-- 自己核准自己，繞過良民證與管理員審核。
--
-- 原因：guard_coach_application_fields() 只掛在 before update；INSERT policy 只檢查 id = auth.uid()，
-- 不管使用者在審核欄位填了什麼。
--
-- 做法：比照 guard_registration_insert()，加一個 before insert trigger，
-- 非管理員新增時一律把「審核欄位／系統計算欄位」重設成初始值，前端傳什麼都不採用。
-- auth.uid() 為 null（Dashboard／service_role 的管理操作，例如 seed 資料）與管理員不受限，
-- 和 guard_coach_application_fields() 的規則一致。

create or replace function public.guard_coach_profile_insert()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  acting_is_admin boolean;
begin
  if auth.uid() is null then
    return new;
  end if;

  select is_admin into acting_is_admin from public.profiles where id = auth.uid();

  if coalesce(acting_is_admin, false) then
    return new;
  end if;

  -- 審核欄位：新申請一律是「審核中」，沒有審核者、沒有退件原因
  new.application_status := 'pending';
  new.rejection_reason := null;
  new.reviewed_by := null;
  new.reviewed_at := null;
  -- 認證徽章與評分：由 sync_coach_verified()／sync_coach_rating() 計算，不接受使用者傳入
  new.is_verified := false;
  new.avg_rating := null;
  new.review_count := 0;
  -- 良民證處理狀態：由系統維護
  new.criminal_record_deleted := false;
  return new;
end;
$$;

comment on function public.guard_coach_profile_insert is
  '非管理員新增 coach_profiles 時，審核欄位／認證／評分／良民證處理狀態一律重設為初始值（擋掉自我核准）';

drop trigger if exists guard_coach_profile_insert on public.coach_profiles;
create trigger guard_coach_profile_insert
  before insert on public.coach_profiles
  for each row
  execute function public.guard_coach_profile_insert();

-- trigger function 不需要被 RPC 呼叫，順手收掉 execute 權限
revoke execute on function public.guard_coach_profile_insert() from public, anon, authenticated;
