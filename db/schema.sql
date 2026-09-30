-- FixRight schema (Neon PostgreSQL)
-- Applied manually / idempotent.

create extension if not exists "pgcrypto";

do $$ begin
  create type user_role as enum ('customer', 'technician', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type verification_status as enum ('pending', 'verified', 'rejected', 'suspended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type repair_request_status as enum (
    'submitted', 'matching', 'technician_pending', 'confirmed',
    'in_progress', 'completed', 'cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type appointment_status as enum (
    'scheduled', 'in_progress', 'completed', 'cancelled', 'no_show'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('unpaid', 'pending', 'paid', 'refunded');
exception when duplicate_object then null; end $$;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text unique,
  role user_role not null default 'customer',
  full_name text,
  phone text,
  email text unique,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists technician_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references users(id) on delete cascade,
  bio text,
  years_experience integer not null default 0,
  verification_status verification_status not null default 'pending',
  rating numeric(2,1) not null default 0,
  completed_jobs integer not null default 0,
  latitude double precision,
  longitude double precision,
  service_radius_km integer not null default 10,
  available boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  category text,
  base_service_fee numeric(12,2) not null default 1000,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists technician_services (
  id uuid primary key default gen_random_uuid(),
  technician_id uuid not null references technician_profiles(id) on delete cascade,
  service_id uuid not null references services(id) on delete cascade,
  unique (technician_id, service_id)
);

create table if not exists technician_service_areas (
  id uuid primary key default gen_random_uuid(),
  technician_id uuid not null references technician_profiles(id) on delete cascade,
  area_name text not null,
  latitude double precision,
  longitude double precision,
  radius_km integer not null default 10
);

create table if not exists repair_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references users(id) on delete cascade,
  service_id uuid references services(id) on delete set null,
  problem_description text not null,
  address text,
  latitude double precision,
  longitude double precision,
  requested_date date,
  availability_start time,
  availability_end time,
  matched_technician_id uuid references technician_profiles(id) on delete set null,
  status repair_request_status not null default 'submitted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  repair_request_id uuid references repair_requests(id) on delete set null,
  customer_id uuid not null references users(id) on delete cascade,
  technician_id uuid not null references technician_profiles(id) on delete cascade,
  service_id uuid references services(id) on delete set null,
  appointment_date date not null,
  start_time time,
  end_time time,
  status appointment_status not null default 'scheduled',
  payment_status payment_status not null default 'unpaid',
  service_fee numeric(12,2) not null default 1000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_users_clerk on users(clerk_user_id);
create index if not exists idx_tech_available on technician_profiles(available, verification_status);
create index if not exists idx_requests_status on repair_requests(status);
create index if not exists idx_appointments_date on appointments(appointment_date);

-- Iteration 2: repair-request booking flow
alter table repair_requests add column if not exists device_brand text;
alter table repair_requests add column if not exists device_model text;
alter table repair_requests add column if not exists area_name text;
alter table repair_requests add column if not exists landmark text;
alter table repair_requests add column if not exists proposed_date date;
alter table repair_requests add column if not exists proposed_start time;
alter table repair_requests add column if not exists proposed_end time;
create index if not exists idx_requests_customer on repair_requests(customer_id, created_at desc);
create index if not exists idx_appointments_tech_date on appointments(technician_id, appointment_date);

-- Booking v2: appointments are created already confirmed after demo payment.
alter type appointment_status add value if not exists 'confirmed';

-- Iteration 4: technician experience
alter type appointment_status add value if not exists 'on_the_way';
alter type appointment_status add value if not exists 'arrived';

do $$ begin
  create type offer_status as enum ('offered', 'accepted', 'declined', 'withdrawn');
exception when duplicate_object then null; end $$;

alter table technician_profiles add column if not exists work_start time not null default '08:00';
alter table technician_profiles add column if not exists work_end time not null default '18:00';

-- A request is offered to every eligible technician; the first to accept claims it.
create table if not exists request_offers (
  id uuid primary key default gen_random_uuid(),
  repair_request_id uuid not null references repair_requests(id) on delete cascade,
  technician_id uuid not null references technician_profiles(id) on delete cascade,
  proposed_date date not null,
  proposed_start time not null,
  proposed_end time not null,
  status offer_status not null default 'offered',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (repair_request_id, technician_id)
);
create index if not exists idx_offers_tech on request_offers(technician_id, status);
create index if not exists idx_offers_request on request_offers(repair_request_id, status);

-- Never more than one live appointment per repair request.
create unique index if not exists uq_appointment_per_request
  on appointments(repair_request_id) where status <> 'cancelled';

-- Iteration 6: nationwide State -> LGA coverage (no travel radius).
alter table technician_service_areas add column if not exists state text;
alter table technician_service_areas add column if not exists lga text;
alter table technician_service_areas add column if not exists covers_entire_state boolean not null default false;
alter table technician_service_areas add column if not exists created_at timestamptz not null default now();
alter table technician_service_areas add column if not exists updated_at timestamptz not null default now();
-- Convert legacy Kaduna neighbourhood rows to their LGA (only while the old column exists).
do $$ begin
  if exists (select 1 from information_schema.columns
             where table_name = 'technician_service_areas' and column_name = 'area_name') then
    execute $q$update technician_service_areas set state = 'Kaduna',
      lga = case when area_name in ('Kakuri','Television','Tudun Wada','Kabala Costain') then 'Kaduna South'
                 when area_name in ('Kawo','Malali','Ungwan Rimi','Ungwan Dosa') then 'Kaduna North'
                 else 'Chikun' end
      where state is null and area_name is not null$q$;
  end if;
end $$;
delete from technician_service_areas a using technician_service_areas b
  where a.ctid > b.ctid and a.technician_id = b.technician_id and a.state = b.state and a.lga is not distinct from b.lga;
alter table technician_service_areas alter column state set not null;
alter table technician_service_areas drop column if exists area_name;
alter table technician_service_areas drop column if exists radius_km;
alter table technician_service_areas drop column if exists latitude;
alter table technician_service_areas drop column if exists longitude;
alter table technician_profiles drop column if exists service_radius_km;
create unique index if not exists uq_tech_area on technician_service_areas(technician_id, state, coalesce(lga, ''));
create index if not exists idx_tech_area_lookup on technician_service_areas(state, lga);

alter table repair_requests add column if not exists state text;
alter table repair_requests add column if not exists lga text;
update repair_requests set state = 'Kaduna',
  lga = case when area_name in ('Kakuri','Television','Tudun Wada','Kabala Costain') then 'Kaduna South'
             when area_name in ('Kawo','Malali','Ungwan Rimi','Ungwan Dosa') then 'Kaduna North'
             else 'Chikun' end
  where state is null and area_name is not null;
