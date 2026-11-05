
create type public.app_role as enum ('sender','recipient','agent','business','admin','main_admin');
create type public.parcel_status as enum ('booking_received','awaiting_agent','received_by_agent','in_transit','arrived_destination','ready_for_collection','collected','cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text, phone text, email text,
  business_name text, is_business boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated; grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null, created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated; grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id=_user_id and role=_role) $$;
create or replace function public.is_admin(_user_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id=_user_id and role in ('admin','main_admin')) $$;

create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin(auth.uid()));
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "admin profile update" on public.profiles for update to authenticated using (public.is_admin(auth.uid()));
create policy "read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.is_admin(auth.uid()));

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique, province text not null, kind text not null default 'town',
  is_active boolean not null default true, created_at timestamptz not null default now()
);
grant select on public.locations to anon, authenticated; grant insert, update, delete on public.locations to authenticated; grant all on public.locations to service_role;
alter table public.locations enable row level security;
create policy "locations public read" on public.locations for select to anon, authenticated using (true);
create policy "locations admin write" on public.locations for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

insert into public.locations (name, province, kind) values
('Harare','Harare','city'),('Chitungwiza','Harare','town'),('Bulawayo','Bulawayo','city'),('Gweru','Midlands','city'),
('Kwekwe','Midlands','town'),('Gokwe','Midlands','town'),('Zvishavane','Midlands','town'),('Mutare','Manicaland','city'),
('Rusape','Manicaland','town'),('Chipinge','Manicaland','town'),('Masvingo','Masvingo','city'),('Chiredzi','Masvingo','town'),
('Chinhoyi','Mashonaland West','town'),('Kadoma','Mashonaland West','town'),('Karoi','Mashonaland West','town'),
('Marondera','Mashonaland East','town'),('Murehwa','Mashonaland East','town'),('Bindura','Mashonaland Central','town'),
('Mt Darwin','Mashonaland Central','town'),('Victoria Falls','Matabeleland North','town'),('Hwange','Matabeleland North','town'),
('Lupane','Matabeleland North','town'),('Gwanda','Matabeleland South','town'),('Beitbridge','Matabeleland South','town'),
('Plumtree','Matabeleland South','town');

create table public.parcel_categories (
  id uuid primary key default gen_random_uuid(), name text not null unique,
  price_multiplier numeric not null default 1, created_at timestamptz not null default now()
);
grant select on public.parcel_categories to anon, authenticated; grant insert, update, delete on public.parcel_categories to authenticated; grant all on public.parcel_categories to service_role;
alter table public.parcel_categories enable row level security;
create policy "cat public read" on public.parcel_categories for select to anon, authenticated using (true);
create policy "cat admin write" on public.parcel_categories for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
insert into public.parcel_categories (name, price_multiplier) values
('Documents',0.8),('Clothing',1),('Groceries & Food',1.1),('Electronics',1.4),('Household goods',1.2),('Agricultural produce',1.1),('Fragile items',1.5),('Other',1);

create table public.admin_settings (
  key text primary key, value jsonb not null, updated_at timestamptz not null default now(), updated_by uuid
);
grant select on public.admin_settings to anon, authenticated; grant insert, update on public.admin_settings to authenticated; grant all on public.admin_settings to service_role;
alter table public.admin_settings enable row level security;
create policy "settings read" on public.admin_settings for select to anon, authenticated using (true);
create policy "settings main admin write" on public.admin_settings for all to authenticated using (public.has_role(auth.uid(),'main_admin')) with check (public.has_role(auth.uid(),'main_admin'));
insert into public.admin_settings (key, value) values
('pricing', '{"base_usd":3,"per_kg_usd":0.75,"intercity_usd":2,"currency":"USD"}'),
('payment_methods', '{"ecocash":true,"onemoney":true,"bank_transfer":true,"cash_at_agent":true}'),
('support_contact', '{"email":"tawananyashachipata@gmail.com"}');

create table public.agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique,
  business_name text not null, contact_name text not null,
  phone text not null check (phone ~ '^\+263[0-9]{9}$'),
  email text, location_id uuid not null references public.locations(id),
  address text not null,
  status text not null default 'pending' check (status in ('pending','approved','suspended')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index on public.agents(location_id); create index on public.agents(status);
grant select on public.agents to anon, authenticated; grant insert, update, delete on public.agents to authenticated; grant all on public.agents to service_role;
alter table public.agents enable row level security;
create policy "approved agents public" on public.agents for select to anon, authenticated using (status='approved' or user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "apply as agent" on public.agents for insert to authenticated with check (user_id = auth.uid() and status='pending');
create policy "agent edit own" on public.agents for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "admin manage agents" on public.agents for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create or replace function public.agents_guard() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if not public.is_admin(auth.uid()) and auth.uid() is not null then
    if new.status is distinct from old.status or new.user_id is distinct from old.user_id then
      raise exception 'Only administrators can change agent status';
    end if;
  end if;
  new.updated_at := now();
  if new.status='approved' and new.user_id is not null then
    insert into public.user_roles(user_id, role) values (new.user_id,'agent') on conflict do nothing;
  elsif new.status<>'approved' and new.user_id is not null then
    delete from public.user_roles where user_id=new.user_id and role='agent';
  end if;
  return new;
end $$;
create trigger agents_guard before update on public.agents for each row execute function public.agents_guard();
create or replace function public.agents_after_insert() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status='approved' and new.user_id is not null then
    insert into public.user_roles(user_id, role) values (new.user_id,'agent') on conflict do nothing;
  end if; return new; end $$;
create trigger agents_after_insert after insert on public.agents for each row execute function public.agents_after_insert();

create or replace function public.my_agent_id() returns uuid language sql stable security definer set search_path=public as $$
  select id from public.agents where user_id = auth.uid() and status='approved' limit 1 $$;

create table public.parcels (
  id uuid primary key default gen_random_uuid(),
  tracking_number text not null unique,
  sender_id uuid not null,
  sender_name text not null, sender_phone text not null, sender_email text,
  recipient_name text not null, recipient_phone text not null check (recipient_phone ~ '^\+263[0-9]{9}$'),
  recipient_email text,
  pickup_location_id uuid not null references public.locations(id),
  destination_location_id uuid not null references public.locations(id),
  origin_agent_id uuid references public.agents(id),
  destination_agent_id uuid references public.agents(id),
  category_id uuid references public.parcel_categories(id),
  description text not null, weight_kg numeric not null check (weight_kg > 0 and weight_kg <= 200),
  dimensions text, special_instructions text, image_path text,
  price_usd numeric not null, status parcel_status not null default 'booking_received',
  payment_method text, expected_delivery date,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index on public.parcels(sender_id); create index on public.parcels(recipient_phone); create index on public.parcels(recipient_email);
create index on public.parcels(origin_agent_id); create index on public.parcels(destination_agent_id); create index on public.parcels(status);
grant select on public.parcels to authenticated; grant all on public.parcels to service_role;
alter table public.parcels enable row level security;

create or replace function public.is_recipient_of(_parcel public.parcels) returns boolean language sql stable security definer set search_path=public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and (
    (p.email is not null and lower(p.email) = lower(_parcel.recipient_email)) or (p.phone is not null and p.phone = _parcel.recipient_phone))) $$;

create policy "parcel read" on public.parcels for select to authenticated using (
  sender_id = auth.uid() or public.is_admin(auth.uid())
  or origin_agent_id = public.my_agent_id() or destination_agent_id = public.my_agent_id()
  or (status = 'awaiting_agent' and origin_agent_id is null and exists (select 1 from public.agents a where a.id = public.my_agent_id() and a.location_id = pickup_location_id))
  or (status = 'in_transit' and destination_agent_id is null and exists (select 1 from public.agents a where a.id = public.my_agent_id() and a.location_id = destination_location_id))
  or public.is_recipient_of(parcels));

create table public.tracking_events (
  id uuid primary key default gen_random_uuid(),
  parcel_id uuid not null references public.parcels(id) on delete cascade,
  status parcel_status not null, location text, description text not null,
  actor_id uuid, created_at timestamptz not null default now()
);
create index on public.tracking_events(parcel_id);
grant select on public.tracking_events to authenticated; grant all on public.tracking_events to service_role;
alter table public.tracking_events enable row level security;
create policy "events read" on public.tracking_events for select to authenticated using (exists (select 1 from public.parcels p where p.id = parcel_id));

create table public.pickup_codes (
  parcel_id uuid primary key references public.parcels(id) on delete cascade,
  code text not null, attempts int not null default 0, used_at timestamptz,
  created_at timestamptz not null default now()
);
grant select on public.pickup_codes to authenticated; grant all on public.pickup_codes to service_role;
alter table public.pickup_codes enable row level security;
create policy "code read" on public.pickup_codes for select to authenticated using (
  exists (select 1 from public.parcels p where p.id = parcel_id and (
    p.sender_id = auth.uid() or (public.is_recipient_of(p) and p.status in ('ready_for_collection','collected')))));

create table public.notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null,
  parcel_id uuid references public.parcels(id) on delete cascade,
  title text not null, body text not null, read boolean not null default false,
  channel text not null default 'in_app', created_at timestamptz not null default now()
);
create index on public.notifications(user_id, created_at desc);
grant select, update, delete on public.notifications to authenticated; grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "own notif" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "own notif update" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own notif delete" on public.notifications for delete to authenticated using (user_id = auth.uid());

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  parcel_id uuid not null references public.parcels(id) on delete cascade,
  payer_id uuid not null, method text not null check (method in ('ecocash','onemoney','bank_transfer','cash_at_agent')),
  amount_usd numeric not null, status text not null default 'pending' check (status in ('pending','confirmed','failed','refunded')),
  reference text, verified_by uuid, verified_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.payments(parcel_id); create index on public.payments(payer_id);
grant select on public.payments to authenticated; grant all on public.payments to service_role;
alter table public.payments enable row level security;
create policy "payments read" on public.payments for select to authenticated using (payer_id = auth.uid() or public.is_admin(auth.uid())
  or exists (select 1 from public.parcels p where p.id = parcel_id and p.origin_agent_id = public.my_agent_id()));

create table public.support_requests (
  id uuid primary key default gen_random_uuid(), user_id uuid not null,
  parcel_tracking text, category text not null check (category in ('missing','damaged','question','other')),
  subject text not null, message text not null, status text not null default 'open' check (status in ('open','in_progress','resolved')),
  admin_response text, responded_by uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
grant select, insert, update on public.support_requests to authenticated; grant all on public.support_requests to service_role;
alter table public.support_requests enable row level security;
create policy "support own read" on public.support_requests for select to authenticated using (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "support own insert" on public.support_requests for insert to authenticated with check (user_id = auth.uid() and status='open' and admin_response is null);
create policy "support admin update" on public.support_requests for update to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create table public.audit_log (
  id uuid primary key default gen_random_uuid(), actor_id uuid, action text not null,
  entity text, entity_id uuid, details jsonb, created_at timestamptz not null default now()
);
grant select on public.audit_log to authenticated; grant all on public.audit_log to service_role;
alter table public.audit_log enable row level security;
create policy "audit admin read" on public.audit_log for select to authenticated using (public.is_admin(auth.uid()));

create view public.delivery_history with (security_invoker = true) as
  select p.id, p.tracking_number, p.sender_id, p.status, p.price_usd, p.created_at, p.updated_at,
    pl.name as pickup, dl.name as destination
  from public.parcels p join public.locations pl on pl.id=p.pickup_location_id join public.locations dl on dl.id=p.destination_location_id
  where p.status in ('collected','cancelled');
grant select on public.delivery_history to authenticated;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles (id, full_name, phone, email, is_business, business_name)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'phone', new.email,
    coalesce((new.raw_user_meta_data->>'is_business')::boolean,false), new.raw_user_meta_data->>'business_name')
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id,'sender') on conflict do nothing;
  if coalesce((new.raw_user_meta_data->>'is_business')::boolean,false) then
    insert into public.user_roles (user_id, role) values (new.id,'business') on conflict do nothing;
  end if;
  if lower(new.email)='tawananyashachipata@gmail.com' and new.email_confirmed_at is not null then
    insert into public.user_roles (user_id, role) values (new.id,'main_admin'),(new.id,'admin') on conflict do nothing;
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.handle_user_confirmed() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if lower(new.email)='tawananyashachipata@gmail.com' and new.email_confirmed_at is not null and old.email_confirmed_at is null then
    insert into public.user_roles (user_id, role) values (new.id,'main_admin'),(new.id,'admin') on conflict do nothing;
  end if;
  return new;
end $$;
create trigger on_auth_user_confirmed after update on auth.users for each row execute function public.handle_user_confirmed();

create or replace function public.notify_parcel(_parcel public.parcels, _title text, _body text) returns void
language plpgsql security definer set search_path=public as $$
declare r record;
begin
  insert into public.notifications(user_id, parcel_id, title, body) values (_parcel.sender_id, _parcel.id, _title, _body);
  for r in select p.id from public.profiles p where p.id <> _parcel.sender_id and (
      (p.email is not null and lower(p.email)=lower(_parcel.recipient_email)) or p.phone=_parcel.recipient_phone) loop
    insert into public.notifications(user_id, parcel_id, title, body) values (r.id, _parcel.id, _title, _body);
  end loop;
  for r in select a.user_id from public.agents a where a.id in (_parcel.origin_agent_id, _parcel.destination_agent_id) and a.user_id is not null loop
    insert into public.notifications(user_id, parcel_id, title, body) values (r.user_id, _parcel.id, _title, _body);
  end loop;
end $$;

create or replace function public.quote_price(_weight numeric, _category uuid, _from uuid, _to uuid) returns numeric
language plpgsql stable security definer set search_path=public as $$
declare s jsonb; m numeric;
begin
  select value into s from public.admin_settings where key='pricing';
  select coalesce(price_multiplier,1) into m from public.parcel_categories where id=_category;
  return round(((s->>'base_usd')::numeric + (s->>'per_kg_usd')::numeric * _weight
    + case when _from<>_to then (s->>'intercity_usd')::numeric else 0 end) * coalesce(m,1), 2);
end $$;
grant execute on function public.quote_price(numeric, uuid, uuid, uuid) to anon, authenticated;

create or replace function public.create_booking(
  _sender_name text, _sender_phone text, _sender_email text,
  _recipient_name text, _recipient_phone text, _recipient_email text,
  _pickup uuid, _destination uuid, _origin_agent uuid, _dest_agent uuid, _category uuid,
  _description text, _weight numeric, _dimensions text, _instructions text, _image_path text, _payment_method text
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_track text; v_code text; v_price numeric; v_p public.parcels; v_from text; v_to text;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if _recipient_phone !~ '^\+263[0-9]{9}$' then raise exception 'Recipient phone must be a Zimbabwean number (+263…)'; end if;
  if _sender_phone !~ '^\+263[0-9]{9}$' then raise exception 'Sender phone must be a Zimbabwean number (+263…)'; end if;
  if length(trim(_description)) < 3 then raise exception 'Please describe the goods'; end if;
  if _payment_method not in ('ecocash','onemoney','bank_transfer','cash_at_agent') then raise exception 'Invalid payment method'; end if;
  if _origin_agent is not null and not exists (select 1 from agents where id=_origin_agent and status='approved' and location_id=_pickup) then raise exception 'Invalid drop-off agent'; end if;
  if _dest_agent is not null and not exists (select 1 from agents where id=_dest_agent and status='approved' and location_id=_destination) then raise exception 'Invalid collection agent'; end if;
  loop
    v_track := 'TSP-' || upper(substr(md5(gen_random_uuid()::text),1,4)) || '-' || lpad((floor(random()*1000000))::int::text,6,'0');
    exit when not exists (select 1 from parcels where tracking_number=v_track);
  end loop;
  v_code := lpad((floor(random()*1000000))::int::text,6,'0');
  v_price := public.quote_price(_weight, _category, _pickup, _destination);
  insert into parcels(tracking_number, sender_id, sender_name, sender_phone, sender_email, recipient_name, recipient_phone, recipient_email,
    pickup_location_id, destination_location_id, origin_agent_id, destination_agent_id, category_id, description, weight_kg, dimensions,
    special_instructions, image_path, price_usd, status, payment_method, expected_delivery)
  values (v_track, auth.uid(), _sender_name, _sender_phone, nullif(_sender_email,''), _recipient_name, _recipient_phone, nullif(lower(_recipient_email),''),
    _pickup, _destination, _origin_agent, _dest_agent, _category, _description, _weight, nullif(_dimensions,''), nullif(_instructions,''), _image_path,
    v_price, 'awaiting_agent', _payment_method, current_date + case when _pickup=_destination then 1 else 3 end)
  returning * into v_p;
  insert into pickup_codes(parcel_id, code) values (v_p.id, v_code);
  insert into payments(parcel_id, payer_id, method, amount_usd) values (v_p.id, auth.uid(), _payment_method, v_price);
  select name into v_from from locations where id=_pickup; select name into v_to from locations where id=_destination;
  insert into tracking_events(parcel_id, status, location, description, actor_id, created_at) values
    (v_p.id,'booking_received', v_from, 'Booking created by sender', auth.uid(), now()),
    (v_p.id,'awaiting_agent', v_from, 'Waiting for a Tsapo agent to accept the parcel', auth.uid(), now() + interval '1 second');
  perform notify_parcel(v_p, 'Booking created', 'Parcel '||v_track||' from '||v_from||' to '||v_to||' has been booked.');
  insert into audit_log(actor_id, action, entity, entity_id) values (auth.uid(),'booking_created','parcel',v_p.id);
  return jsonb_build_object('id', v_p.id, 'tracking_number', v_track, 'price_usd', v_price);
end $$;
grant execute on function public.create_booking(text,text,text,text,text,text,uuid,uuid,uuid,uuid,uuid,text,numeric,text,text,text,text) to authenticated;

create or replace function public.update_parcel_status(_parcel uuid, _status parcel_status, _note text) returns void
language plpgsql security definer set search_path=public as $$
declare v_p public.parcels; v_agent uuid := public.my_agent_id(); v_admin boolean := public.is_admin(auth.uid()); v_loc text; v_desc text; ok boolean := false;
begin
  select * into v_p from parcels where id=_parcel for update;
  if not found then raise exception 'Parcel not found'; end if;
  if v_p.status in ('collected','cancelled') then raise exception 'Parcel is already closed'; end if;
  if _status in ('collected','cancelled','booking_received') then raise exception 'Use the dedicated action for this status'; end if;
  if v_admin then ok := true;
  elsif v_agent is not null then
    if _status='received_by_agent' and v_p.status='awaiting_agent' and (v_p.origin_agent_id is null or v_p.origin_agent_id=v_agent)
       and exists (select 1 from agents where id=v_agent and location_id=v_p.pickup_location_id) then
      ok := true; update parcels set origin_agent_id=v_agent where id=_parcel;
    elsif _status='in_transit' and v_p.status='received_by_agent' and v_p.origin_agent_id=v_agent then ok := true;
    elsif _status='arrived_destination' and v_p.status='in_transit' and (v_p.destination_agent_id is null or v_p.destination_agent_id=v_agent)
       and exists (select 1 from agents where id=v_agent and location_id=v_p.destination_location_id) then
      ok := true; update parcels set destination_agent_id=v_agent where id=_parcel;
    elsif _status='ready_for_collection' and v_p.status='arrived_destination' and v_p.destination_agent_id=v_agent then ok := true;
    end if;
  end if;
  if not ok then raise exception 'You are not allowed to make this status change'; end if;
  update parcels set status=_status, updated_at=now() where id=_parcel returning * into v_p;
  select l.name into v_loc from locations l where l.id = case when _status in ('received_by_agent','in_transit') then v_p.pickup_location_id else v_p.destination_location_id end;
  v_desc := coalesce(nullif(_note,''), case _status
    when 'received_by_agent' then 'Parcel received and registered by the drop-off agent'
    when 'in_transit' then 'Parcel dispatched to destination'
    when 'arrived_destination' then 'Parcel arrived at the destination agent'
    when 'ready_for_collection' then 'Parcel is ready for collection — bring your pickup code'
    else 'Status updated' end);
  insert into tracking_events(parcel_id, status, location, description, actor_id) values (_parcel, _status, v_loc, v_desc, auth.uid());
  perform notify_parcel(v_p, 'Parcel '||v_p.tracking_number||' update', v_desc);
  insert into audit_log(actor_id, action, entity, entity_id, details) values (auth.uid(),'status_'||_status,'parcel',_parcel, jsonb_build_object('note',_note));
end $$;
grant execute on function public.update_parcel_status(uuid, parcel_status, text) to authenticated;

create or replace function public.cancel_booking(_parcel uuid) returns void language plpgsql security definer set search_path=public as $$
declare v_p public.parcels;
begin
  select * into v_p from parcels where id=_parcel for update;
  if not found or (v_p.sender_id<>auth.uid() and not public.is_admin(auth.uid())) then raise exception 'Not allowed'; end if;
  if v_p.status not in ('booking_received','awaiting_agent') then raise exception 'Only bookings not yet received by an agent can be cancelled'; end if;
  update parcels set status='cancelled', updated_at=now() where id=_parcel returning * into v_p;
  update payments set status='failed' where parcel_id=_parcel and status='pending';
  insert into tracking_events(parcel_id, status, description, actor_id) values (_parcel,'cancelled','Booking cancelled', auth.uid());
  perform notify_parcel(v_p, 'Booking cancelled', 'Parcel '||v_p.tracking_number||' was cancelled.');
  insert into audit_log(actor_id, action, entity, entity_id) values (auth.uid(),'booking_cancelled','parcel',_parcel);
end $$;
grant execute on function public.cancel_booking(uuid) to authenticated;

create or replace function public.verify_pickup(_tracking text, _code text) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_p public.parcels; v_c public.pickup_codes; v_agent uuid := public.my_agent_id();
begin
  if v_agent is null and not public.is_admin(auth.uid()) then raise exception 'Only agents can verify pickups'; end if;
  select * into v_p from parcels where tracking_number=upper(trim(_tracking)) for update;
  if not found then raise exception 'Tracking number not found'; end if;
  if v_agent is not null and v_p.destination_agent_id is distinct from v_agent then raise exception 'This parcel is not at your collection point'; end if;
  if v_p.status<>'ready_for_collection' then raise exception 'Parcel is not ready for collection'; end if;
  select * into v_c from pickup_codes where parcel_id=v_p.id for update;
  if v_c.attempts >= 5 then raise exception 'Too many wrong attempts. Contact Tsapo support.'; end if;
  if v_c.code <> trim(_code) then
    update pickup_codes set attempts=attempts+1 where parcel_id=v_p.id;
    insert into audit_log(actor_id, action, entity, entity_id) values (auth.uid(),'pickup_code_failed','parcel',v_p.id);
    return jsonb_build_object('ok', false, 'message', 'Incorrect pickup code');
  end if;
  update pickup_codes set used_at=now() where parcel_id=v_p.id;
  update parcels set status='collected', updated_at=now() where id=v_p.id returning * into v_p;
  insert into tracking_events(parcel_id, status, description, actor_id, location)
    select v_p.id,'collected','Parcel collected by recipient after code verification', auth.uid(), l.name from locations l where l.id=v_p.destination_location_id;
  perform notify_parcel(v_p, 'Parcel collected', 'Parcel '||v_p.tracking_number||' has been collected.');
  insert into audit_log(actor_id, action, entity, entity_id) values (auth.uid(),'parcel_collected','parcel',v_p.id);
  return jsonb_build_object('ok', true, 'message', 'Pickup verified. Hand over the parcel to '||v_p.recipient_name);
end $$;
grant execute on function public.verify_pickup(text, text) to authenticated;

create or replace function public.confirm_payment(_payment uuid, _reference text) returns void language plpgsql security definer set search_path=public as $$
begin
  if not (public.is_admin(auth.uid()) or exists (select 1 from payments pm join parcels p on p.id=pm.parcel_id
     where pm.id=_payment and pm.method='cash_at_agent' and p.origin_agent_id=public.my_agent_id())) then
    raise exception 'Not authorised to verify payments'; end if;
  if coalesce(trim(_reference),'')='' then raise exception 'A payment reference or receipt number is required'; end if;
  update payments set status='confirmed', reference=_reference, verified_by=auth.uid(), verified_at=now() where id=_payment and status='pending';
  insert into audit_log(actor_id, action, entity, entity_id, details) values (auth.uid(),'payment_confirmed','payment',_payment, jsonb_build_object('reference',_reference));
end $$;
grant execute on function public.confirm_payment(uuid, text) to authenticated;

create or replace function public.track_parcel(_tracking text) returns jsonb language sql stable security definer set search_path=public as $$
  select jsonb_build_object(
    'tracking_number', p.tracking_number, 'status', p.status, 'expected_delivery', p.expected_delivery,
    'from', pl.name, 'to', dl.name, 'created_at', p.created_at,
    'collection_point', (select jsonb_build_object('name', a.business_name, 'address', a.address, 'phone', a.phone) from agents a where a.id=p.destination_agent_id),
    'events', coalesce((select jsonb_agg(jsonb_build_object('status',e.status,'location',e.location,'description',e.description,'created_at',e.created_at) order by e.created_at)
       from tracking_events e where e.parcel_id=p.id),'[]'::jsonb))
  from parcels p join locations pl on pl.id=p.pickup_location_id join locations dl on dl.id=p.destination_location_id
  where p.tracking_number = upper(trim(_tracking)) $$;
grant execute on function public.track_parcel(text) to anon, authenticated;

create or replace function public.set_admin_role(_user uuid, _grant boolean) returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.has_role(auth.uid(),'main_admin') then raise exception 'Only the main administrator can manage administrators'; end if;
  if _user = auth.uid() then raise exception 'You cannot change your own admin role'; end if;
  if _grant then insert into user_roles(user_id, role) values (_user,'admin') on conflict do nothing;
  else delete from user_roles where user_id=_user and role='admin'; end if;
  insert into audit_log(actor_id, action, entity, entity_id) values (auth.uid(), case when _grant then 'admin_granted' else 'admin_revoked' end,'user',_user);
end $$;
grant execute on function public.set_admin_role(uuid, boolean) to authenticated;

create policy "parcel img upload own" on storage.objects for insert to authenticated with check (bucket_id='parcel-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "parcel img read own" on storage.objects for select to authenticated using (bucket_id='parcel-images' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin(auth.uid())));
