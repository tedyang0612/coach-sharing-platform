-- coach_profiles 新增「生活／運動照片」欄位（PM 決定，2026-10-04）。
--
-- 教練照片拆成兩張，都必填：
--   * 大頭貼：沿用既有的 photo_url，不動
--   * 生活／運動照片：這個新欄位，用在首頁「推薦教練」卡片與教練個人檔案
--
-- 欄位可為 null：既有的資料列沒有這張照片，「必填」由教練申請表單與 server action 檢查
-- （牛牛的 4.0／9.0），不加 not null，避免既有資料與後續的補件流程出問題。
--
-- 讀取：coach_profiles 目前是「整表 revoke select、只 grant 公開欄位」
-- （20261002000020 起，後續 20261002000021 加 avg_rating／review_count、
-- 20261003000024 加 display_name 都是用「加 grant」的方式）。column-level grant 是累加的，
-- 這裡只加新欄位，不會動到其他欄位的權限。row 層級仍由既有 policy 控制（只有審核通過的教練公開）。
--
-- 寫入：coach_profiles 的 insert／update 沒有欄位層級的限制，教練本人申請、補件重送、編輯個人檔案
-- 都由既有 RLS policy 放行；guard_coach_application_fields()（20261003000024）只會還原
-- 審核狀態、原因、審核者、認證與評分這幾個欄位，不會動到新欄位。
--
-- 讀自己的申請：get_my_coach_application() 與 get_coach_application_for_admin() 回傳整列
-- public.coach_profiles（select *），新增欄位後會自動帶出，不需要重建函式。
--
-- 檔案放在既有的 coach-photos bucket（公開），路徑規則和大頭貼相同（{user_id}/...），
-- 既有的 storage policy 只檢查第一層資料夾是自己的 user id，同一個使用者可以放多個檔案，不需要新 policy。

alter table public.coach_profiles add column if not exists lifestyle_photo_url text;

comment on column public.coach_profiles.lifestyle_photo_url is
  '教練生活／運動照片的公開網址，檔案放在 coach-photos bucket；首頁推薦教練卡片與教練個人檔案使用。'
  '可為 null（既有資料沒有），新申請與編輯時由表單檢查必填。';

grant select (lifestyle_photo_url) on public.coach_profiles to anon, authenticated;
