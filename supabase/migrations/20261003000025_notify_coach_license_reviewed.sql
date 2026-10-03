-- finding #10（牛牛第二批 handoff）：教練通過審核後可以追加證照送審，
-- 但 coach_licenses 的審核結果目前沒有通知——只有 coach_profiles.application_status
-- 變動時才會通知（0017 的 notify_coach_application_reviewed）。前端文案已經寫
-- 「審核結果會以通知告知」，需要補上。

create or replace function public.notify_coach_license_reviewed()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status is distinct from old.status and new.status in ('approved', 'rejected') then
    perform public.create_notification(
      new.coach_id, 'coach_license_reviewed',
      case new.status
        when 'approved' then '證照審核通過：' || coalesce(nullif(new.name, ''), '未命名證照')
        else '證照審核未通過：' || coalesce(nullif(new.name, ''), '未命名證照')
      end,
      coalesce(new.rejection_reason, '請至個人檔案查看詳情。'),
      '/coach/profile', true
    );
  end if;
  return new;
end;
$$;

drop trigger if exists notify_coach_license_reviewed on public.coach_licenses;
create trigger notify_coach_license_reviewed
  after update of status on public.coach_licenses
  for each row
  execute function public.notify_coach_license_reviewed();
