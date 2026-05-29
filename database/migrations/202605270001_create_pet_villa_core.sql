CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE user_role AS ENUM ('owner', 'host', 'admin');
CREATE TYPE vaccine_status AS ENUM ('valid', 'expired', 'unknown');
CREATE TYPE service_type AS ENUM ('overnight_boarding', 'daycare');
CREATE TYPE booking_status AS ENUM (
  'pending_confirmation',
  'confirmed_awaiting_deposit',
  'deposit_paid',
  'in_boarding',
  'awaiting_final_payment',
  'completed',
  'cancelled',
  'refunded'
);
CREATE TYPE payment_stage AS ENUM ('deposit', 'final', 'refund');
CREATE TYPE payment_status AS ENUM ('pending', 'requires_action', 'paid', 'failed', 'refunded');
CREATE TYPE payment_method AS ENUM ('duitnow_qr', 'fpx', 'touch_n_go', 'grabpay', 'visa_mastercard');
CREATE TYPE notification_type AS ENUM (
  'booking_requested',
  'booking_confirmed',
  'booking_rejected',
  'payment_success',
  'diary_updated',
  'new_message',
  'boarding_started',
  'boarding_ended',
  'pet_health_alert'
);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role user_role NOT NULL DEFAULT 'owner',
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text NOT NULL,
  password_hash text,
  avatar_url text,
  fcm_token text,
  emergency_contact_name text,
  emergency_contact_phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE hosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT 'The Pet Villa Ipoh',
  address text,
  city text NOT NULL DEFAULT 'Ipoh',
  max_dogs_per_day int NOT NULL DEFAULT 3 CHECK (max_dogs_per_day = 3),
  accepts_min_weight_kg numeric(4,2) NOT NULL DEFAULT 1 CHECK (accepts_min_weight_kg = 1),
  accepts_max_weight_kg numeric(4,2) NOT NULL DEFAULT 12 CHECK (accepts_max_weight_kg = 12),
  overnight_price_sen int NOT NULL DEFAULT 4000,
  daycare_price_sen int NOT NULL DEFAULT 500,
  check_in_start time NOT NULL DEFAULT '09:00',
  check_in_end time NOT NULL DEFAULT '20:00',
  check_out_latest time NOT NULL DEFAULT '12:00',
  features text[] NOT NULL DEFAULT ARRAY['No cages','24h companionship','Daily 3-5 photo/video updates','Same sleeping environment','24h air conditioning'],
  payout_account_ref text,
  rating_average numeric(3,2) NOT NULL DEFAULT 0,
  rating_count int NOT NULL DEFAULT 0,
  is_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE pets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  species text NOT NULL DEFAULT 'dog',
  breed text NOT NULL,
  weight_kg numeric(4,2) NOT NULL CHECK (weight_kg >= 1 AND weight_kg <= 12),
  birthday date,
  sex text CHECK (sex IN ('male', 'female', 'unknown')),
  vaccine_status vaccine_status NOT NULL DEFAULT 'unknown',
  has_aggression boolean NOT NULL DEFAULT false,
  has_fleas boolean NOT NULL DEFAULT false,
  habits text,
  special_needs text,
  feeding_instructions text,
  medical_notes text,
  emergency_vet text,
  photo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pets_small_dog_only CHECK (species = 'dog' AND weight_kg BETWEEN 1 AND 12 AND has_aggression = false AND has_fleas = false)
);

CREATE TABLE bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  host_id uuid NOT NULL REFERENCES hosts(id) ON DELETE RESTRICT,
  pet_id uuid NOT NULL REFERENCES pets(id) ON DELETE RESTRICT,
  service_type service_type NOT NULL,
  status booking_status NOT NULL DEFAULT 'pending_confirmation',
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  check_in_at timestamptz,
  check_out_at timestamptz,
  currency char(3) NOT NULL DEFAULT 'MYR',
  subtotal_sen int NOT NULL CHECK (subtotal_sen >= 0),
  deposit_sen int NOT NULL CHECK (deposit_sen >= 0),
  final_payment_sen int NOT NULL CHECK (final_payment_sen >= 0),
  owner_notes text,
  host_decision_reason text,
  cancellation_reason text,
  refund_sen int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT booking_time_order CHECK (end_at > start_at),
  CONSTRAINT booking_split_payment CHECK (deposit_sen + final_payment_sen = subtotal_sen)
);

CREATE TABLE booking_status_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  from_status booking_status,
  to_status booking_status NOT NULL,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  actor_type text NOT NULL CHECK (actor_type IN ('owner', 'host', 'system')),
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  host_id uuid NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (booking_id, reviewer_id)
);

CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body text,
  media_url text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE diary_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mood text,
  meal_notes text,
  activity_notes text,
  health_alert boolean NOT NULL DEFAULT false,
  body text NOT NULL,
  media jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  deep_link text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  payer_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  stage payment_stage NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  method payment_method NOT NULL,
  currency char(3) NOT NULL DEFAULT 'MYR',
  amount_sen int NOT NULL CHECK (amount_sen >= 0),
  provider text,
  provider_payment_id text,
  provider_refund_id text,
  idempotency_key text NOT NULL,
  paid_at timestamptz,
  refunded_at timestamptz,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (idempotency_key)
);

CREATE INDEX idx_pets_owner ON pets(owner_id);
CREATE INDEX idx_hosts_user ON hosts(user_id);
CREATE INDEX idx_bookings_owner_status ON bookings(owner_id, status);
CREATE INDEX idx_bookings_host_status ON bookings(host_id, status);
CREATE INDEX idx_bookings_pet_dates ON bookings(pet_id, start_at, end_at);
CREATE INDEX idx_bookings_capacity ON bookings(host_id, start_at, end_at, status);
CREATE INDEX idx_messages_booking_created ON messages(booking_id, created_at);
CREATE INDEX idx_messages_unread ON messages(recipient_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_payments_booking_stage ON payments(booking_id, stage);
CREATE INDEX idx_payments_status ON payments(status);
