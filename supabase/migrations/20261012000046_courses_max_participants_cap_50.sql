-- 人數上限從最多 999 收緊成最多 50（2026-10-12 牛牛需求：平台定位是小班課，999 等於沒限制、也擋不掉多打一個 0）。
-- 對應表單與 server 端檢查的 MAX_PARTICIPANTS_CAP（app/courses/_lib/course-input.ts）。
--
-- 執行前（10/12）已確認線上 courses 沒有違反新檢查的資料：97 堂課的人數上限最大值是 16，沒有超過 50 的。
-- 套用前請先 `npx supabase db push --dry-run`；若又有人建了超過 50 的課，add constraint 會失敗，請先處理那筆資料。

alter table public.courses drop constraint if exists courses_max_participants_cap;
alter table public.courses add constraint courses_max_participants_cap
  check (max_participants <= 50);
