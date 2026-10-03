-- 8.0 QA 決議（2026-10-03）：暱稱（profiles.display_name）統一長度限制 2-20 字，
-- 中文字／英數都算一個字元，不額外算 byte，所以用 char_length() 而不是 length()/octet_length()。
-- 教練申請那邊（coach_profiles.display_name / real_name）是牛牛 4.0/7.0 的範圍，
-- 她確認後如果也要補，另外開一支 migration，不在這支處理。

alter table public.profiles
  add constraint profiles_display_name_length
  check (char_length(display_name) between 2 and 20);
