-- PRD 1.0 場次設定方式調整（10/3 組員討論決定）：
-- 原本「時間區間＋每堂長度」平均切場次，改成教練逐堂設定開始／結束時間，每堂時長可以不同
-- （例：14:00–15:00、15:00–16:30、16:30–18:00）。
--
-- sessions 表本來就逐筆存每個場次的實際時間，不用改；需要新增的是「課程層級的場次時間表」，
-- 讓範本／複製課程能帶入每一堂的時間（範本不產生 sessions，只能靠這欄記住）。
--
-- 舊欄位 time_range_start／time_range_end／session_duration_minutes 保留不動（not null 也不改），
-- 應用層存檔時自動填入「第一堂開始／最後一堂結束／第一堂時長」，其他模組照舊讀得到。
-- 既有資料 session_slots 為 null，應用層讀取時用舊欄位推回平均切分的時間表。

alter table public.courses add column if not exists session_slots jsonb;

alter table public.courses drop constraint if exists courses_session_slots_is_array;
alter table public.courses add constraint courses_session_slots_is_array
  check (session_slots is null or jsonb_typeof(session_slots) = 'array');

comment on column public.courses.session_slots is
  '每一堂的時間表（台灣時間 HH:MM），格式 [{"start":"14:00","end":"15:00"}, ...]；'
  'null＝舊資料，依 time_range_start／time_range_end／session_duration_minutes 平均切分';
