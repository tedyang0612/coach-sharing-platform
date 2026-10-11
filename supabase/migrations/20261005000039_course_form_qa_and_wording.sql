-- 開課表單 QA 修正（鯨魚對 PR #8／#9 的回饋）與 PRD v4.6／v4.7 用詞、規則的資料庫部分：
--
--  一、courses 新增 qa（課程 QA，PRD v4.7 1.0 規格 9）與 template_name（範本自訂名稱）
--  二、courses 欄位檢查：每人費用 >= 200、人數上限 <= 999、課程名稱 2–30 字、場館名稱 2–40 字
--  三、有人報名後的鎖定白名單加入 qa（PRD：有人報名後僅能編輯公告、QA 與封面圖）
--  四、districts 新增 sort_order（縣市／行政區依地理位置排序，列表篩選與首頁共用）
--  五、通知與錯誤訊息的「成團」改成「開課」說法（PRD v4.6：待確認開課／確定開課／未達人數取消／開課確認）
--
-- 內部的狀態值（sessions.status = matched／cancelled_unmatched、registrations.status = pending_match 等）
-- 不改名，只改給人看的文字。已經寫進 notifications 的舊通知也不回頭改。
-- 執行前（10/5）已確認線上 courses 沒有違反新檢查的資料（價格低於 200、上限超過 999、名稱過短或過長皆為 0 筆）。

-- ============================================================
-- 一、courses.qa、courses.template_name
-- ============================================================
-- qa 格式：[{"q": "問題", "a": "回答"}, ...]。問題與回答都有填的才會被應用層存進來；
-- 是公開內容，聯絡資訊過濾由應用層負責（和課程介紹、須知相同）。
-- template_name 只有範本（is_template = true）會用到，讓教練自行命名，例如「【台北】周二晚間基礎瑜珈」。

alter table public.courses add column if not exists qa jsonb not null default '[]'::jsonb;
alter table public.courses add column if not exists template_name text;

alter table public.courses drop constraint if exists courses_qa_is_array;
alter table public.courses add constraint courses_qa_is_array
  check (jsonb_typeof(qa) = 'array');

alter table public.courses drop constraint if exists courses_template_name_length;
alter table public.courses add constraint courses_template_name_length
  check (template_name is null or char_length(btrim(template_name)) between 2 and 40);

comment on column public.courses.qa is
  '課程 QA（PRD v4.7 1.0 規格 9）：[{"q":"問題","a":"回答"}, ...]；公開內容，有人報名後仍可編輯';
comment on column public.courses.template_name is
  '範本名稱（教練自訂）；只有 is_template = true 的課程會用到';

-- ============================================================
-- 二、欄位檢查
-- ============================================================

-- 每人費用：原本建表時寫的是 check (price_per_person >= 0)，限制名稱是系統自動取的；
-- 不寫死名稱，找出「只涵蓋 price_per_person 這一欄」的 check 再移除，避免名稱不同時 drop 悄悄沒生效。
do $$
declare
  con record;
begin
  for con in
    select c.conname
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
    where c.conrelid = 'public.courses'::regclass
      and c.contype = 'c'
      and array_length(c.conkey, 1) = 1
      and a.attname = 'price_per_person'
  loop
    execute format('alter table public.courses drop constraint %I', con.conname);
  end loop;
end;
$$;

alter table public.courses add constraint courses_price_per_person_min
  check (price_per_person >= 200);

-- 人數下限 >= 1、上限 >= 下限 原本就有；補上上限最多 999
alter table public.courses drop constraint if exists courses_max_participants_cap;
alter table public.courses add constraint courses_max_participants_cap
  check (max_participants <= 999);

alter table public.courses drop constraint if exists courses_title_length;
alter table public.courses add constraint courses_title_length
  check (char_length(btrim(title)) between 2 and 30);

alter table public.courses drop constraint if exists courses_location_name_length;
alter table public.courses add constraint courses_location_name_length
  check (char_length(btrim(location_name)) between 2 and 40);

-- ============================================================
-- 三、有人報名後只允許改 notes／cover_image_url／qa／updated_at
-- ============================================================
-- 其餘與 20261003000031 相同：用 to_jsonb 去掉白名單欄位後整列比對，所以新增的欄位預設就是鎖住的，
-- qa 必須明確加進白名單（template_name 只有範本會用，範本不會有報名，不需要）。

create or replace function public.guard_course_update_after_registration()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  editable_fields constant text[] := array['notes', 'cover_image_url', 'qa', 'updated_at'];
begin
  if (to_jsonb(new) - editable_fields) is not distinct from (to_jsonb(old) - editable_fields) then
    return new;
  end if;

  if exists (
    select 1
    from public.registrations r
    join public.sessions s on s.id = r.session_id
    where s.course_id = old.id
      and r.status <> 'cancelled'
  ) then
    raise exception '已有學員報名，僅能修改課程須知、課程 QA 與封面圖';
  end if;

  return new;
end;
$$;

comment on function public.guard_course_update_after_registration is
  '課程任一場次有未取消報名時，courses 只允許改 notes／cover_image_url／qa／updated_at';

-- ============================================================
-- 四、districts.sort_order
-- ============================================================
-- 縣市由北到南、再到東部與離島，台北市與新北市相鄰；縣市內的行政區沿用官方鄉鎮代碼順序。
-- sort_order = 縣市序號 * 1000 + 該縣市內的行政區序號，畫面只要 order by sort_order 即可。

alter table public.districts add column if not exists sort_order integer;

with city_order(city, rank) as (
  values
    ('台北市', 1), ('新北市', 2), ('基隆市', 3), ('桃園市', 4), ('新竹市', 5), ('新竹縣', 6),
    ('苗栗縣', 7), ('台中市', 8), ('彰化縣', 9), ('南投縣', 10), ('雲林縣', 11), ('嘉義市', 12),
    ('嘉義縣', 13), ('台南市', 14), ('高雄市', 15), ('屏東縣', 16), ('宜蘭縣', 17), ('花蓮縣', 18),
    ('台東縣', 19), ('澎湖縣', 20), ('金門縣', 21), ('連江縣', 22)
),
ranked as (
  select d.id,
         co.rank * 1000 + row_number() over (partition by d.city order by d.towncode) as sort_order
  from public.districts d
  join city_order co on co.city = d.city
)
update public.districts d
set sort_order = ranked.sort_order
from ranked
where ranked.id = d.id;

-- 縣市名稱對不上（例如用字不同）時要在這裡中止，不要留下沒有排序值的行政區
do $$
begin
  if exists (select 1 from public.districts where sort_order is null) then
    raise exception 'districts.sort_order 有未填的列，請檢查縣市名稱是否與排序清單一致';
  end if;
end;
$$;

alter table public.districts alter column sort_order set not null;
create unique index if not exists districts_sort_order_idx on public.districts (sort_order);

comment on column public.districts.sort_order is
  '顯示排序：縣市序號 * 1000 + 縣市內行政區序號（由北到南、再到東部與離島）';

-- ============================================================
-- 五、「成團」→「開課」（只改給人看的文字，函式邏輯與 20261002000023／20261001000017／20261003000030 完全相同）
-- ============================================================
-- create or replace 不會動到既有的 EXECUTE 權限（20261003000029／030 收回的設定維持不變）。

-- 5-1 報名截止時的開課確認（20261002000023 的版本）
create or replace function public.process_session_matching()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  s record;
  c record;
  active_count int;
  r record;
  contact_text text;
begin
  for s in
    select * from public.sessions
    where status = 'open' and registration_deadline_at <= now()
    for update skip locked
  loop
    select * into c from public.courses where id = s.course_id;

    select count(*) into active_count
    from public.registrations
    where session_id = s.id and status <> 'cancelled';

    if active_count >= c.min_participants then
      update public.sessions set status = 'matched' where id = s.id;

      select concat_ws(E'\n',
        case when nullif(contact_phone, '')  is not null then '電話：' || contact_phone end,
        case when nullif(contact_line, '')   is not null then 'LINE：' || contact_line end,
        case when nullif(contact_email, '')  is not null then 'Email：' || contact_email end,
        case when nullif(contact_social, '') is not null then '社群：' || contact_social end
      ) into contact_text
      from public.coach_profiles where id = c.coach_id;

      for r in select * from public.registrations where session_id = s.id and status <> 'cancelled' loop
        update public.registrations
        set status = 'confirmed', charged_at = now()
        where id = r.id;

        perform public.create_notification(
          r.learner_id, 'matched',
          '開課確認：' || c.title,
          '恭喜！您報名的【' || c.title || '】確定開課，已為您扣款 NT$' || r.amount || '。以下為課程行前通知：' || E'\n'
            || '時間：' || to_char(s.start_at at time zone 'Asia/Taipei', 'YYYY-MM-DD HH24:MI') || E'\n'
            || '地點：' || c.location_name || '（' || c.location_address || '）' || E'\n'
            || '教練聯絡方式：' || E'\n' || coalesce(contact_text, '（教練未提供）'),
          '/courses/' || c.id, true
        );
      end loop;

      perform public.create_notification(
        c.coach_id, 'matched',
        '場次確定開課：' || c.title,
        '場次已達開課人數並完成扣款。',
        '/coach/courses/' || c.id, true
      );
    else
      update public.sessions set status = 'cancelled_unmatched' where id = s.id;

      for r in select * from public.registrations where session_id = s.id and status <> 'cancelled' loop
        update public.registrations set status = 'cancelled' where id = r.id;

        perform public.create_notification(
          r.learner_id, 'unmatched',
          '未達人數取消：' || c.title,
          '這個場次未達開課人數，已自動取消，不會扣款。',
          '/courses/' || c.id, true
        );
      end loop;

      perform public.create_notification(
        c.coach_id, 'unmatched',
        '場次未達人數取消：' || c.title,
        '這個場次人數未達下限，已自動取消。',
        '/coach/courses/' || c.id, true
      );
    end if;
  end loop;
end;
$$;

-- 5-2 報名成功通知（20261001000017 的版本）
create or replace function public.notify_registration_created()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  s record;
  c record;
begin
  select * into s from public.sessions where id = new.session_id;
  select * into c from public.courses where id = s.course_id;

  perform public.create_notification(
    new.learner_id, 'registration_success',
    '報名成功：' || c.title,
    '已收到你的報名，尚未扣款，將於報名截止時確認是否開課。',
    '/my-courses', true
  );

  perform public.create_notification(
    c.coach_id, 'registration_success',
    '新報名：' || c.title,
    '有新的學員報名這個場次。',
    '/coach/courses/' || c.id, false
  );

  return new;
end;
$$;

-- 5-3 達到開課人數通知（20261001000017 的版本）
create or replace function public.notify_min_participants_reached()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  s record;
  c record;
  active_count int;
  r record;
begin
  select * into s from public.sessions where id = new.session_id for update;

  if s.status <> 'open' or s.min_reached_notified_at is not null then
    return new;
  end if;

  select * into c from public.courses where id = s.course_id;

  select count(*) into active_count
  from public.registrations
  where session_id = s.id and status <> 'cancelled';

  if active_count >= c.min_participants then
    update public.sessions set min_reached_notified_at = now() where id = s.id;

    perform public.create_notification(
      c.coach_id, 'min_participants_reached',
      '已達開課人數：' || c.title,
      '這個場次已達最低開課人數，報名截止後會自動確定開課並扣款。',
      '/coach/courses/' || c.id, false
    );

    for r in select * from public.registrations where session_id = s.id and status <> 'cancelled' loop
      perform public.create_notification(
        r.learner_id, 'min_participants_reached',
        '已達開課人數：' || c.title,
        '這個場次已達最低開課人數，將於報名截止時確認開課。',
        '/my-courses', false
      );
    end loop;
  end if;

  return new;
end;
$$;

-- 5-4 教練取消場次（20261003000030 的版本，只改錯誤訊息）
create or replace function public.coach_cancel_session(p_session_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  s record;
  c record;
  r record;
begin
  if auth.uid() is null then
    raise exception '請先登入';
  end if;

  select * into s from public.sessions where id = p_session_id for update;
  if not found then
    raise exception '找不到這個場次';
  end if;

  select * into c from public.courses where id = s.course_id;
  if c.coach_id <> auth.uid() then
    raise exception '只有這堂課的教練可以取消場次';
  end if;
  if s.status <> 'open' then
    raise exception '這個場次目前狀態無法由教練取消（%）', s.status;
  end if;
  if now() > s.start_at - interval '48 hours' then
    raise exception '開課前 48 小時內，或已確定開課後，系統不提供取消';
  end if;

  update public.sessions set status = 'cancelled_by_coach' where id = s.id;

  for r in select * from public.registrations where session_id = s.id and status <> 'cancelled' loop
    update public.registrations set status = 'cancelled', cancelled_at = now() where id = r.id;

    perform public.create_notification(
      r.learner_id, 'session_cancelled',
      '課程已取消：' || c.title,
      '教練取消了這個場次，未扣款。',
      '/courses/' || c.id, true
    );
  end loop;
end;
$$;
