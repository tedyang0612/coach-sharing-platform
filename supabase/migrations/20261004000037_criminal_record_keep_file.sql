-- 良民證原檔：Demo 階段不實際刪檔（團隊決議，2026-10-04），讓資料庫狀態與事實一致。
--
-- 原本 cleanup_criminal_records()（20261001000015）每天把「審核完成滿 7 天」的教練標記
-- criminal_record_deleted = true，並把 criminal_record_url 清成空值，看起來像「原檔已刪除」；
-- 但資料庫排程只能改資料表，沒辦法刪 Supabase Storage 裡的檔案，原檔其實還在，
-- 而且路徑被清掉之後，就再也找不到要刪哪個檔案。
--
-- 團隊決議（方案 C）：Demo 使用的都是假文件，原檔放在私有的 coach-documents bucket
-- （只有本人與管理員讀得到），先不實作真正的刪除。所以這裡：
--   * 排程停止執行（不再標記「已刪除」，也不再清掉檔案路徑）
--   * 函式保留但不做事，之後要做自動刪除時直接改這支函式即可
--   * 欄位註解寫明現況
-- 日後要符合 PRD「審核完成 7 天後刪除原檔」，做法是寫 Edge Function 先刪 Storage 的檔案、
-- 成功後才清路徑與標記，再重新建立排程；做之前請先看這份註解。
--
-- 影響：criminal_record_deleted 不會再被設為 true。教練申請頁（4.0）用它判斷
-- 「原檔已刪除、重新申請需重新上傳」，現在不會再出現這個情況，重新送審可沿用原本上傳的檔案。

create or replace function public.cleanup_criminal_records()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  -- 目前刻意不做任何事（見檔案開頭說明）。
  null;
end;
$$;

comment on function public.cleanup_criminal_records() is
  '停用中（團隊決議 2026-10-04）：Demo 用假文件，不實際刪除良民證原檔，也不再標記已刪除或清掉路徑。'
  '日後要做自動刪除：先用 Edge Function 刪除 Storage 檔案，成功後再清 criminal_record_url 並設 criminal_record_deleted，然後重新建立排程。';

-- 停止每天執行的排程（找不到這個排程時不報錯）
do $$
begin
  if exists (select 1 from cron.job where jobname = 'cleanup-criminal-records') then
    perform cron.unschedule('cleanup-criminal-records');
  end if;
end;
$$;

comment on column public.coach_profiles.criminal_record_deleted is
  '目前恆為 false：Demo 階段不實際刪除良民證原檔（見 20261004000037）；日後實作 Edge Function 刪檔後才會設為 true';

comment on column public.coach_profiles.criminal_record_url is
  '良民證檔案在 coach-documents bucket 的路徑（不是完整網址）；目前不會被排程清掉，也不會實際刪檔（見 20261004000037）';
