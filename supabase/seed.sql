-- ==============================================================================
-- C&J PICKLEBALL ARENA - DEFAULT SEED FILE (supabase/seed.sql)
-- Author: Database Manager Persona
-- Purpose: Populates 1,050 Users, 500+ Bookings, and 450+ POS Orders
-- ==============================================================================

-- 1. COURTS
INSERT INTO public.courts (id, name, type, hourly_rate, is_active)
VALUES 
  ('80d4920a-34d9-47f3-8f1b-4627f5b289de', 'Court 1 — Indoor (Pro Cushion)', 'indoor', 300.00, true),
  ('052becb1-e01d-4cd9-88ae-3d6e419259fd', 'Court 2 — Indoor (Tournament Spec)', 'indoor', 300.00, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  hourly_rate = EXCLUDED.hourly_rate,
  is_active = EXCLUDED.is_active;

-- 2. POS PRODUCTS
INSERT INTO public.pos_products (name, price, category, stock_level, is_active)
VALUES
  ('C&J Pro 16mm Carbon Paddle Rental', 150.00, 'Rentals', 50, true),
  ('Smart Ball Thrower Machine Rental (1 Hr)', 150.00, 'Rentals', 5, true),
  ('Franklin X-40 Tournament Ball (Single)', 120.00, 'Equipment', 200, true),
  ('Franklin X-40 3-Pack Tournament Tube', 320.00, 'Equipment', 80, true),
  ('C&J Performance Grip Tape', 90.00, 'Accessories', 150, true),
  ('C&J Dry-Fit Tourney Towel', 250.00, 'Apparel', 60, true),
  ('Gatorade 500ml (Blue Bolt)', 75.00, 'Beverages', 120, true),
  ('Gatorade 500ml (Lemon Lime)', 75.00, 'Beverages', 120, true),
  ('Mineral Water 500ml', 35.00, 'Beverages', 250, true),
  ('Electrolyte Coconut Water 330ml', 85.00, 'Beverages', 90, true),
  ('Pocari Sweat 500ml', 80.00, 'Beverages', 100, true)
ON CONFLICT (name) DO UPDATE SET
  price = EXCLUDED.price,
  category = EXCLUDED.category,
  is_active = EXCLUDED.is_active;

-- 3. 1,050 USERS
DO $$
DECLARE
  first_names text[] := ARRAY[
    'Juan', 'Maria', 'Jose', 'Paolo', 'Carlo', 'Mark', 'Joshua', 'Angelo', 'Christian', 'Daniel', 
    'Gabriel', 'John', 'Michael', 'Bea', 'Kathryn', 'Liza', 'Nadine', 'Julia', 'Sarah', 'Angel', 
    'Marian', 'Anne', 'Kim', 'Andrea', 'Sofia', 'Francine', 'Gillian', 'Patricia', 'Chloe', 'Samantha', 
    'Rafael', 'Diego', 'Mateo', 'Lorenzo', 'Joaquin', 'Emilio', 'Inigo', 'Andres', 'Lucas', 'Antonio', 
    'Miguel', 'Santino', 'Dante', 'Marco', 'Rico', 'Enzo', 'Anton', 'Marlon', 'Ramon', 'Vicente'
  ];
  last_names text[] := ARRAY[
    'Santos', 'Reyes', 'Cruz', 'Bautista', 'Ocampo', 'Garcia', 'Mendoza', 'Torres', 'Tomas', 'Andrada', 
    'Castillo', 'Flores', 'Villanueva', 'Ramos', 'Castro', 'Rivera', 'Aquino', 'Navarro', 'Salazar', 'Mercado', 
    'Dela Cruz', 'Del Rosario', 'Soriano', 'Valdez', 'Morales', 'Pascual', 'Manalo', 'Espiritu', 'Bernardo', 'Alcantara', 
    'Fernandez', 'Lopez', 'Gonzalez', 'Tolentino', 'Hernandez', 'Santiago', 'David', 'Lim', 'Tan', 'Ong', 
    'Sy', 'Chua', 'Guanzon', 'Yap', 'Co', 'Chavez', 'Velasco', 'Aguilar', 'Pineda', 'Serrano'
  ];
  fn_count int := array_length(first_names, 1);
  ln_count int := array_length(last_names, 1);
  i int;
  u_id uuid;
  u_first text;
  u_last text;
  u_fullname text;
  u_email text;
  u_phone text;
  u_role text;
  hashed_pwd text := '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
BEGIN
  FOR i IN 1..1050 LOOP
    u_id := gen_random_uuid();
    u_first := first_names[1 + ((i * 7 + 3) % fn_count)];
    u_last := last_names[1 + ((i * 13 + 7) % ln_count)];
    u_fullname := u_first || ' ' || u_last;

    IF i = 1 THEN
      u_role := 'owner';
      u_email := 'owner@cjcourt.com';
      u_fullname := 'Don Carlos Montemayor (Owner)';
    ELSIF i BETWEEN 2 AND 4 THEN
      u_role := 'admin';
      u_email := 'admin' || (i - 1) || '@cjcourt.com';
    ELSIF i BETWEEN 5 AND 10 THEN
      u_role := 'cashier';
      u_email := 'cashier' || (i - 4) || '@cjcourt.com';
    ELSE
      u_role := 'client';
      u_email := lower(replace(u_first, ' ', '')) || '.' || lower(replace(u_last, ' ', '')) || i || '@cjcourt.ph';
    END IF;

    u_phone := '09' || (17 + (i % 5)) || '-' || lpad((100 + (i * 37) % 900)::text, 3, '0') || '-' || lpad(((i * 123) % 10000)::text, 4, '0');

    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data
    )
    VALUES (
      u_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      u_email,
      hashed_pwd,
      now() - (random() * interval '60 days'),
      now() - (random() * interval '60 days'),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', u_fullname, 'role', u_role)
    )
    ON CONFLICT (email) DO NOTHING;

    INSERT INTO public.profiles (id, full_name, role, phone)
    SELECT id, u_fullname, u_role, u_phone
    FROM auth.users
    WHERE email = u_email
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      role = EXCLUDED.role,
      phone = EXCLUDED.phone;

  END LOOP;
END $$;

-- 4. 500+ BOOKINGS (NON-OVERLAPPING GIST SAFE)
DO $$
DECLARE
  court1_id uuid := '80d4920a-34d9-47f3-8f1b-4627f5b289de';
  court2_id uuid := '052becb1-e01d-4cd9-88ae-3d6e419259fd';
  court_ids uuid[] := ARRAY[court1_id, court2_id];
  c_id uuid;
  day_offset int;
  slot_idx int;
  base_date date;
  s_time timestamptz;
  e_time timestamptz;
  dur int;
  p_count int;
  has_ball_thrower boolean;
  b_price numeric(10,2);
  b_notes text;
  b_status text;
  b_payment text;
  u_record record;
  slot_hours int[] := ARRAY[6, 8, 10, 13, 15, 18, 20];
  slot_durs int[] := ARRAY[2, 1,  2,  1,  2,  2,  1];
  total_slots int := 7;
BEGIN
  FOR day_offset IN -40..10 LOOP
    base_date := (current_date + day_offset);

    FOREACH c_id IN ARRAY court_ids LOOP
      FOR slot_idx IN 1..total_slots LOOP
        IF ((day_offset * 17 + slot_idx * 11) % 4) != 0 THEN
          dur := slot_durs[slot_idx];
          s_time := (base_date + (slot_hours[slot_idx] || ' hours')::interval) AT TIME ZONE 'Asia/Manila';
          e_time := s_time + (dur || ' hours')::interval;

          IF e_time < now() THEN
            IF ((day_offset + slot_idx) % 15) = 0 THEN
              b_status := 'cancelled';
            ELSE
              b_status := 'checked_in';
            END IF;
          ELSE
            IF ((day_offset + slot_idx) % 7) = 0 THEN
              b_status := 'pending_payment';
            ELSE
              b_status := 'paid';
            END IF;
          END IF;

          CASE (abs(day_offset * 3 + slot_idx) % 5)
            WHEN 0 THEN p_count := 0;
            WHEN 1 THEN p_count := 2;
            WHEN 2 THEN p_count := 4;
            WHEN 3 THEN p_count := 2;
            ELSE p_count := 1;
          END CASE;

          has_ball_thrower := ((slot_idx + day_offset) % 6) = 0;
          b_price := (300.00 * dur) + (p_count * 150.00) + (CASE WHEN has_ball_thrower THEN 150.00 * dur ELSE 0.00 END);

          IF p_count > 0 AND has_ball_thrower THEN
            b_notes := p_count || 'x Pro Carbon Paddle Rental (+₱' || (p_count * 150) || ') • Smart Ball Thrower Machine (' || dur || 'hr @ ₱150/hr = +₱' || (dur * 150) || ')';
          ELSIF p_count > 0 THEN
            b_notes := p_count || 'x Pro Carbon Paddle Rental (+₱' || (p_count * 150) || ')';
          ELSIF has_ball_thrower THEN
            b_notes := 'Smart Ball Thrower Machine (' || dur || 'hr @ ₱150/hr = +₱' || (dur * 150) || ')';
          ELSE
            b_notes := NULL;
          END IF;

          CASE (abs(day_offset + slot_idx) % 3)
            WHEN 0 THEN b_payment := 'paymongo';
            WHEN 1 THEN b_payment := 'cash';
            ELSE b_payment := 'counter_qr';
          END CASE;

          SELECT id, full_name, phone INTO u_record
          FROM public.profiles
          WHERE role = 'client'
          OFFSET (abs(day_offset * 19 + slot_idx * 31) % 900)
          LIMIT 1;

          INSERT INTO public.bookings (
            court_id,
            user_id,
            guest_name,
            guest_email,
            guest_phone,
            start_time,
            end_time,
            duration_hours,
            total_price,
            currency,
            status,
            payment_method,
            notes,
            paddle_count,
            created_at,
            updated_at
          )
          VALUES (
            c_id,
            u_record.id,
            COALESCE(u_record.full_name, 'C&J Player'),
            'player' || abs(day_offset * 19 + slot_idx * 31) % 900 || '@cjcourt.ph',
            u_record.phone,
            s_time,
            e_time,
            dur,
            b_price,
            'PHP',
            b_status,
            b_payment,
            b_notes,
            p_count,
            s_time - interval '2 days',
            s_time - interval '2 days'
          );

        END IF;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

-- 5. 450 POS ORDERS (BIR EOPT COMPLIANT)
DO $$
DECLARE
  cashier_ids uuid[];
  tx_id uuid;
  tx_date timestamptz;
  inv_num text;
  c_name text;
  c_tin text;
  disc_type text;
  disc_id text;
  p1 record;
  p2 record;
  g_amount numeric(10,2);
  d_amount numeric(10,2);
  v_sales numeric(10,2);
  v_amt numeric(10,2);
  v_exempt numeric(10,2);
  t_amount numeric(10,2);
  pay_method text;
  i int;
  q1 int;
  q2 int;
BEGIN
  SELECT array_agg(id) INTO cashier_ids
  FROM public.profiles
  WHERE role IN ('cashier', 'admin', 'owner');

  IF cashier_ids IS NULL OR array_length(cashier_ids, 1) = 0 THEN
    SELECT array_agg(id) INTO cashier_ids FROM public.profiles LIMIT 5;
  END IF;

  FOR i IN 1..450 LOOP
    tx_id := gen_random_uuid();
    tx_date := (now() - ((450 - i) * interval '2.5 hours'));
    inv_num := 'SI-' || to_char(tx_date, 'YYYYMMDD') || '-' || lpad(i::text, 5, '0');

    IF (i % 10) = 0 THEN
      disc_type := 'senior_citizen';
      c_name := 'Senior Citizen Player #' || i;
      c_tin := '123-' || lpad((100 + i)::text, 3, '0') || '-' || lpad((200 + i)::text, 3, '0') || '-000';
      disc_id := 'OSCA-2024-' || lpad(i::text, 4, '0');
    ELSIF (i % 20) = 0 THEN
      disc_type := 'pwd';
      c_name := 'PWD Athlete #' || i;
      c_tin := '987-' || lpad((100 + i)::text, 3, '0') || '-' || lpad((300 + i)::text, 3, '0') || '-000';
      disc_id := 'PWD-NCR-' || lpad(i::text, 4, '0');
    ELSE
      disc_type := 'none';
      c_name := 'Walk-in Customer #' || i;
      c_tin := NULL;
      disc_id := NULL;
    END IF;

    SELECT id, price INTO p1 FROM public.pos_products OFFSET (i % 8) LIMIT 1;
    SELECT id, price INTO p2 FROM public.pos_products OFFSET ((i + 3) % 8) LIMIT 1;
    q1 := 1 + (i % 2);
    q2 := 1 + ((i * 3) % 3);

    g_amount := (p1.price * q1) + (p2.price * q2);

    IF disc_type IN ('senior_citizen', 'pwd') THEN
      v_exempt := ROUND(g_amount / 1.12, 2);
      d_amount := ROUND(v_exempt * 0.20, 2);
      v_sales := 0.00;
      v_amt := 0.00;
      t_amount := v_exempt - d_amount;
    ELSE
      v_sales := ROUND(g_amount / 1.12, 2);
      v_amt := ROUND(g_amount - v_sales, 2);
      v_exempt := 0.00;
      d_amount := 0.00;
      t_amount := g_amount;
    END IF;

    CASE (i % 3)
      WHEN 0 THEN pay_method := 'cash';
      WHEN 1 THEN pay_method := 'counter_qr';
      ELSE pay_method := 'paymongo';
    END CASE;

    INSERT INTO public.pos_transactions (
      id,
      invoice_number,
      cashier_id,
      customer_name,
      customer_tin,
      discount_type,
      discount_id_number,
      gross_amount,
      discount_amount,
      vatable_sales,
      vat_amount,
      vat_exempt_sales,
      zero_rated_sales,
      total_amount,
      payment_method,
      status,
      created_at
    )
    VALUES (
      tx_id,
      inv_num,
      cashier_ids[1 + (i % array_length(cashier_ids, 1))],
      c_name,
      c_tin,
      disc_type,
      disc_id,
      g_amount,
      d_amount,
      v_sales,
      v_amt,
      v_exempt,
      0.00,
      t_amount,
      pay_method,
      'completed',
      tx_date
    )
    ON CONFLICT (invoice_number) DO NOTHING;

    INSERT INTO public.pos_transaction_items (transaction_id, product_id, quantity, price_at_time)
    VALUES 
      (tx_id, p1.id, q1, p1.price),
      (tx_id, p2.id, q2, p2.price);

  END LOOP;
END $$;
