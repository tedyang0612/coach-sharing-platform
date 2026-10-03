-- registrations：報名＝訂單（PRD 3.0／6.0／11.0），含金流狀態（MVP 全部模擬，不串真實金流、不存卡號）

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  learner_id uuid not null references public.profiles (id) on delete cascade,

  health_declaration_agreed boolean not null check (health_declaration_agreed = true),
  health_declaration_agreed_at timestamptz not null default now(),

  payment_method text, -- 畫面選項用（信用卡／LINE Pay），不存實際金流資料

  amount numeric(10, 2) not null, -- 報名當下的每人費用快照
  status text not null default 'pending_match'
    check (status in ('pending_match', 'confirmed', 'cancelled', 'refunded', 'partial_refunded', 'completed')),

  charged_at timestamptz,          -- 成團扣款時間
  cancelled_at timestamptz,
  refund_amount numeric(10, 2),    -- 實際退款金額（全額或70%）
  refund_fee_amount numeric(10, 2), -- 平台手續費（24hr內取消，扣30%）

  created_at timestamptz not null default now(),

  unique (session_id, learner_id)
);

comment on column public.registrations.status is 'pending_match=已報名待成團；confirmed=訂單成立(已成團已扣款)；cancelled=已取消(未扣款)；refunded=已退款(全額)；partial_refunded=部分退款(扣30%手續費)；completed=課程完成';

create index if not exists registrations_session_id_idx on public.registrations (session_id);
create index if not exists registrations_learner_id_idx on public.registrations (learner_id);
create index if not exists registrations_status_idx on public.registrations (status);

-- 報名前防呆：場次須為招生中、未截止、未額滿、未重複報名（unique 已擋重複）
create or replace function public.guard_registration_insert()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  s record;
  current_count int;
  c record;
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

  select c.* into c from public.courses c where c.id = s.course_id;

  select count(*) into current_count
  from public.registrations
  where session_id = new.session_id and status <> 'cancelled';

  if current_count >= c.max_participants then
    raise exception '這個場次已額滿';
  end if;

  -- 報名當下用課程目前的每人費用當快照
  new.amount := c.price_per_person;
  return new;
end;
$$;

drop trigger if exists guard_registration_insert on public.registrations;
create trigger guard_registration_insert
  before insert on public.registrations
  for each row
  execute function public.guard_registration_insert();

-- RLS
alter table public.registrations enable row level security;

drop policy if exists "learners can view own registrations" on public.registrations;
create policy "learners can view own registrations"
  on public.registrations for select
  to authenticated
  using (learner_id = auth.uid());

-- 教練看得到自己場次的報名名單（PRD：只看暱稱與報名時間，不看聯絡方式——聯絡方式本來就不在這張表）
drop policy if exists "coaches can view registrations for own sessions" on public.registrations;
create policy "coaches can view registrations for own sessions"
  on public.registrations for select
  to authenticated
  using (
    exists (
      select 1 from public.sessions
      join public.courses on courses.id = sessions.course_id
      where sessions.id = registrations.session_id
        and courses.coach_id = auth.uid()
    )
  );

drop policy if exists "learners can create own registrations" on public.registrations;
create policy "learners can create own registrations"
  on public.registrations for insert
  to authenticated
  with check (learner_id = auth.uid());

-- 學員可以取消自己的報名（status 改 cancelled/refunded 等，實際扣款/退款邏輯見排程與教練協助退款流程）
drop policy if exists "learners can update own registrations" on public.registrations;
create policy "learners can update own registrations"
  on public.registrations for update
  to authenticated
  using (learner_id = auth.uid())
  with check (learner_id = auth.uid());

-- 24hr 內的退款是「教練協助後台操作」，所以教練也要能改自己場次底下報名的狀態
drop policy if exists "coaches can update registrations for own sessions" on public.registrations;
create policy "coaches can update registrations for own sessions"
  on public.registrations for update
  to authenticated
  using (
    exists (
      select 1 from public.sessions
      join public.courses on courses.id = sessions.course_id
      where sessions.id = registrations.session_id
        and courses.coach_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.sessions
      join public.courses on courses.id = sessions.course_id
      where sessions.id = registrations.session_id
        and courses.coach_id = auth.uid()
    )
  );
