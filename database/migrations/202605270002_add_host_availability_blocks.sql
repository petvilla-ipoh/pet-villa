CREATE TABLE host_availability_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
  date date NOT NULL,
  blocked boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (host_id, date)
);

CREATE INDEX idx_host_availability_blocks_host_date ON host_availability_blocks(host_id, date);
