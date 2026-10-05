-- PRD 1.0 規格8：課程封面圖（教練自行上傳 JPG/PNG 5MB 以內，或從平台預設圖庫選擇）
-- 封面圖顯示於課程卡片與詳情頁，存範本／複製課程時一併帶入；場次有人報名後仍可更換（不在編輯鎖定範圍內）

-- null＝未設定，畫面依 sport_type 帶入預設圖（不把預設圖寫進 DB，之後換圖庫不用回填資料）
-- 值可能是：平台圖庫的站內路徑（/course-covers/...），或 course-covers bucket 的公開網址；格式由應用層把關
alter table public.courses add column if not exists cover_image_url text;

comment on column public.courses.cover_image_url is '課程封面圖；null=依運動項目顯示預設圖。站內圖庫路徑或 course-covers bucket 公開網址';

-- ============ Storage：教練上傳的封面圖 ============
-- 檔案大小／格式在 bucket 層限制，前端與 server action 之外的第三道防線（直接打 Storage API 也擋得住）
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('course-covers', 'course-covers', true, 5242880, array['image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 檔案路徑規則：{教練 user id}/{隨機檔名}.{jpg|png}，只能寫自己的資料夾
-- 公開 bucket 的公開網址不需要 select policy 就能讀；這裡不開 select，避免任何人列出所有檔案

drop policy if exists "approved coaches can upload own course covers" on storage.objects;
create policy "approved coaches can upload own course covers"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'course-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from public.coach_profiles
      where id = auth.uid() and application_status = 'approved'
    )
  );

drop policy if exists "coaches can delete own course covers" on storage.objects;
create policy "coaches can delete own course covers"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'course-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
