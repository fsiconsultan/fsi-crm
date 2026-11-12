-- Phase C: WhatsApp conversations, AI qualification and the automation log.
--
-- Add-only. Nothing here drops, renames or retypes an existing object, and the
-- only statement that writes to existing rows is the clearly marked backfill in
-- section 2, which fills the new leads.phone_wa column and nothing else.
--
-- NOT applied to production by the developer or by CI. The project owner
-- reviews this file and applies it (see docs/whatsapp.md).

create schema if not exists private;

-- 1. leads.phone_wa -----------------------------------------------------------
-- leads.phone is free text ("0812-3456-789", "+62 812...", "812..."). WhatsApp
-- identifies a customer by digits only ("62812..."). phone_wa holds that form so
-- an incoming message can be matched to a lead. leads.phone is never changed.

create or replace function public.normalize_phone_wa(p_phone text)
returns text
language plpgsql
immutable
set search_path to ''
as $$
declare
    v_first text;
    v_digits text;
begin
    if p_phone is null then
        return null;
    end if;

    -- A field can hold several numbers ("0812... / 0813..."); the first one wins.
    v_first := split_part(split_part(split_part(p_phone, '/', 1), ',', 1), ';', 1);
    v_digits := regexp_replace(v_first, '\D', '', 'g');

    if v_digits = '' then
        return null;
    end if;

    if v_digits like '00%' then
        v_digits := substr(v_digits, 3);           -- 0062812... international prefix
    end if;

    if v_digits like '620%' then
        v_digits := '62' || substr(v_digits, 4);    -- +62 0812...
    elsif v_digits like '62%' then
        null;                                       -- already 62812...
    elsif v_digits like '0%' then
        v_digits := '62' || substr(v_digits, 2);    -- 0812...
    elsif v_digits like '8%' then
        v_digits := '62' || v_digits;               -- 812...
    end if;
    -- Anything else is kept as an international number (61..., 33..., 49...).

    if v_digits like '62%' and length(v_digits) not between 11 and 15 then
        return null;
    end if;
    if length(v_digits) not between 10 and 15 then
        return null;
    end if;

    return v_digits;
end;
$$;

alter table public.leads add column if not exists phone_wa text;

comment on column public.leads.phone_wa is
    'Digits-only WhatsApp form of phone (62812...). Derived from phone by trigger; never edit by hand.';

create index if not exists idx_leads_phone_wa
    on public.leads (phone_wa)
    where phone_wa is not null;

-- Keeps phone_wa in step with phone for rows written after this migration, by
-- the legacy app or the new one. It sets phone_wa only.
create or replace function public.set_leads_phone_wa()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
    new.phone_wa := public.normalize_phone_wa(new.phone);
    return new;
end;
$$;

create trigger leads_set_phone_wa
    before insert or update of phone on public.leads
    for each row execute function public.set_leads_phone_wa();

-- 2. BACKFILL (the only write to existing rows) --------------------------------
-- Fills phone_wa for existing leads. It does not touch phone or any other
-- column: the updated_at trigger is switched off for this one statement so the
-- backfill does not make every lead look recently edited, then switched back on.
-- Can be run separately from the rest of the file; it is safe to run twice.

alter table public.leads disable trigger leads_set_updated_at;

update public.leads
set phone_wa = public.normalize_phone_wa(phone)
where phone_wa is null
  and public.normalize_phone_wa(phone) is not null;

alter table public.leads enable trigger leads_set_updated_at;

-- END BACKFILL ----------------------------------------------------------------

-- 3. wa_conversations ---------------------------------------------------------
-- One row per customer WhatsApp number. Holds who is answering (bot or human),
-- who took over and when, the assignee, and the time of the last customer
-- message (WhatsApp only allows free-form replies for 24 hours after it).

create table public.wa_conversations (
    id uuid primary key default gen_random_uuid(),
    wa_id text not null unique,
    profile_name text,
    phone_number_id text,
    lead_id bigint references public.leads (id),
    source text not null default 'whatsapp',
    mode text not null default 'bot',
    assigned_sales_id uuid references public.sales_users (id),
    taken_over_by uuid references public.sales_users (id),
    taken_over_at timestamptz,
    handed_back_at timestamptz,
    last_inbound_at timestamptz,
    last_message_at timestamptz,
    last_message_preview text,
    last_read_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint wa_conversations_mode_check check (mode = any (array['bot', 'human']))
);

create index idx_wa_conversations_lead_id on public.wa_conversations (lead_id);
create index idx_wa_conversations_assigned on public.wa_conversations (assigned_sales_id);
create index idx_wa_conversations_last_message on public.wa_conversations (last_message_at desc nulls last);

-- 4. wa_messages --------------------------------------------------------------
-- Every message in a conversation: the customer's, the bot's and staff replies.
-- wa_message_id is Meta's id; the unique constraint makes webhook retries safe.
-- A failed send is kept with its error so the inbox can show it.

create table public.wa_messages (
    id uuid primary key default gen_random_uuid(),
    conversation_id uuid not null references public.wa_conversations (id),
    direction text not null,
    sender_type text not null,
    sender_sales_id uuid references public.sales_users (id),
    message_type text not null default 'text',
    body text,
    wa_message_id text unique,
    status text not null,
    error_code text,
    error_message text,
    wa_timestamp timestamptz,
    created_at timestamptz not null default now(),
    constraint wa_messages_direction_check check (direction = any (array['inbound', 'outbound'])),
    constraint wa_messages_sender_type_check check (sender_type = any (array['customer', 'bot', 'human'])),
    constraint wa_messages_status_check
        check (status = any (array['received', 'sent', 'delivered', 'read', 'failed']))
);

create index idx_wa_messages_conversation on public.wa_messages (conversation_id, created_at);

-- 5. wa_qualifications --------------------------------------------------------
-- The qualification answers the AI has collected for a conversation, as one
-- jsonb document (property type, PLN bill or consumption, location, electrical
-- connection, expected savings, contact details).

create table public.wa_qualifications (
    conversation_id uuid primary key references public.wa_conversations (id),
    lead_id bigint references public.leads (id),
    answers jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index idx_wa_qualifications_lead_id on public.wa_qualifications (lead_id);

-- 6. automation_events --------------------------------------------------------
-- Append-only log of what the automation did or could not do: automated status
-- changes, refused status changes, ambiguous phone matches, failed sends, AI
-- errors, takeovers and hand-backs. needs_review marks the rows a person must
-- look at; resolved_at / resolved_by record that someone did.

create table public.automation_events (
    id uuid primary key default gen_random_uuid(),
    conversation_id uuid references public.wa_conversations (id),
    lead_id bigint references public.leads (id),
    type text not null,
    severity text not null default 'info',
    needs_review boolean not null default false,
    summary text not null,
    detail jsonb not null default '{}'::jsonb,
    actor_sales_id uuid references public.sales_users (id),
    created_at timestamptz not null default now(),
    resolved_at timestamptz,
    resolved_by uuid references public.sales_users (id),
    constraint automation_events_severity_check
        check (severity = any (array['info', 'warning', 'error']))
);

create index idx_automation_events_review
    on public.automation_events (created_at desc)
    where needs_review and resolved_at is null;
create index idx_automation_events_conversation on public.automation_events (conversation_id, created_at desc);
create index idx_automation_events_lead on public.automation_events (lead_id, created_at desc);

-- 7. assignment_history -------------------------------------------------------
-- Who a conversation (and its lead) was assigned to, by which rule, and by whom.
-- assigned_by is null when a rule assigned it automatically.

create table public.assignment_history (
    id uuid primary key default gen_random_uuid(),
    conversation_id uuid references public.wa_conversations (id),
    lead_id bigint references public.leads (id),
    from_sales_id uuid references public.sales_users (id),
    to_sales_id uuid references public.sales_users (id),
    rule text not null,
    assigned_by uuid references public.sales_users (id),
    created_at timestamptz not null default now()
);

create index idx_assignment_history_conversation on public.assignment_history (conversation_id, created_at desc);
create index idx_assignment_history_lead on public.assignment_history (lead_id, created_at desc);

-- 8. helper functions ---------------------------------------------------------

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger wa_conversations_set_updated_at
    before update on public.wa_conversations
    for each row execute function private.set_updated_at();

create trigger wa_qualifications_set_updated_at
    before update on public.wa_qualifications
    for each row execute function private.set_updated_at();

-- The sales_users row of the signed-in user.
create or replace function private.current_sales_user_id()
returns uuid
language sql
stable
security definer
set search_path to ''
as $$
    select su.id
    from public.sales_users su
    where su."auth_user-id" = (select auth.uid())
    limit 1;
$$;

-- True when the lead is assigned to the signed-in user (same rule as own_lead_read).
create or replace function private.owns_lead(p_lead_id bigint)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
    select exists (
        select 1
        from public.leads l
        where l.id = p_lead_id
          and l.sales_id = (select private.current_sales_user_id())
    );
$$;

-- Admin, or the conversation is assigned to the user, or linked to one of their leads.
create or replace function private.can_access_wa_conversation(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
    select
        (select public.is_admin())
        or exists (
            select 1
            from public.wa_conversations c
            where c.id = p_conversation_id
              and (
                  c.assigned_sales_id = (select private.current_sales_user_id())
                  or (c.lead_id is not null and (select private.owns_lead(c.lead_id)))
              )
        );
$$;

grant usage on schema private to authenticated;
grant execute on function private.current_sales_user_id() to authenticated;
grant execute on function private.owns_lead(bigint) to authenticated;
grant execute on function private.can_access_wa_conversation(uuid) to authenticated;

-- Signed-in staff may flip mode and mark a conversation read, but only an Admin
-- may reassign it, and nobody may link it to a lead they cannot see. The webhook
-- and the agent use the secret key (no auth.uid()), so they pass through.
create or replace function private.guard_wa_conversation_update()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
    if (select auth.uid()) is null or (select public.is_admin()) then
        return new;
    end if;

    if new.assigned_sales_id is distinct from old.assigned_sales_id then
        raise exception 'Only an Admin can reassign a conversation';
    end if;

    if new.lead_id is distinct from old.lead_id
       and (new.lead_id is null or not (select private.owns_lead(new.lead_id))) then
        raise exception 'You can only link a conversation to one of your own leads';
    end if;

    return new;
end;
$$;

create trigger wa_conversations_guard_update
    before update on public.wa_conversations
    for each row execute function private.guard_wa_conversation_update();

-- 9. row level security -------------------------------------------------------
-- Same shape as the baseline: Admin sees everything; everyone else only what is
-- assigned to them or linked to their leads. There are no policies for anon, and
-- no insert/delete policies beyond the ones below, so every other write has to
-- come from the server with the secret key (webhook and agent).

alter table public.wa_conversations enable row level security;
alter table public.wa_messages enable row level security;
alter table public.wa_qualifications enable row level security;
alter table public.automation_events enable row level security;
alter table public.assignment_history enable row level security;

revoke all on public.wa_conversations, public.wa_messages, public.wa_qualifications,
    public.automation_events, public.assignment_history from anon;
grant select, update on public.wa_conversations to authenticated;
grant select, insert on public.wa_messages to authenticated;
grant select on public.wa_qualifications to authenticated;
grant select, insert, update on public.automation_events to authenticated;
grant select, insert on public.assignment_history to authenticated;
grant all on public.wa_conversations, public.wa_messages, public.wa_qualifications,
    public.automation_events, public.assignment_history to service_role;

create policy wa_conversations_read on public.wa_conversations
    for select to authenticated
    using (
        is_admin()
        or assigned_sales_id = (select private.current_sales_user_id())
        or (lead_id is not null and (select private.owns_lead(lead_id)))
    );
create policy wa_conversations_update on public.wa_conversations
    for update to authenticated
    using (
        is_admin()
        or assigned_sales_id = (select private.current_sales_user_id())
        or (lead_id is not null and (select private.owns_lead(lead_id)))
    )
    with check (
        is_admin()
        or assigned_sales_id = (select private.current_sales_user_id())
        or (lead_id is not null and (select private.owns_lead(lead_id)))
    );

create policy wa_messages_read on public.wa_messages
    for select to authenticated
    using ((select private.can_access_wa_conversation(conversation_id)));
-- Staff can add their own outbound replies, nothing else.
create policy wa_messages_insert_human on public.wa_messages
    for insert to authenticated
    with check (
        direction = 'outbound'
        and sender_type = 'human'
        and sender_sales_id = (select private.current_sales_user_id())
        and (select private.can_access_wa_conversation(conversation_id))
    );

create policy wa_qualifications_read on public.wa_qualifications
    for select to authenticated
    using ((select private.can_access_wa_conversation(conversation_id)));

create policy automation_events_read on public.automation_events
    for select to authenticated
    using (
        is_admin()
        or (conversation_id is not null and (select private.can_access_wa_conversation(conversation_id)))
        or (lead_id is not null and (select private.owns_lead(lead_id)))
    );
-- Staff actions (take over, hand back, failed reply) are logged under their own name.
create policy automation_events_insert_own on public.automation_events
    for insert to authenticated
    with check (
        actor_sales_id = (select private.current_sales_user_id())
        and conversation_id is not null
        and (select private.can_access_wa_conversation(conversation_id))
    );
-- Used to mark an event reviewed.
create policy automation_events_resolve on public.automation_events
    for update to authenticated
    using (
        is_admin()
        or (conversation_id is not null and (select private.can_access_wa_conversation(conversation_id)))
        or (lead_id is not null and (select private.owns_lead(lead_id)))
    )
    with check (
        is_admin()
        or (conversation_id is not null and (select private.can_access_wa_conversation(conversation_id)))
        or (lead_id is not null and (select private.owns_lead(lead_id)))
    );

create policy assignment_history_read on public.assignment_history
    for select to authenticated
    using (
        is_admin()
        or (conversation_id is not null and (select private.can_access_wa_conversation(conversation_id)))
        or (lead_id is not null and (select private.owns_lead(lead_id)))
    );
create policy assignment_history_insert_admin on public.assignment_history
    for insert to authenticated
    with check (is_admin() and assigned_by = (select private.current_sales_user_id()));

-- 10. realtime ----------------------------------------------------------------
-- The inbox refreshes when a message arrives or a conversation changes hands.
-- Realtime respects the select policies above.

alter publication supabase_realtime add table public.wa_conversations, public.wa_messages;
