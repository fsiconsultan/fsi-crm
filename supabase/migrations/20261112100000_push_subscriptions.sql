-- Phone notifications for conversations that need a person.
--
-- Add-only: one new table and one function. Depends on
-- 20261112090000_whatsapp.sql (private.current_sales_user_id).
-- NOT applied to production by the developer. The project owner reviews and
-- applies it (see docs/notifications.md).

-- One row per browser or installed app that agreed to receive notifications.
-- The endpoint is the push service URL for that device, so it is unique: a
-- device belongs to whoever turned notifications on last.
create table public.push_subscriptions (
    id uuid primary key default gen_random_uuid(),
    sales_user_id uuid not null references public.sales_users (id),
    endpoint text not null unique,
    p256dh text not null,
    auth text not null,
    user_agent text,
    created_at timestamptz not null default now(),
    last_success_at timestamptz,
    failure_count integer not null default 0
);

create index idx_push_subscriptions_sales_user on public.push_subscriptions (sales_user_id);

alter table public.push_subscriptions enable row level security;

-- Supabase grants every privilege on new public tables by default. Take those
-- away and grant back only what the policies below allow. The server sends
-- notifications with the secret key (service_role).
revoke all on public.push_subscriptions from anon, authenticated;
grant select, delete on public.push_subscriptions to authenticated;
grant all on public.push_subscriptions to service_role;

-- Each user sees and removes only their own devices.
create policy push_subscriptions_read_own on public.push_subscriptions
    for select to authenticated
    using (sales_user_id = (select private.current_sales_user_id()));
create policy push_subscriptions_delete_own on public.push_subscriptions
    for delete to authenticated
    using (sales_user_id = (select private.current_sales_user_id()));

-- Saving goes through this function so a shared device moves to the user who
-- turned notifications on last, without letting anyone edit another user's row.
create or replace function public.register_push_subscription(
    p_endpoint text,
    p_p256dh text,
    p_auth text,
    p_user_agent text
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $$
declare
    v_user uuid := (select private.current_sales_user_id());
    v_id uuid;
begin
    if v_user is null then
        raise exception 'No CRM profile for this user';
    end if;
    if exists (select 1 from public.sales_users where id = v_user and status = 'Inactive') then
        raise exception 'This account is inactive';
    end if;
    if coalesce(p_p256dh, '') = '' or coalesce(p_auth, '') = '' then
        raise exception 'Incomplete push subscription';
    end if;
    -- Only the browsers' own push services. The server posts to this URL, so an
    -- arbitrary address would let a user point it at any host.
    if coalesce(p_endpoint, '') !~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|([a-z0-9-]+\.)*push\.apple\.com|([a-z0-9-]+\.)*notify\.windows\.com)/' then
        raise exception 'Not a recognised push service';
    end if;

    insert into public.push_subscriptions (sales_user_id, endpoint, p256dh, auth, user_agent)
    values (v_user, p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300))
    on conflict (endpoint) do update
        set sales_user_id = excluded.sales_user_id,
            p256dh = excluded.p256dh,
            auth = excluded.auth,
            user_agent = excluded.user_agent,
            failure_count = 0
    returning id into v_id;

    return v_id;
end;
$$;

revoke all on function public.register_push_subscription(text, text, text, text) from public, anon;
grant execute on function public.register_push_subscription(text, text, text, text) to authenticated;
