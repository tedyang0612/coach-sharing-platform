-- PRD v4.10 取消與退款（第二步：資料庫）。接續 20261005000044。
--
-- 一、courses.registration_deadline_hours 檢查改成只允許 24、48、72（原本 >= 24）。
--     10/9 查過線上資料：只有 24／48／72，不需要回填。
-- 二、取消原因（Ted 10/9 決定：新增 cancel_reason 欄位，不新增「平台取消」專屬狀態）：
--     sessions.cancel_reason：unmatched=未達人數／coach=教練取消／platform=平台取消
--     sessions.cancel_note：平台取消的文字說明（選填）
--     registrations.cancel_reason：learner=學員自己取消／unmatched／coach／platform
--     sessions.status 多放行一個通用的 'cancelled'（給平台取消用，畫面看 cancel_reason）；
--     舊的 cancelled_unmatched／cancelled_by_coach 保留，並補上 cancel_reason。
-- 三、learner_cancel_registration() 依級距計算（與 app/registrations/_lib/cancel-rules.ts 的
--     calculateLearnerCancel() 同一組規則與四捨五入）：
--       報名截止前（待確認開課）：免費取消，狀態 cancelled
--       已扣款（confirmed）：距開課 >= 48 小時 手續費 30%（教練 15／平台 15）；
--                           24 <= 小時 < 48 手續費 50%（教練 25／平台 25）；< 24 小時不能取消
--       教練份額先算 round(amount * pct / 100)，平台 = 手續費 - 教練份額；教練份額不再扣 5% 媒合費
-- 四、移除 coach_assist_refund()（v4.8 的 24 小時內 50%）。
-- 五、新增 admin_cancel_session()：平台取消，管理員限定。已扣款者全額退款（refunded），
--     未扣款者不扣款（cancelled）；先前已部分退款者補退手續費、教練的取消補償作廢（已撥款者擋下，人工處理）；
--     場次改為 cancelled、cancel_reason = platform；不撥款給教練。
-- 六、coach_cancel_session()：只能取消「沒有人報名」的場次，拿掉開課前 48 小時的條件。
-- 七、process_session_matching()：未達人數取消時寫入 cancel_reason。
-- 八、補一筆舊資料：v4.7 的 50% 部分退款還沒有教練補償的，補上課程費用的 25%。
-- 九、guard_registration_insert()：新增報名時一併清掉 cancel_reason、coach_compensation_amount。
--
-- run_weekly_payouts() 不需要改：040／042 的版本已經是「教練補償 = registrations.coach_compensation_amount、
-- 不扣 5% 媒合費」，新級距只是改寫入的金額。不到 24 小時不能取消者維持 completed（教練 95%／平台 5%）。
--
-- 函式權限：create or replace 保留既有的 EXECUTE 設定（20261003000029／030）；
-- 新函式在這裡自己 revoke／grant。

-- ============================================================
-- 一、報名截止小時數：只允許 24、48、72
-- ============================================================

do $$
declare
  con record;
begin
  for con in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.courses'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) like '%registration_deadline_hours%'
  loop
    execute format('alter table public.courses drop constraint %I', con.conname);
  end loop;
end;
$$;

alter table public.courses
  add constraint courses_registration_deadline_hours_check
  check (registration_deadline_hours in (24, 48, 72));

comment on column public.courses.registration_deadline_hours is
  '報名截止＝開課前N小時；只允許 24／48／72，預設 24（PRD v4.10）';

-- ============================================================
-- 二、取消原因
-- ============================================================

-- 2-1 sessions：放行通用的 cancelled 狀態
do $$
declare
  con record;
begin
  for con in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.sessions'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) like '%cancelled_unmatched%'
  loop
    execute format('alter table public.sessions drop constraint %I', con.conname);
  end loop;
end;
$$;

alter table public.sessions
  add constraint sessions_status_check
  check (status in ('open', 'matched', 'cancelled', 'cancelled_unmatched', 'cancelled_by_coach', 'completed'));

alter table public.sessions add column if not exists cancel_reason text
  check (cancel_reason in ('unmatched', 'coach', 'platform'));
alter table public.sessions add column if not exists cancel_note text;

comment on column public.sessions.status is
  'open=招生中；matched=確定開課；completed=已結束；cancelled／cancelled_unmatched／cancelled_by_coach=已取消（原因看 cancel_reason；後兩個是舊值，保留不改）';
comment on column public.sessions.cancel_reason is
  '取消原因：unmatched=未達人數；coach=教練取消（沒有人報名時）；platform=平台取消（有人報名後，天災停課或教練無法上課）';
comment on column public.sessions.cancel_note is '平台取消的文字說明（選填），會附在通知裡';

update public.sessions set cancel_reason = 'unmatched'
where status = 'cancelled_unmatched' and cancel_reason is null;
update public.sessions set cancel_reason = 'coach'
where status = 'cancelled_by_coach' and cancel_reason is null;

-- 以後有人（含手動 SQL）把場次改成舊的兩種取消狀態，原因自動帶入；通用的 cancelled 一定要自己填原因
create or replace function public.default_session_cancel_reason()
returns trigger
language plpgsql
as $$
begin
  if new.cancel_reason is null then
    if new.status = 'cancelled_unmatched' then
      new.cancel_reason := 'unmatched';
    elsif new.status = 'cancelled_by_coach' then
      new.cancel_reason := 'coach';
    elsif new.status = 'cancelled' then
      raise exception '場次取消一定要填取消原因';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists default_session_cancel_reason on public.sessions;
create trigger default_session_cancel_reason
  before insert or update on public.sessions
  for each row
  execute function public.default_session_cancel_reason();

-- 2-2 registrations
alter table public.registrations add column if not exists cancel_reason text
  check (cancel_reason in ('learner', 'unmatched', 'coach', 'platform'));

comment on column public.registrations.cancel_reason is
  '取消原因：learner=學員自己取消；unmatched=場次未達人數；coach=教練取消場次；platform=平台取消場次';

-- 舊資料回填：已取消／已退款／部分退款
update public.registrations r
set cancel_reason = case
  when s.status = 'cancelled_unmatched' then 'unmatched'
  when s.status = 'cancelled_by_coach' then 'coach'
  when s.status = 'cancelled' and s.cancel_reason is not null then s.cancel_reason
  else 'learner'
end
from public.sessions s
where s.id = r.session_id
  and r.cancel_reason is null
  and r.status in ('cancelled', 'refunded', 'partial_refunded');

-- ============================================================
-- 三、learner_cancel_registration()（20261003000030 的版本，改成依級距）
-- ============================================================

create or replace function public.learner_cancel_registration(p_registration_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  r record;
  s record;
  c record;
  v_fee_pct int;
  v_coach_pct int;
  v_fee numeric(10,2);
  v_coach numeric(10,2);
begin
  if auth.uid() is null then
    raise exception '請先登入';
  end if;

  select * into r from public.registrations where id = p_registration_id for update;
  if not found then
    raise exception '找不到這筆報名';
  end if;
  if r.learner_id <> auth.uid() then
    raise exception '沒有權限取消這筆報名';
  end if;

  select * into s from public.sessions where id = r.session_id;
  select * into c from public.courses where id = s.course_id;

  if r.status = 'pending_match' then
    -- 報名截止前：免費取消。截止後、開課確認還沒跑完時，等系統確認結果
    if now() >= s.registration_deadline_at then
      raise exception '報名已截止，系統正在確認是否開課，請稍後再試';
    end if;

    update public.registrations
    set status = 'cancelled', cancelled_at = now(), cancel_reason = 'learner'
    where id = r.id;

    perform public.create_notification(
      r.learner_id, 'learner_cancelled',
      '取消成功：' || c.title,
      '已為你取消報名，尚未扣款。',
      '/my-courses', true
    );

    perform public.create_notification(
      c.coach_id, 'learner_cancelled',
      '學員取消報名：' || c.title,
      '有學員在報名截止前取消了這個場次的報名。',
      '/coach/courses/' || c.id, false
    );

  elsif r.status = 'confirmed' then
    -- 已扣款：距開課不到 24 小時不能取消（不退款、視同課程完成，名額可自行轉讓）
    if now() > s.start_at - interval '24 hours' then
      raise exception '開課前 24 小時內無法退費，可免費轉讓名額給親友，請透過行前公告提供的聯絡方式聯繫教練';
    end if;

    -- 剛好 48 小時算 30%、剛好 24 小時算 50%
    if now() <= s.start_at - interval '48 hours' then
      v_fee_pct := 30;
      v_coach_pct := 15;
    else
      v_fee_pct := 50;
      v_coach_pct := 25;
    end if;

    -- 與 calculateLearnerCancel() 相同：四捨五入到整數元；教練份額先算，平台＝手續費－教練份額
    v_fee := round(r.amount * v_fee_pct / 100.0);
    v_coach := round(r.amount * v_coach_pct / 100.0);

    update public.registrations
    set status = 'partial_refunded',
        cancelled_at = now(),
        cancel_reason = 'learner',
        refund_amount = r.amount - v_fee,
        refund_fee_amount = v_fee,
        coach_compensation_amount = v_coach
    where id = r.id;

    perform public.create_notification(
      r.learner_id, 'learner_cancelled',
      '取消成功：' || c.title,
      '已為你取消報名，收取 ' || v_fee_pct || '% 取消手續費 NT$' || v_fee
        || '，退款 NT$' || (r.amount - v_fee) || ' 將原路退還。',
      '/my-courses', true
    );

    perform public.create_notification(
      c.coach_id, 'learner_cancelled',
      '學員取消報名：' || c.title,
      '有學員在報名截止後取消，你可獲得取消補償 NT$' || v_coach || '（列入待撥款，不扣媒合費）。',
      '/coach/courses/' || c.id, true
    );

  else
    raise exception '這筆報名目前狀態無法取消（%）', r.status;
  end if;
end;
$$;

-- ============================================================
-- 四、移除 coach_assist_refund()
-- ============================================================

drop function if exists public.coach_assist_refund(uuid);

comment on column public.registrations.refund_amount is '實際退款金額（平台取消為全額；學員在報名截止後取消為扣掉手續費後的金額）';
comment on column public.registrations.refund_fee_amount is
  '取消手續費合計（學員在報名截止後取消：課程費用的 30% 或 50%，教練與平台各分一半）';
comment on column public.registrations.coach_compensation_amount is
  '學員在報名截止後取消時，教練分得的取消補償（課程費用的 15% 或 25%）；只有 partial_refunded 會有值，撥款時列入待撥款';
comment on column public.registrations.status is
  'pending_match=已報名待確認開課；confirmed=訂單成立(確定開課已扣款)；cancelled=已取消(未扣款)；refunded=已退款(平台取消，全額)；partial_refunded=部分退款(報名截止後學員取消，手續費 30%／50%)；completed=課程完成';

-- ============================================================
-- 五、admin_cancel_session()：平台取消（管理員限定）
-- ============================================================
-- 取代 管理員人工退款.sql 的 B 區塊。場次有人報名後，因天災停課或教練無法上課經平台確認時使用。

create or replace function public.admin_cancel_session(p_session_id uuid, p_note text default null)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  s record;
  c record;
  r record;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_suffix text;
begin
  if auth.uid() is null then
    raise exception '請先登入';
  end if;
  if not coalesce((select is_admin from public.profiles where id = auth.uid()), false) then
    raise exception '只有管理員可以取消場次';
  end if;

  select * into s from public.sessions where id = p_session_id for update;
  if not found then
    raise exception '找不到這個場次';
  end if;
  if s.status not in ('open', 'matched') then
    raise exception '這個場次目前狀態無法取消（%）', s.status;
  end if;
  if not exists (
    select 1 from public.registrations where session_id = s.id and status in ('pending_match', 'confirmed')
  ) then
    raise exception '這個場次沒有有效報名，請由教練自行取消';
  end if;

  select * into c from public.courses where id = s.course_id;
  v_suffix := case when v_note is not null then E'\n說明：' || v_note else '' end;

  update public.sessions
  set status = 'cancelled', cancel_reason = 'platform', cancel_note = v_note
  where id = s.id;

  for r in
    select * from public.registrations
    where session_id = s.id and status in ('pending_match', 'confirmed', 'partial_refunded')
    for update
  loop
    if r.status = 'partial_refunded' then
      -- 學員先前在報名截止後取消、已被收手續費：平台取消時補退，教練的取消補償作廢（尚未撥款才能作廢）
      if r.payout_id is not null then
        raise exception '報名 % 的取消補償已撥款給教練，請人工處理', r.id;
      end if;
      update public.registrations
      set status = 'refunded', refund_amount = r.amount, refund_fee_amount = 0, coach_compensation_amount = null
      where id = r.id;

      perform public.create_notification(
        r.learner_id, 'session_cancelled',
        '課程已取消，已補退手續費：' || c.title,
        '平台取消了這個場次，先前收取的取消手續費 NT$' || r.refund_fee_amount || ' 已補退，合計全額 NT$' || r.amount || ' 退回。' || v_suffix,
        '/my-courses', true
      );
    elsif r.status = 'confirmed' then
      update public.registrations
      set status = 'refunded', cancelled_at = now(), cancel_reason = 'platform',
          refund_amount = r.amount, refund_fee_amount = 0, coach_compensation_amount = null
      where id = r.id;

      perform public.create_notification(
        r.learner_id, 'session_cancelled',
        '課程已取消：' || c.title,
        '平台取消了這個場次，已扣款的 NT$' || r.amount || ' 將原路全額退還，不收取任何費用。' || v_suffix,
        '/my-courses', true
      );
    else
      update public.registrations
      set status = 'cancelled', cancelled_at = now(), cancel_reason = 'platform'
      where id = r.id;

      perform public.create_notification(
        r.learner_id, 'session_cancelled',
        '課程已取消：' || c.title,
        '平台取消了這個場次，尚未扣款，不收取任何費用。' || v_suffix,
        '/my-courses', true
      );
    end if;
  end loop;

  perform public.create_notification(
    c.coach_id, 'session_cancelled',
    '場次由平台取消：' || c.title,
    '這個場次已由平台取消，學員款項全額退回，該場次不會撥款給你。' || v_suffix,
    '/coach/courses/' || c.id, true
  );
end;
$$;

revoke execute on function public.admin_cancel_session(uuid, text) from public, anon;
grant execute on function public.admin_cancel_session(uuid, text) to authenticated;

-- ============================================================
-- 六、coach_cancel_session()：只能取消沒有人報名的場次（20261005000039 的版本）
-- ============================================================

create or replace function public.coach_cancel_session(p_session_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  s record;
  c record;
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
  if exists (
    select 1 from public.registrations where session_id = s.id and status <> 'cancelled'
  ) then
    raise exception '場次已有人報名，無法自行取消，如需取消請聯絡平台';
  end if;

  update public.sessions set status = 'cancelled_by_coach', cancel_reason = 'coach' where id = s.id;
end;
$$;

-- ============================================================
-- 七、process_session_matching()（20261005000039 的版本，只多寫 cancel_reason）
-- ============================================================

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
      update public.sessions
      set status = 'cancelled_unmatched', cancel_reason = 'unmatched'
      where id = s.id;

      for r in select * from public.registrations where session_id = s.id and status <> 'cancelled' loop
        update public.registrations
        set status = 'cancelled', cancelled_at = now(), cancel_reason = 'unmatched'
        where id = r.id;

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

-- ============================================================
-- 八、補舊資料：v4.7 的 50% 部分退款，教練補償 25%
-- ============================================================
-- 040 之前或之後建立、還沒有教練補償的 50% 部分退款（手續費剛好是金額的一半），補上課程費用的 25%；
-- 還沒撥款（payout_id 為空）的會在下一次撥款一併計入。其他比例（舊的 30%）不動。

update public.registrations
set coach_compensation_amount = round(amount * 0.25, 2)
where status = 'partial_refunded'
  and coach_compensation_amount is null
  and refund_fee_amount = round(amount * 0.50, 2);

-- ============================================================
-- 九、guard_registration_insert()（20261004000035 的版本，多清兩欄）
-- ============================================================

create or replace function public.guard_registration_insert()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  s record;
  current_count int;
  v_course record;
begin
  select * into s from public.sessions where id = new.session_id for update;
  if not found then
    raise exception '場次不存在';
  end if;
  if s.status <> 'open' then
    raise exception '這個場次目前無法報名（狀態：%）', s.status;
  end if;
  if now() >= s.registration_deadline_at then
    raise exception '已超過報名截止時間';
  end if;

  select * into v_course from public.courses where id = s.course_id;

  if v_course.coach_id = new.learner_id then
    raise exception '不能報名自己開設的課程';
  end if;

  select count(*) into current_count
  from public.registrations
  where session_id = new.session_id and status <> 'cancelled';

  if current_count >= v_course.max_participants then
    raise exception '這個場次已額滿';
  end if;

  -- 報名當下一律是「待確認開課」，金額用課程目前的每人費用當快照；
  -- 不開放使用者在 insert 時夾帶 status/charged_at/refund_*/取消原因 直接偽造成已完成/已扣款的訂單
  new.amount := v_course.price_per_person;
  new.status := 'pending_match';
  new.charged_at := null;
  new.cancelled_at := null;
  new.refund_amount := null;
  new.refund_fee_amount := null;
  new.coach_compensation_amount := null;
  new.cancel_reason := null;
  return new;
end;
$$;
