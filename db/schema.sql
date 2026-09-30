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
