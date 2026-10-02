-- 三件事：
-- (1) finding #8：send_session_reminders()／run_weekly_payouts() 沒有明確轉時區，
--     pg_cron 執行環境的 session timezone 預設是 UTC，顯示/計算出來的時間會跟
--     台灣時間差 8 小時（CLAUDE.md 的時區慣例要求一律用 Asia/Taipei）。
-- (2) PRD v4.3 7.0：「成團確認」通知要含教練聯絡方式（行前公告不是另一則通知，
--     是同一則的一部分）；process_session_matching() 目前文案只說「之後會收到」，
--     沒有真的帶入聯絡方式。
-- (3) PRD 9.0：教練個人檔案要公開顯示「已通過的證照名稱」，但 coach_licenses
--     只有本人／管理員能讀，需要一個只回傳已通過證照名稱的公開函式。

-- ============================================================
-- 一、時區修正
-- ============================================================

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
        '明天上課囉：' || c.location_name || '，' || to_char(s.start_at at time zone 'Asia/Taipei', 'YYYY-MM-DD HH24:MI'),
        '/courses/' || c.id, true
      );
    end loop;

    update public.sessions set reminder_sent_at = now() where id = s.id;
  end loop;
end;
$$;

create or replace function public.run_weekly_payouts()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  period_start date := ((now() at time zone 'Asia/Taipei')::date - interval '7 days')::date;
  period_end date := ((now() at time zone 'Asia/Taipei')::date - interval '1 day')::date;
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
      and (s.end_at at time zone 'Asia/Taipei')::date between period_start and period_end
  loop
    select coalesce(sum(r.amount), 0) into gross
    from public.registrations r
    join public.sessions s on s.id = r.session_id
    join public.courses c on c.id = s.course_id
    where r.status = 'completed' and r.payout_id is null
      and c.coach_id = coach_row.coach_id
      and (s.end_at at time zone 'Asia/Taipei')::date between period_start and period_end;

    continue when gross = 0;

    fee := round(gross * 0.05, 2);
    net := gross - fee;

    insert into public.payouts (coach_id, period_start, period_end, gross_amount, platform_fee_amount, net_amount, payout_date)
    values (coach_row.coach_id, period_start, period_end, gross, fee, net, (now() at time zone 'Asia/Taipei')::date)
    returning id into new_payout_id;

    update public.registrations r
    set payout_id = new_payout_id
    from public.sessions s, public.courses c
    where r.session_id = s.id and s.course_id = c.id
      and r.status = 'completed' and r.payout_id is null
      and c.coach_id = coach_row.coach_id
      and (s.end_at at time zone 'Asia/Taipei')::date between period_start and period_end;

    perform public.create_notification(
      coach_row.coach_id, 'payout_completed',
      '撥款完成',
      '本期撥款 NT$' || net || '（已扣 5% 媒合費）。',
      '/coach/payouts', true
    );
  end loop;
end;
$$;

-- ============================================================
-- 二、成團確認通知改帶教練聯絡方式（PRD v4.3 7.0）
-- ============================================================
-- SECURITY DEFINER 函式讀 coach_profiles.contact_* 不受欄位層級 GRANT 限制
-- （執行時是以函式擁有者的權限查表，不是呼叫者），通知本身只有收件學員自己讀得到，
-- 所以不需要另外開一條「已成團學員可讀教練聯絡方式」的 RLS policy。

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
          '成團確認：' || c.title,
          '恭喜！您報名的【' || c.title || '】已成團，已為您扣款 NT$' || r.amount || '。以下為課程行前通知：' || E'\n'
            || '時間：' || to_char(s.start_at at time zone 'Asia/Taipei', 'YYYY-MM-DD HH24:MI') || E'\n'
            || '地點：' || c.location_name || '（' || c.location_address || '）' || E'\n'
            || '教練聯絡方式：' || E'\n' || coalesce(contact_text, '（教練未提供）'),
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

-- ============================================================
-- 三、公開查詢「已通過證照名稱」（PRD 9.0，教練個人檔案用）
-- ============================================================

create or replace function public.get_coach_approved_license_names(p_coach_id uuid)
returns setof text
language sql
stable
security definer set search_path = public
as $$
  select name from public.coach_licenses
  where coach_id = p_coach_id and status = 'approved'
  order by created_at;
$$;

revoke execute on function public.get_coach_approved_license_names(uuid) from public;
grant execute on function public.get_coach_approved_license_names(uuid) to anon, authenticated;
