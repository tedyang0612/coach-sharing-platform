-- v4.0 PRD 凍版後的全面重寫：拿掉舊版（教練開課=單一時段、雙向評價、教練檢舉學員）的物件
-- 這些表都還沒有真實資料（Sprint 3 第一天），直接 drop 重建，不做資料遷移

-- 先拿掉舊的排程，避免殘留引用已刪除的表
select cron.unschedule('cancel-understaffed-courses')
where exists (select 1 from cron.job where jobname = 'cancel-understaffed-courses');

drop table if exists public.reports cascade;
drop table if exists public.reviews cascade;
drop table if exists public.registrations cascade;
drop table if exists public.courses cascade;

-- profiles 保留，但下一支 migration 會重新定義欄位（role / coach_tagline / certification_* 不再用）
