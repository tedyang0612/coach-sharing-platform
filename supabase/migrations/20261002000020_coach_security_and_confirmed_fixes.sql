-- 打包三件事：
-- (1) 牛牛 Task 4.0 的 SQL 提案（Storage buckets／coach_licenses.name／
--     criminal_record_url nullable／is_verified 同步／guard_coach_application_fields
--     null-auth.uid() 修正／coach_profiles 欄位層級安全性修正）
-- (2) 之前已獨立驗證過、牛牛 handoff 文件裡確認為真的其他漏洞：
--     #2 registrations UPDATE 無欄位限制、#9 notifications UPDATE 無欄位限制
-- 不含 #1（profiles 自升管理員），那個已經在前一支 migration
-- (20261002000019_fix_profiles_admin_leak.sql) 單獨修完。

-- ============================================================
-- 一、Storage：教練申請用的照片／審核文件（比照 course-covers 的做法）
-- ============================================================

-- coach-photos：公開讀取，JPG/PNG、5MB；申請當下還不是審核通過的教練，
-- 所以不比照 course-covers 要求 application_status = 'approved'
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('coach-photos', 'coach-photos', true, 5242880, array['image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "users can upload own coach photo" on storage.objects;
create policy "users can upload own coach photo"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'coach-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users can update own coach photo" on storage.objects;
create policy "users can update own coach photo"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'coach-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'coach-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users can delete own coach photo" on storage.objects;
create policy "users can delete own coach photo"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'coach-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- coach-documents：私有，JPG/PNG/PDF、5MB；放良民證與證照掃描檔，只有本人和管理員可讀
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('coach-documents', 'coach-documents', false, 5242880, array['image/jpeg', 'image/png', 'application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "users can upload own coach document" on storage.objects;
create policy "users can upload own coach document"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'coach-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "owner and admins can read coach documents" on storage.objects;
create policy "owner and admins can read coach documents"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'coach-documents'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (select 1 from public.profiles where id = auth.uid() and is_admin)
    )
  );

drop policy if exists "users can update own coach document" on storage.objects;
create policy "users can update own coach document"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'coach-documents' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'coach-documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users can delete own coach document" on storage.objects;
create policy "users can delete own coach document"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'coach-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- 二、coach_licenses：補證照名稱欄位
-- ============================================================

alter table public.coach_licenses add column if not exists name text not null default '';
alter table public.coach_licenses alter column name drop default;
comment on column public.coach_licenses.name is '證照名稱（必填，例：ACE-CPT）；公開頁顯示已認證證照清單時使用';

-- 教練可以刪掉自己「還沒通過」的證照（傳錯檔、補件時換一張）；已通過的不能自己刪，避免影響徽章
drop policy if exists "coaches can delete own unapproved licenses" on public.coach_licenses;
create policy "coaches can delete own unapproved licenses"
  on public.coach_licenses for delete
  to authenticated
  using (coach_id = auth.uid() and status <> 'approved');

-- ============================================================
-- 三、criminal_record_url 改成可為 null
-- ============================================================
-- cleanup_criminal_records()（20261001000015_scheduled_jobs.sql）會在審核完成 7 天後
-- 把這欄設成 null、並把 criminal_record_deleted 標成 true，但欄位原本是 not null，
-- 排程一跑就會噴錯——這裡修正欄位定義。

alter table public.coach_profiles alter column criminal_record_url drop not null;
comment on column public.coach_profiles.criminal_record_url is '良民證掃描檔，審核完成7天後由排程清掉原檔並設為 null（見 criminal_record_deleted）';

-- ============================================================
-- 四、is_verified：只要有一張證照通過就是已認證教練（PRD 4.0 認證徽章）
-- ============================================================

alter table public.coach_profiles add column if not exists is_verified boolean not null default false;
comment on column public.coach_profiles.is_verified is '只要有一張證照通過審核就是 true（認證徽章）；由 sync_coach_verified() 自動同步，不開放手動改';

create or replace function public.sync_coach_verified()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_coach_id uuid := coalesce(new.coach_id, old.coach_id);
  v_verified boolean;
begin
  select exists (
    select 1 from public.coach_licenses
    where coach_id = v_coach_id and status = 'approved'
  ) into v_verified;

  -- 值沒變就不 update，避免教練新增一張待審證照時白白觸發 coach_profiles 的 guard trigger
  update public.coach_profiles
  set is_verified = v_verified
  where id = v_coach_id and is_verified is distinct from v_verified;

  return null;
end;
$$;

drop trigger if exists sync_coach_verified on public.coach_licenses;
create trigger sync_coach_verified
  after insert or update of status or delete on public.coach_licenses
  for each row
  execute function public.sync_coach_verified();

-- 既有資料補一次（如果已經有測試資料）
update public.coach_profiles cp
set is_verified = exists (
  select 1 from public.coach_licenses cl
  where cl.coach_id = cp.id and cl.status = 'approved'
);

-- ============================================================
-- 五、guard_coach_application_fields 修正：
--    (a) auth.uid() 為 null（Dashboard/service_role 的管理員操作）時不應被當成「非管理員」
--        而把 application_status 還原——這是牛牛發現、已獨立驗證為真的 bug
--    (b) 順便擋掉非管理員直接把 is_verified 改成 true 的漏洞（這個欄位本輪才新增）
-- ============================================================

create or replace function public.guard_coach_application_fields()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  acting_is_admin boolean;
begin
  -- auth.uid() 為 null：透過 Dashboard／service_role 做的管理操作，沒有登入身分可查，
  -- 不受這個 trigger 限制（避免管理員手動審核時被誤判成「非管理員」而被還原狀態）。
  if auth.uid() is null then
    return new;
  end if;

  select is_admin into acting_is_admin from public.profiles where id = auth.uid();

  if coalesce(acting_is_admin, false) then
    return new;
  end if;

  -- 非管理員：審核／系統計算欄位一律維持原值；PRD v4.3 4.0 規格：
  -- 「需補件」或「未通過」都可以修改資料後重新送審，狀態自動回到 pending
  new.application_status := case
    when old.application_status in ('needs_more_info', 'rejected') then 'pending'
    else old.application_status
  end;
  new.rejection_reason := old.rejection_reason;
  new.reviewed_by := old.reviewed_by;
  new.reviewed_at := old.reviewed_at;
  new.is_verified := old.is_verified;
  return new;
end;
$$;

-- trigger 已存在（20261001000010_coach_profiles.sql 建立），函式用 create or replace 直接生效，不用重建 trigger

-- ============================================================
-- 六、coach_profiles 欄位層級安全性：補救聯絡資訊／良民證 URL 公開可讀的問題
-- ============================================================
-- 目前「approved coach profiles are publicly readable」policy 只限制「哪些列」可見，
-- 沒限制「哪些欄位」可見，等於 contact_phone／contact_line／contact_email／contact_social／
-- criminal_record_url 這些審核用欄位，只要那個教練 approved，任何人（含未登入訪客）都查得到。
--
-- 做法：REVOKE 整張表的 select，只 GRANT 公開欄位；本人要讀自己完整資料、
-- 管理員要讀審核用的完整資料，改用 SECURITY DEFINER 函式。

revoke select on public.coach_profiles from anon, authenticated;

grant select (
  id,
  photo_url,
  sport_categories,
  tags,
  years_experience,
  bio_education,
  bio_competition,
  bio_intro,
  is_verified,
  application_status,
  created_at,
  updated_at
) on public.coach_profiles to anon, authenticated;

comment on table public.coach_profiles is
  'PRD 4.0 身分審核 + 9.0 個人檔案；1-1 對應 profiles。'
  '注意：anon/authenticated 只被 GRANT 公開欄位的 select 權限，'
  '聯絡資訊／審核欄位要透過 get_my_coach_application() 或 '
  'list_coach_applications_for_admin() 讀取，不能直接 select *';

-- 本人讀自己完整的申請資料（含聯絡資訊、良民證狀態、審核結果）
create or replace function public.get_my_coach_application()
returns public.coach_profiles
language sql
security definer set search_path = public
stable
as $$
  select * from public.coach_profiles where id = auth.uid();
$$;

-- 管理員讀單一教練的完整申請資料（審核頁用）
create or replace function public.get_coach_application_for_admin(p_coach_id uuid)
returns public.coach_profiles
language plpgsql
security definer set search_path = public
as $$
declare
  acting_is_admin boolean;
  result public.coach_profiles;
begin
  select is_admin into acting_is_admin from public.profiles where id = auth.uid();
  if not coalesce(acting_is_admin, false) then
    raise exception '沒有權限查看教練申請完整資料';
  end if;
  select * into result from public.coach_profiles where id = p_coach_id;
  return result;
end;
$$;

-- 管理員讀所有教練申請的完整列表（審核列表頁用，取代原本的 select('*')）
create or replace function public.list_coach_applications_for_admin()
returns setof public.coach_profiles
language plpgsql
security definer set search_path = public
as $$
declare
  acting_is_admin boolean;
begin
  select is_admin into acting_is_admin from public.profiles where id = auth.uid();
  if not coalesce(acting_is_admin, false) then
    raise exception '沒有權限查看教練申請列表';
  end if;
  return query select * from public.coach_profiles order by created_at desc;
end;
$$;

-- ============================================================
-- 七、registrations：UPDATE 沒有欄位限制，學員／教練能直接改 status／amount
-- ============================================================
-- 原本的想法是用 trigger 鎖欄位，但 status／charged_at／refund_* 這些「本來就該能改」的
-- 欄位沒辦法用「鎖欄位」的方式處理——問題根本不是「哪個欄位不能改」，而是「不該讓使用者
-- 繞過 app 直接 update 這張表」。取消／退款／教練取消場次都已經有 SECURITY DEFINER 的 RPC
-- （learner_cancel_registration／coach_assist_refund／coach_cancel_session，皆由資料表
-- 擁有者執行，天生略過 RLS），所以直接把「學員／教練可以 update 任何欄位」這兩條 policy
-- 整條拿掉即可，不影響上面三個 RPC 繼續運作。
--
-- insert 這邊 guard_registration_insert 本來就會檢查場次狀態／截止時間／額滿，
-- 但沒有強制 status 的初始值，所以使用者可以直接 insert 一筆 status='completed' 的訂單
-- 來跳過成團流程、騙到撥款——這裡一併鎖死。

drop policy if exists "learners can update own registrations" on public.registrations;
drop policy if exists "coaches can update registrations for own sessions" on public.registrations;

create or replace function public.guard_registration_insert()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  s record;
  current_count int;
  c record;
begin
  select * into s from public.sessions where id = new.session_id for update;
  if not found then
    raise exception '場次不存在';
  end if;
  if s.status <> 'open' then
    raise exception '這個場次目前無法報名（狀態：%）', s.status;
  end if;
  if now() >= s.registration_deadline_at then
    raise exception '已超過報名截止時間';
  end if;

  select c.* into c from public.courses c where c.id = s.course_id;

  select count(*) into current_count
  from public.registrations
  where session_id = new.session_id and status <> 'cancelled';

  if current_count >= c.max_participants then
    raise exception '這個場次已額滿';
  end if;

  -- 報名當下一律是「待成團」，金額用課程目前的每人費用當快照；
  -- 不開放使用者在 insert 時夾帶 status/charged_at/refund_* 直接偽造成已完成/已扣款的訂單
  new.amount := c.price_per_person;
  new.status := 'pending_match';
  new.charged_at := null;
  new.cancelled_at := null;
  new.refund_amount := null;
  new.refund_fee_amount := null;
  return new;
end;
$$;

-- trigger 已存在（20261001000012_registrations.sql 建立），函式用 create or replace 直接生效

-- ============================================================
-- 八、notifications：UPDATE 沒有欄位限制，使用者能改掉別人看不到的通知內容
-- ============================================================
-- 設計上使用者只應該能把自己的通知標記已讀，不該能改 title/body/link_path 等內容。

create or replace function public.guard_notifications_update()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  new.recipient_id := old.recipient_id;
  new.notification_type := old.notification_type;
  new.title := old.title;
  new.body := old.body;
  new.link_path := old.link_path;
  new.email_sent := old.email_sent;
  new.created_at := old.created_at;
  return new;
end;
$$;

comment on function public.guard_notifications_update is
  '擋掉 update notifications 時連帶改掉內容欄位；使用者只能動 is_read';

drop trigger if exists guard_notifications_update on public.notifications;
create trigger guard_notifications_update
  before update on public.notifications
  for each row
  execute function public.guard_notifications_update();
