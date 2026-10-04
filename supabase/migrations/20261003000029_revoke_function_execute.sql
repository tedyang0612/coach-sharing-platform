-- 收回 9 支 SECURITY DEFINER 函式對 anon／authenticated 的 EXECUTE 權限
-- 線上查詢發現其中 8 支對 anon 與 authenticated 都有 EXECUTE（cleanup_criminal_records 為同類排程函式，一併處理）：Postgres 建立函式時預設 GRANT EXECUTE TO PUBLIC，
-- Supabase 的 default privileges 也會另外直接 grant 給 anon／authenticated，所以三個都要 revoke。
-- 結果是任何人（含未登入訪客）都能透過 PostgREST /rpc/ 直接觸發排程函式（成團判斷、撥款等）。
--
-- 函式擁有者（postgres）不受 revoke 影響，pg_cron 以排程建立者身分執行，排程照常運作；
-- 由 SECURITY DEFINER 函式內部呼叫的其他函式，也是以擁有者身分執行，不受影響。

-- ============================================================
-- 一、排程／系統內部用：只給 pg_cron 與擁有者，一般使用者完全不能呼叫
-- ============================================================

revoke execute on function public.process_session_matching() from public, anon, authenticated;
revoke execute on function public.send_session_reminders() from public, anon, authenticated;
revoke execute on function public.complete_finished_sessions() from public, anon, authenticated;
revoke execute on function public.run_weekly_payouts() from public, anon, authenticated;
revoke execute on function public.cleanup_criminal_records() from public, anon, authenticated;

-- 應用層自己切場次，不呼叫這支（見 app/courses/actions.ts createCourse 的註解）
revoke execute on function public.generate_sessions_for_course(uuid) from public, anon, authenticated;

-- ============================================================
-- 二、使用者操作用的 RPC：只開放登入使用者，函式本體再用 auth.uid() 檢查身分
-- ============================================================

revoke execute on function public.learner_cancel_registration(uuid) from public, anon;
grant execute on function public.learner_cancel_registration(uuid) to authenticated;

revoke execute on function public.coach_assist_refund(uuid) from public, anon;
grant execute on function public.coach_assist_refund(uuid) to authenticated;

revoke execute on function public.coach_cancel_session(uuid) from public, anon;
grant execute on function public.coach_cancel_session(uuid) to authenticated;
