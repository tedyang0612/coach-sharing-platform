-- 開啟後續 migration 需要用到的 Postgres 擴充套件
-- earthdistance + cube：用來對 courses.latitude / courses.longitude 做距離排序/篩選
-- pgcrypto：提供 gen_random_uuid()，多數 Supabase 專案已內建，這裡確保存在
create extension if not exists pgcrypto;
create extension if not exists cube;
create extension if not exists earthdistance;

-- 共用的 updated_at 自動更新 trigger function，後面每張有 updated_at 欄位的表都會掛這個
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
