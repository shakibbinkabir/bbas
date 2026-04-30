-- BBAS Initial Schema (PRD v0.1, Section 6)
-- Tables: authorities, user_profiles, applications, application_documents,
--         workflow_history, ai_scoring_results, notifications

-- =============================================================================
-- EXTENSIONS
-- =============================================================================
create extension if not exists "pgcrypto";

-- =============================================================================
-- ENUM TYPES
-- =============================================================================
create type user_role as enum ('owner', 'officer', 'admin');

create type app_status as enum (
  'draft',
  'submitted',
  'under_review',
  'information_requested',
  'corrections_submitted',
  'approved',
  'rejected',
  'withdrawn'
);

create type building_type as enum (
  'residential',
  'commercial',
  'industrial',
  'mixed',
  'institutional'
);

create type document_type as enum (
  'land_deed',
  'khatian_certificate',
  'mutation_certificate',
  'tax_clearance',
  'architectural_plan',
  'structural_plan',
  'soil_test_report',
  'eia_report',
  'fire_noc',
  'applicant_nid',
  'owner_photo',
  'site_photo',
  'other'
);

create type upload_status as enum ('uploading', 'uploaded', 'verified', 'rejected');

create type workflow_action as enum (
  'submit',
  'advance',
  'return',
  'reject',
  'approve',
  'withdraw',
  'comment',
  'score',
  'assign'
);

create type notification_type as enum (
  'stage_advance',
  'information_requested',
  'approved',
  'rejected',
  'welcome',
  'reminder',
  'submission_confirmed',
  'corrections_reviewed',
  'assignment'
);

create type delivery_status as enum ('pending', 'sent', 'failed');

create type language_pref as enum ('bn', 'en');

create type theme_pref as enum ('light', 'dark');

-- =============================================================================
-- AUTHORITIES
-- =============================================================================
create table public.authorities (
  id uuid primary key default gen_random_uuid(),
  code varchar(10) unique not null,
  name_en varchar(255) not null,
  name_bn varchar(255) not null,
  jurisdiction_en text,
  jurisdiction_bn text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =============================================================================
-- USER PROFILES (extends auth.users)
-- =============================================================================
create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null,
  full_name_en varchar(255),
  full_name_bn varchar(255),
  phone varchar(20) not null,
  email varchar(255),
  authority_id uuid references public.authorities(id),
  preferred_language language_pref not null default 'bn',
  preferred_theme theme_pref not null default 'light',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =============================================================================
-- APPLICATIONS
-- =============================================================================
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  application_number varchar(30) unique not null,
  owner_id uuid not null references public.user_profiles(id),
  authority_id uuid not null references public.authorities(id),
  assigned_officer_id uuid references public.user_profiles(id),
  status app_status not null default 'draft',
  current_stage integer not null default 1 check (current_stage between 1 and 9),

  -- Project info
  project_name_en varchar(255),
  project_name_bn varchar(255),
  building_type building_type not null,
  num_floors integer,
  total_area_sqft decimal(12, 2),
  estimated_cost_bdt decimal(15, 2),

  -- Land info
  land_mouza varchar(255),
  land_khatian_no varchar(100),
  land_dag_no varchar(100),
  land_area_katha decimal(10, 2),
  land_address_en text,
  land_address_bn text,
  land_latitude decimal(10, 7),
  land_longitude decimal(10, 7),

  -- Green initiatives
  has_solar_panel boolean not null default false,
  has_rainwater_harvest boolean not null default false,
  has_green_roof boolean not null default false,
  has_ev_charging boolean not null default false,
  green_description text,

  -- AI scoring summary
  ai_compliance_score decimal(5, 2),
  ai_scored_at timestamptz,

  -- Lifecycle timestamps
  submitted_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  rejection_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =============================================================================
-- APPLICATION DOCUMENTS
-- =============================================================================
create table public.application_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  document_type document_type not null,
  file_name varchar(255) not null,
  file_path text not null,
  file_size_bytes integer,
  mime_type varchar(100),
  upload_status upload_status not null default 'uploaded',
  officer_remarks text,
  ai_score decimal(5, 2),
  ai_findings jsonb,
  uploaded_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =============================================================================
-- WORKFLOW HISTORY (append-only)
-- =============================================================================
create table public.workflow_history (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  from_stage integer,
  to_stage integer not null,
  from_status varchar(30),
  to_status varchar(30) not null,
  action workflow_action not null,
  performed_by uuid references public.user_profiles(id),
  comments text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- =============================================================================
-- AI SCORING RESULTS
-- =============================================================================
create table public.ai_scoring_results (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  document_id uuid references public.application_documents(id) on delete cascade,
  overall_score decimal(5, 2) not null,
  findings jsonb not null,
  recommendations jsonb,
  raw_response text,
  model_version varchar(50),
  tokens_used integer,
  scored_at timestamptz not null default now()
);

-- =============================================================================
-- NOTIFICATIONS
-- =============================================================================
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  application_id uuid references public.applications(id) on delete cascade,
  type notification_type not null,
  channel varchar(20) not null default 'email',
  subject_en varchar(255),
  subject_bn varchar(255),
  body_en text,
  body_bn text,
  sent_at timestamptz,
  delivery_status delivery_status not null default 'pending',
  error_message text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- =============================================================================
-- INDEXES (PRD Section 6.3)
-- =============================================================================
create index idx_applications_owner on public.applications(owner_id);
create index idx_applications_authority on public.applications(authority_id);
create index idx_applications_officer on public.applications(assigned_officer_id);
create index idx_applications_status on public.applications(status);
create index idx_applications_stage on public.applications(current_stage);
create index idx_applications_number on public.applications(application_number);
create index idx_documents_application on public.application_documents(application_id);
create index idx_workflow_application on public.workflow_history(application_id);
create index idx_workflow_created on public.workflow_history(created_at);
create index idx_notifications_user on public.notifications(user_id);
create index idx_notifications_status on public.notifications(delivery_status);
create index idx_user_profiles_authority on public.user_profiles(authority_id);
create index idx_user_profiles_role on public.user_profiles(role);

-- =============================================================================
-- TRIGGER: updated_at auto-bump
-- =============================================================================
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_authorities_updated_at
  before update on public.authorities
  for each row execute function public.update_updated_at();

create trigger trg_user_profiles_updated_at
  before update on public.user_profiles
  for each row execute function public.update_updated_at();

create trigger trg_applications_updated_at
  before update on public.applications
  for each row execute function public.update_updated_at();

create trigger trg_application_documents_updated_at
  before update on public.application_documents
  for each row execute function public.update_updated_at();

-- =============================================================================
-- FUNCTION: generate_application_number (PRD Section 6.4)
-- =============================================================================
create or replace function public.generate_application_number(auth_code varchar)
returns varchar
language plpgsql
as $$
declare
  seq_val integer;
  current_year integer := extract(year from now())::integer;
begin
  select coalesce(
    max(cast(split_part(application_number, '-', 3) as integer)),
    0
  ) + 1
  into seq_val
  from public.applications
  where application_number like auth_code || '-' || current_year || '-%';

  return auth_code || '-' || current_year || '-' || lpad(seq_val::text, 6, '0');
end;
$$;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
alter table public.authorities enable row level security;
alter table public.user_profiles enable row level security;
alter table public.applications enable row level security;
alter table public.application_documents enable row level security;
alter table public.workflow_history enable row level security;
alter table public.ai_scoring_results enable row level security;
alter table public.notifications enable row level security;

-- Helper: current user role
create or replace function public.current_user_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.user_profiles where id = auth.uid();
$$;

-- Helper: current user authority
create or replace function public.current_user_authority()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select authority_id from public.user_profiles where id = auth.uid();
$$;

-- ----- authorities ---------------------------------------------------------
create policy authorities_read_all
  on public.authorities for select
  to authenticated
  using (true);

-- ----- user_profiles -------------------------------------------------------
create policy user_profiles_read_self
  on public.user_profiles for select
  to authenticated
  using (id = auth.uid());

create policy user_profiles_read_authority
  on public.user_profiles for select
  to authenticated
  using (
    public.current_user_role() in ('officer', 'admin')
    and authority_id is not null
    and authority_id = public.current_user_authority()
  );

create policy user_profiles_insert_self
  on public.user_profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy user_profiles_update_self
  on public.user_profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy user_profiles_admin_manage
  on public.user_profiles for all
  to authenticated
  using (
    public.current_user_role() = 'admin'
    and authority_id = public.current_user_authority()
  )
  with check (
    public.current_user_role() = 'admin'
    and authority_id = public.current_user_authority()
  );

-- ----- applications --------------------------------------------------------
create policy applications_owner_select
  on public.applications for select
  to authenticated
  using (owner_id = auth.uid());

create policy applications_officer_select
  on public.applications for select
  to authenticated
  using (
    public.current_user_role() in ('officer', 'admin')
    and authority_id = public.current_user_authority()
  );

create policy applications_owner_insert
  on public.applications for insert
  to authenticated
  with check (
    owner_id = auth.uid()
    and public.current_user_role() = 'owner'
  );

create policy applications_owner_update
  on public.applications for update
  to authenticated
  using (
    owner_id = auth.uid()
    and status in ('draft', 'information_requested')
  )
  with check (
    owner_id = auth.uid()
    and status in ('draft', 'submitted', 'corrections_submitted', 'withdrawn')
  );

create policy applications_officer_update
  on public.applications for update
  to authenticated
  using (
    public.current_user_role() in ('officer', 'admin')
    and authority_id = public.current_user_authority()
  )
  with check (
    public.current_user_role() in ('officer', 'admin')
    and authority_id = public.current_user_authority()
  );

create policy applications_owner_delete
  on public.applications for delete
  to authenticated
  using (owner_id = auth.uid() and status = 'draft');

-- ----- application_documents (inherit from parent) -------------------------
create policy application_documents_select
  on public.application_documents for select
  to authenticated
  using (
    exists (
      select 1 from public.applications a
      where a.id = application_documents.application_id
        and (
          a.owner_id = auth.uid()
          or (
            public.current_user_role() in ('officer', 'admin')
            and a.authority_id = public.current_user_authority()
          )
        )
    )
  );

create policy application_documents_owner_insert
  on public.application_documents for insert
  to authenticated
  with check (
    exists (
      select 1 from public.applications a
      where a.id = application_documents.application_id
        and a.owner_id = auth.uid()
        and a.status in ('draft', 'information_requested')
    )
  );

create policy application_documents_owner_update
  on public.application_documents for update
  to authenticated
  using (
    exists (
      select 1 from public.applications a
      where a.id = application_documents.application_id
        and a.owner_id = auth.uid()
        and a.status in ('draft', 'information_requested')
    )
  );

create policy application_documents_officer_update
  on public.application_documents for update
  to authenticated
  using (
    exists (
      select 1 from public.applications a
      where a.id = application_documents.application_id
        and public.current_user_role() in ('officer', 'admin')
        and a.authority_id = public.current_user_authority()
    )
  );

create policy application_documents_owner_delete
  on public.application_documents for delete
  to authenticated
  using (
    exists (
      select 1 from public.applications a
      where a.id = application_documents.application_id
        and a.owner_id = auth.uid()
        and a.status in ('draft', 'information_requested')
    )
  );

-- ----- workflow_history (append-only) --------------------------------------
create policy workflow_history_insert
  on public.workflow_history for insert
  to authenticated
  with check (auth.uid() is not null);

create policy workflow_history_select
  on public.workflow_history for select
  to authenticated
  using (
    exists (
      select 1 from public.applications a
      where a.id = workflow_history.application_id
        and (
          a.owner_id = auth.uid()
          or (
            public.current_user_role() in ('officer', 'admin')
            and a.authority_id = public.current_user_authority()
          )
        )
    )
  );
-- intentionally NO update or delete policy → append-only

-- ----- ai_scoring_results --------------------------------------------------
create policy ai_scoring_select
  on public.ai_scoring_results for select
  to authenticated
  using (
    exists (
      select 1 from public.applications a
      where a.id = ai_scoring_results.application_id
        and public.current_user_role() in ('officer', 'admin')
        and a.authority_id = public.current_user_authority()
    )
  );

create policy ai_scoring_insert
  on public.ai_scoring_results for insert
  to authenticated
  with check (
    exists (
      select 1 from public.applications a
      where a.id = ai_scoring_results.application_id
        and public.current_user_role() in ('officer', 'admin')
        and a.authority_id = public.current_user_authority()
    )
  );

-- ----- notifications -------------------------------------------------------
create policy notifications_select_own
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

create policy notifications_update_own
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- =============================================================================
-- AUTH TRIGGER: create user_profiles row when auth.users row is created
-- (Best-effort default — actual profile is filled in via /api/auth/complete-registration)
-- =============================================================================
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- We deliberately do NOT auto-insert here; the API route
  -- /api/auth/complete-registration creates the row with full bilingual data.
  -- This stub exists so future versions can hook into the auth.users trigger.
  return new;
end;
$$;
