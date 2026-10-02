-- 牛牛 handoff 文件 finding #7：profiles 目前只有 to authenticated 才能讀
-- （20260928000002_profiles.sql 的 "profiles are readable by any authenticated user"），
-- 完全沒有 anon 的 select 權限。但教練名稱只存在 profiles.display_name
-- （coach_profiles 沒有名稱欄位），未登入訪客在課程卡片／教練個人檔案／
-- 10.0 分享連結都讀不到教練名字，跟 PRD 8.0／10.0「未登入可瀏覽」衝突。
--
-- 做法比照 coach_profiles 的欄位層級安全性：開放 anon 讀，但只能讀
-- id/display_name，phone 跟 is_admin 不對 anon 公開。
-- 注意：authenticated 的權限不變（本來就是整張表 using(true) 可讀，
-- 這支不緊縮，只是這張表本來的設計就讓任何登入者能讀到彼此的 phone，
-- 這題不在本次處理範圍內，先維持現狀）。

drop policy if exists "profiles are readable by any authenticated user" on public.profiles;
create policy "profiles are readable by guests and authenticated users"
  on public.profiles for select
  using (true);

revoke select on public.profiles from anon;
grant select (id, display_name) on public.profiles to anon;
