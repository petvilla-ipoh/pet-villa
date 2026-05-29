INSERT INTO users (id, role, name, email, phone)
SELECT gen_random_uuid(), 'owner', 'Owner ' || n, 'owner' || n || '@example.test', '+601200000' || n
FROM generate_series(1, 10) AS n;

INSERT INTO users (id, role, name, email, phone)
SELECT gen_random_uuid(), 'host', 'Host ' || n, 'host' || n || '@example.test', '+601300000' || n
FROM generate_series(1, 10) AS n;

INSERT INTO hosts (user_id, display_name, city, is_verified)
SELECT id, 'The Pet Villa Host ' || row_number() OVER (), 'Ipoh', true
FROM users
WHERE role = 'host';

INSERT INTO pets (owner_id, name, breed, weight_kg, vaccine_status, habits, special_needs)
SELECT id, 'Small Pup ' || row_number() OVER (), 'Poodle Mix', 4 + (row_number() OVER () % 7), 'valid', 'Sleeps with blanket', 'Bring own food'
FROM users
WHERE role = 'owner';

WITH owner_pet AS (
  SELECT p.id AS pet_id, p.owner_id FROM pets p LIMIT 10
),
first_host AS (
  SELECT id AS host_id FROM hosts LIMIT 1
)
INSERT INTO bookings (owner_id, host_id, pet_id, service_type, status, start_at, end_at, subtotal_sen, deposit_sen, final_payment_sen)
SELECT owner_id, host_id, pet_id, 'overnight_boarding', 'completed',
       now() - (n || ' days')::interval,
       now() - ((n - 2) || ' days')::interval,
       8000, 4000, 4000
FROM owner_pet, first_host, generate_series(5, 14) AS n
LIMIT 10;
