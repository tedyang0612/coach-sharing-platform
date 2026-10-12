-- 學員（所有帳號）的頭像：「我的帳戶」可以更換照片（2026-10-12 設計師初版）。
--
-- 一、profiles.avatar_url：頭像的公開網址（沒設定為 null，畫面顯示預設人像圖示）
-- 二、Storage bucket「avatars」：公開讀取、JPG/PNG、5MB；檔案一律放在「{使用者 id}/」底下，
--     policy 只允許使用者寫自己的資料夾（做法同 coach-photos，見 20261002000020）
--
-- profiles 的鎖欄位 trigger guard_profiles_update 只擋 is_admin，不影響 avatar_url；
-- RLS 的 "users can update own profile" 允許使用者改自己的資料列，所以不用另外加 policy。

alter table public.profiles add column if not exists avatar_url text;

comment on column public.profiles.avatar_url is
  '頭像的公開網址，檔案放在 avatars bucket 的 {user id}/ 底下；null 代表沒有設定';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "users can upload own avatar" on storage.objects;
create policy "users can upload own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users can update own avatar" on storage.objects;
create policy "users can update own avatar"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users can delete own avatar" on storage.objects;
create policy "users can delete own avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
