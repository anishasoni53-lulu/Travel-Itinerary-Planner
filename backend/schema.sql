-- Run this in Supabase Dashboard > SQL Editor for the local MVP.
-- This table stores itinerary JSON in trip_data.
create table if not exists public.trips (
  id uuid primary key,
  destination text not null,
  trip_data jsonb not null,
  created_at timestamptz not null default now()
);

-- IMPORTANT: This starter uses a service-role key on the backend for a local demo.
-- Never expose that key in React, commit it to Git, or deploy this unauthenticated
-- backend publicly. Before public deployment, implement Supabase Auth and RLS.
