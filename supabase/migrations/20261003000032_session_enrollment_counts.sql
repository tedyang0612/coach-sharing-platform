-- 課程卡片／詳情頁要顯示「報名進度（差幾人成團）」（PRD 2.0），未登入訪客也要看得到。
-- registrations 只開放學員本人／該場次教練 select（20261001000012_registrations.sql），
-- anon 讀不到，前端無法自己 count；這裡提供只回傳聚合人數的函式，不回傳任何報名者資料。
--
-- ⚠️ 這是刻意開放給 anon（未登入）呼叫的少數函式之一（另一支是
-- get_coach_approved_license_names，20261002000023）。只回傳場次 id 與人數，
-- 且只回傳「已發布、非範本」課程的場次，與 courses／sessions 對 anon 的 select 可見範圍一致。
--
-- ⚠️ enrolled_count 的定義（registrations.status <> 'cancelled'）必須與
-- guard_registration_insert() 的額滿判斷（20261003000026）同步；
-- 任一邊改定義，另一邊要一起改，否則畫面顯示的人數會跟實際能不能報名對不上。
-- （process_session_matching() 的成團人數目前也是同一個定義，20261002000023。）

create or replace function public.get_session_enrollment_counts(p_session_ids uuid[])
returns table (session_id uuid, enrolled_count int)
language plpgsql
stable
security definer set search_path = public
as $$
#variable_conflict use_column
begin
  if p_session_ids is null or cardinality(p_session_ids) = 0 then
    return;
  end if;

  if cardinality(p_session_ids) > 200 then
    raise exception '一次最多查詢 200 個場次（收到 % 個）', cardinality(p_session_ids);
  end if;

  return query
  select
    s.id,
    (
      select count(*)::int
      from public.registrations r
      where r.session_id = s.id
        and r.status <> 'cancelled'
    )
  from public.sessions s
  join public.courses c on c.id = s.course_id
  where s.id = any (p_session_ids)
    and c.status = 'published'
    and c.is_template = false;
end;
$$;

comment on function public.get_session_enrollment_counts(uuid[]) is
  '回傳場次的已報名人數（status <> cancelled，需與 guard_registration_insert 額滿定義同步）；'
  '只含已發布且非範本課程的場次；一次最多 200 個；刻意開放 anon 呼叫，只回傳聚合數字';

revoke execute on function public.get_session_enrollment_counts(uuid[]) from public;
grant execute on function public.get_session_enrollment_counts(uuid[]) to anon, authenticated;
