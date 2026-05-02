-- Create a table for storing device specifications (from smartphones.csv)
create table if not exists device_specs (
  id uuid default gen_random_uuid() primary key,
  brand_name text,
  model_name text,
  price numeric,
  avg_rating numeric,
  processor_brand text,
  num_cores int,
  processor_speed numeric,
  battery_capacity numeric,
  fast_charging_available boolean,
  ram_capacity numeric,
  internal_memory numeric,
  screen_size numeric,
  refresh_rate numeric,
  num_rear_cameras int,
  os text,
  primary_camera_rear numeric,
  primary_camera_front numeric,
  resolution_height int,
  resolution_width int,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table device_specs enable row level security;

-- Create policy to allow read access to everyone
create policy "Enable read access for all users" on device_specs
  for select using (true);

-- Create an index for faster searching by model name
create index if not exists idx_device_specs_model on device_specs using btree (model_name);
create index if not exists idx_device_specs_brand on device_specs using btree (brand_name);
