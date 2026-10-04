-- 補兩件事：
-- A) coach_profiles 把「學經歷」「比賽經驗」拆成兩個欄位（原本合併在 bio_experience）
-- B) PRD 7.0 通知事件表裡，目前還沒實作的 6 個事件，補上對應 trigger

-- ============ A) 教練個人檔案欄位拆分 ============

alter table public.coach_profiles rename column bio_experience to bio_education;
alter table public.coach_profiles add column if not exists bio_competition text;

comment on column public.coach_profiles.bio_education is '學經歷（必填）';
comment on column public.coach_profiles.bio_competition is '比賽經驗（選填）';

-- ============ B) 通知事件補完 ============

-- B-1：報名成功（完成報名當下，尚未扣款）—— 學員站內+Email，教練站內
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
    '已收到你的報名，尚未扣款，將於報名截止時判斷是否成團。',
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

drop trigger if exists notify_registration_created on public.registrations;
create trigger notify_registration_created
  after insert on public.registrations
  for each row
  execute function public.notify_registration_created();

-- B-2：達到開課人數（人數達下限的當下，非報名截止時）—— 學員/教練皆站內（不發 Email）
alter table public.sessions add column if not exists min_reached_notified_at timestamptz;

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
      '這個場次已達最低開課人數，報名截止後會自動成團扣款。',
      '/coach/courses/' || c.id, false
    );

    for r in select * from public.registrations where session_id = s.id and status <> 'cancelled' loop
      perform public.create_notification(
        r.learner_id, 'min_participants_reached',
        '已達開課人數：' || c.title,
        '這個場次已達最低開課人數，將於報名截止時成團。',
        '/my-courses', false
      );
    end loop;
  end if;

  return new;
end;
$$;

drop trigger if exists notify_min_participants_reached on public.registrations;
create trigger notify_min_participants_reached
  after insert on public.registrations
  for each row
  execute function public.notify_min_participants_reached();

-- B-3：學員取消報名確認（取代原本只改狀態、不通知的版本）—— 學員站內+Email，教練站內
create or replace function public.learner_cancel_registration(p_registration_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  r record;
  s record;
  c record;
begin
  select * into r from public.registrations where id = p_registration_id for update;
  if not found then
    raise exception '找不到這筆報名';
  end if;
  if r.learner_id <> auth.uid() then
    raise exception '沒有權限取消這筆報名';
  end if;

  select * into s from public.sessions where id = r.session_id;
  select * into c from public.courses where id = s.course_id;

  if now() > s.start_at - interval '24 hours' then
    raise exception '開課前 24 小時內無法自行取消，請聯絡教練協助處理';
  end if;

  if r.status = 'confirmed' then
    update public.registrations
    set status = 'refunded', cancelled_at = now(), refund_amount = r.amount, refund_fee_amount = 0
    where id = r.id;

    perform public.create_notification(
      r.learner_id, 'learner_cancelled',
      '取消成功：' || c.title,
      '已為你取消報名，款項 NT$' || r.amount || ' 將原路全額退還。',
      '/my-courses', true
    );
  elsif r.status = 'pending_match' then
    update public.registrations
    set status = 'cancelled', cancelled_at = now()
    where id = r.id;

    perform public.create_notification(
      r.learner_id, 'learner_cancelled',
      '取消成功：' || c.title,
      '已為你取消報名，尚未扣款。',
      '/my-courses', true
    );
  else
    raise exception '這筆報名目前狀態無法取消（%）', r.status;
  end if;

  perform public.create_notification(
    c.coach_id, 'learner_cancelled',
    '學員取消報名：' || c.title,
    '有學員取消了這個場次的報名。',
    '/coach/courses/' || c.id, false
  );
end;
$$;

-- B-3b（順手補）：教練協助退款也通知學員，PRD表沒有單獨列這行，但邏輯上需要
create or replace function public.coach_assist_refund(p_registration_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  r record;
  s record;
  c record;
  fee numeric(10,2);
begin
  select * into r from public.registrations where id = p_registration_id for update;
  if not found then
    raise exception '找不到這筆報名';
  end if;

  select s.*, co.coach_id into s from public.sessions s
    join public.courses co on co.id = s.course_id
    where s.id = r.session_id;

  if s.coach_id <> auth.uid() then
    raise exception '只有該場次的教練可以協助退款';
  end if;
  if r.status <> 'confirmed' then
    raise exception '只有已扣款（訂單成立）的報名才能協助退款';
  end if;

  select * into c from public.courses where id = s.course_id;

  fee := round(r.amount * 0.30, 2);

  update public.registrations
  set status = 'partial_refunded',
      cancelled_at = now(),
      refund_amount = r.amount - fee,
      refund_fee_amount = fee
  where id = r.id;

  perform public.create_notification(
    r.learner_id, 'refunded_by_coach',
    '已退款：' || c.title,
    '教練已協助處理退款 NT$' || (r.amount - fee) || '（已扣30%平台手續費）。',
    '/my-courses', true
  );
end;
$$;

-- B-4：教練群發公告也要發 Email 給未取消的報名學員
create or replace function public.notify_announcement_created()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  s record;
  c record;
  r record;
begin
  select * into s from public.sessions where id = new.session_id;
  select * into c from public.courses where id = s.course_id;

  for r in
    select * from public.registrations
    where session_id = new.session_id and status <> 'cancelled'
  loop
    perform public.create_notification(
      r.learner_id, 'coach_announcement',
      '教練公告：' || c.title,
      new.content,
      '/my-courses', true
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists notify_announcement_created on public.announcements;
create trigger notify_announcement_created
  after insert on public.announcements
  for each row
  execute function public.notify_announcement_created();

-- B-5：收到新評價（通知教練）
create or replace function public.notify_review_created()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform public.create_notification(
    new.coach_id, 'review_received',
    '收到新評價',
    '你收到一則新的學員評價（' || new.rating || ' 星）。',
    '/coach/reviews', false
  );
  return new;
end;
$$;

drop trigger if exists notify_review_created on public.reviews;
create trigger notify_review_created
  after insert on public.reviews
  for each row
  execute function public.notify_review_created();

-- B-6：教練審核結果（通過／需補件／未通過都通知）
create or replace function public.notify_coach_application_reviewed()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.application_status is distinct from old.application_status
     and new.application_status in ('approved', 'needs_more_info', 'rejected') then
    perform public.create_notification(
      new.id, 'coach_application_reviewed',
      case new.application_status
        when 'approved' then '教練身分審核通過'
        when 'needs_more_info' then '教練申請需要補件'
        else '教練身分審核未通過'
      end,
      coalesce(new.rejection_reason, '請至教練申請狀態頁查看詳情。'),
      '/coach/application', true
    );
  end if;
  return new;
end;
$$;

drop trigger if exists notify_coach_application_reviewed on public.coach_profiles;
create trigger notify_coach_application_reviewed
  after update on public.coach_profiles
  for each row
  execute function public.notify_coach_application_reviewed();
