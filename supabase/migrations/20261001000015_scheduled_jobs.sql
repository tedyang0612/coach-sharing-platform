-- 系統自動排程（PRD 六-6）：成團判斷、24hr 提醒、課程完成、每週三撥款、良民證7天後刪除
-- 全部用 pg_cron 跑，MVP 建議在管理後台另外做一顆「手動執行排程」按鈕方便 Demo（不在這支 migration 範圍內）

alter table public.sessions add column if not exists reminder_sent_at timestamptz;
alter table public.registrations add column if not exists payout_id uuid references public.payouts (id);

-- 1. 報名截止時間到：成團判斷（達下限成團+扣款；未達則取消+不扣款）
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

      for r in select * from public.registrations where session_id = s.id and status <> 'cancelled' loop
        update public.registrations
        set status = 'confirmed', charged_at = now()
        where id = r.id;

        perform public.create_notification(
          r.learner_id, 'matched',
          '成團確認：' || c.title,
          '這堂課已成團並完成扣款，開課前會再收到行前公告（含教練聯絡方式）。',
          '/courses/' || c.id, true
        );
      end loop;

      perform public.create_notification(
        c.coach_id, 'matched',
        '場次已成團：' || c.title,
        '場次已達開課人數並完成扣款。',
        '/coach/courses/' || c.id, true
      );
    else
      update public.sessions set status = 'cancelled_unmatched' where id = s.id;

      for r in select * from public.registrations where session_id = s.id and status <> 'cancelled' loop
        update public.registrations set status = 'cancelled' where id = r.id;

        perform public.create_notification(
          r.learner_id, 'unmatched',
          '未成團：' || c.title,
          '這個場次未達開課人數，已自動取消，不會扣款。',
          '/courses/' || c.id, true
        );
      end loop;

      perform public.create_notification(
        c.coach_id, 'unmatched',
        '場次未成團：' || c.title,
        '這個場次人數未達下限，已自動取消。',
        '/coach/courses/' || c.id, true
      );
    end if;
  end loop;
end;
$$;

-- 2. 開課前 24 小時：對已成團場次發上課提醒
create or replace function public.send_session_reminders()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  s record;
  c record;
  r record;
begin
  for s in
    select * from public.sessions
    where status = 'matched'
      and reminder_sent_at is null
      and start_at <= now() + interval '24 hours'
    for update skip locked
  loop
    select * into c from public.courses where id = s.course_id;

    for r in select * from public.registrations where session_id = s.id and status = 'confirmed' loop
      perform public.create_notification(
        r.learner_id, 'reminder_24h',
        '上課提醒：' || c.title,
        '明天上課囉：' || c.location_name || '，' || to_char(s.start_at, 'YYYY-MM-DD HH24:MI'),
        '/courses/' || c.id, true
      );
    end loop;

    update public.sessions set reminder_sent_at = now() where id = s.id;
  end loop;
end;
$$;

-- 3. 場次結束：標記完成、訂單轉完成、發評價邀請
create or replace function public.complete_finished_sessions()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  s record;
  c record;
  r record;
begin
  for s in
    select * from public.sessions
    where status = 'matched' and end_at <= now()
    for update skip locked
  loop
    select * into c from public.courses where id = s.course_id;
    update public.sessions set status = 'completed' where id = s.id;

    for r in select * from public.registrations where session_id = s.id and status = 'confirmed' loop
      update public.registrations set status = 'completed' where id = r.id;

      perform public.create_notification(
        r.learner_id, 'review_invite',
        '邀請評價：' || c.title,
        '這堂課結束了，花一分鐘留下評價吧。',
        '/courses/' || c.id || '/review', true
      );
    end loop;
  end loop;
end;
$$;

-- 4. 每週三：結算上週一到週日「課程完成」的訂單並撥款（扣 5% 媒合費）
create or replace function public.run_weekly_payouts()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  period_start date := (current_date - interval '7 days')::date;
  period_end date := (current_date - interval '1 day')::date;
  coach_row record;
  gross numeric(10,2);
  fee numeric(10,2);
  net numeric(10,2);
  new_payout_id uuid;
begin
  for coach_row in
    select distinct c.coach_id
    from public.registrations r
    join public.sessions s on s.id = r.session_id
    join public.courses c on c.id = s.course_id
    where r.status = 'completed' and r.payout_id is null
      and s.end_at::date between period_start and period_end
  loop
    select coalesce(sum(r.amount), 0) into gross
    from public.registrations r
    join public.sessions s on s.id = r.session_id
    join public.courses c on c.id = s.course_id
    where r.status = 'completed' and r.payout_id is null
      and c.coach_id = coach_row.coach_id
      and s.end_at::date between period_start and period_end;

    continue when gross = 0;

    fee := round(gross * 0.05, 2);
    net := gross - fee;

    insert into public.payouts (coach_id, period_start, period_end, gross_amount, platform_fee_amount, net_amount, payout_date)
    values (coach_row.coach_id, period_start, period_end, gross, fee, net, current_date)
    returning id into new_payout_id;

    update public.registrations r
    set payout_id = new_payout_id
    from public.sessions s, public.courses c
    where r.session_id = s.id and s.course_id = c.id
      and r.status = 'completed' and r.payout_id is null
      and c.coach_id = coach_row.coach_id
      and s.end_at::date between period_start and period_end;

    perform public.create_notification(
      coach_row.coach_id, 'payout_completed',
      '撥款完成',
      '本期撥款 NT$' || net || '（已扣 5% 媒合費）。',
      '/coach/payouts', true
    );
  end loop;
end;
$$;

-- 5. 良民證：審核完成（通過或駁回）滿 7 天就標記刪除原檔
-- 注意：這裡只能標記 DB 欄位，Supabase Storage 裡的實際檔案要另外用 Edge Function／後端排程清掉，不在這支 migration 範圍
create or replace function public.cleanup_criminal_records()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.coach_profiles
  set criminal_record_deleted = true, criminal_record_url = null
  where criminal_record_deleted = false
    and application_status in ('approved', 'rejected')
    and reviewed_at is not null
    and reviewed_at <= now() - interval '7 days';
end;
$$;

-- 排程：成團判斷每 5 分鐘、提醒與完成判斷每小時、撥款每週三凌晨、良民證清理每天
select cron.schedule('process-session-matching', '*/5 * * * *', $$select public.process_session_matching();$$)
where not exists (select 1 from cron.job where jobname = 'process-session-matching');

select cron.schedule('send-session-reminders', '0 * * * *', $$select public.send_session_reminders();$$)
where not exists (select 1 from cron.job where jobname = 'send-session-reminders');

select cron.schedule('complete-finished-sessions', '0 * * * *', $$select public.complete_finished_sessions();$$)
where not exists (select 1 from cron.job where jobname = 'complete-finished-sessions');

select cron.schedule('run-weekly-payouts', '0 1 * * 3', $$select public.run_weekly_payouts();$$)
where not exists (select 1 from cron.job where jobname = 'run-weekly-payouts');

select cron.schedule('cleanup-criminal-records', '0 2 * * *', $$select public.cleanup_criminal_records();$$)
where not exists (select 1 from cron.job where jobname = 'cleanup-criminal-records');
