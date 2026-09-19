-- ============================================================================
-- C&J VENUES MIGRATION: EVENTS PLACE RENTAL & VIEW DECK PRIVATE LOUNGE
-- ============================================================================

INSERT INTO public.courts (id, name, type, status, hourly_rate)
VALUES 
  (
    'e0000001-0000-0000-0000-000000000001',
    'Events Place Rental (3rd Flr Banquet Hall)',
    'indoor',
    'active',
    7500.00
  ),
  (
    'e0000002-0000-0000-0000-000000000002',
    'View Deck Private Lounge (5th Flr)',
    'indoor',
    'active',
    2000.00
  )
ON CONFLICT (id) DO UPDATE 
SET 
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  status = EXCLUDED.status,
  hourly_rate = EXCLUDED.hourly_rate;

DO $$
DECLARE
  v_events_court_id UUID;
  v_viewdeck_court_id UUID;
  v_base_date DATE := CURRENT_DATE;
BEGIN
  SELECT id INTO v_events_court_id FROM public.courts WHERE name = 'Events Place Rental (3rd Flr Banquet Hall)' LIMIT 1;
  SELECT id INTO v_viewdeck_court_id FROM public.courts WHERE name = 'View Deck Private Lounge (5th Flr)' LIMIT 1;

  IF NOT EXISTS (SELECT 1 FROM public.bookings WHERE court_id = v_events_court_id AND notes LIKE '%Wedding Reception%') THEN
    INSERT INTO public.bookings (
      court_id,
      guest_name,
      guest_email,
      guest_phone,
      start_time,
      end_time,
      duration_hours,
      total_price,
      status,
      payment_method,
      notes
    ) VALUES (
      v_events_court_id,
      'Atty. Jerome & Dr. Karen Bautista',
      'bautista.wedding@gmail.com',
      '09171230382',
      (v_base_date + INTERVAL '2 days' + TIME '16:00:00') AT TIME ZONE 'Asia/Manila',
      (v_base_date + INTERVAL '2 days' + TIME '21:00:00') AT TIME ZONE 'Asia/Manila',
      5,
      35000.00,
      'paid',
      'paymongo',
      'Wedding Reception (150 Guests). 4-hr base + 1-hr extension. Air-conditioning, sound & lighting package included.'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.bookings WHERE court_id = v_events_court_id AND notes LIKE '%Corporate Fellowship%') THEN
    INSERT INTO public.bookings (
      court_id,
      guest_name,
      guest_email,
      guest_phone,
      start_time,
      end_time,
      duration_hours,
      total_price,
      status,
      payment_method,
      notes
    ) VALUES (
      v_events_court_id,
      'Rizal Builders Association (c/o Engr. Diaz)',
      'events@rizalbuilders.ph',
      '09189876543',
      (v_base_date + INTERVAL '3 days' + TIME '09:00:00') AT TIME ZONE 'Asia/Manila',
      (v_base_date + INTERVAL '3 days' + TIME '13:00:00') AT TIME ZONE 'Asia/Manila',
      4,
      30000.00,
      'paid',
      'paymongo',
      'Annual General Assembly & Corporate Fellowship (120 Pax). Stage setup & projector required.'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.bookings WHERE court_id = v_viewdeck_court_id AND notes LIKE '%18th Birthday%') THEN
    INSERT INTO public.bookings (
      court_id,
      guest_name,
      guest_email,
      guest_phone,
      start_time,
      end_time,
      duration_hours,
      total_price,
      status,
      payment_method,
      notes
    ) VALUES (
      v_viewdeck_court_id,
      'Samantha Nicole Reyes',
      'samanthareyes.events@outlook.com',
      '09766623453',
      (v_base_date + INTERVAL '1 day' + TIME '18:00:00') AT TIME ZONE 'Asia/Manila',
      (v_base_date + INTERVAL '1 day' + TIME '21:00:00') AT TIME ZONE 'Asia/Manila',
      3,
      6500.00,
      'paid',
      'counter_qr',
      '18th Birthday Sunset Dinner (22 Guests). 2-hr base + 1-hr extension. 100% consumable on View Deck Cafe menu.'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.bookings WHERE court_id = v_viewdeck_court_id AND notes LIKE '%Family Reunion%') THEN
    INSERT INTO public.bookings (
      court_id,
      guest_name,
      guest_email,
      guest_phone,
      start_time,
      end_time,
      duration_hours,
      total_price,
      status,
      payment_method,
      notes
    ) VALUES (
      v_viewdeck_court_id,
      'Del Rosario Clan (c/o Tita Marivic)',
      'marivic.delrosario@yahoo.com',
      '09205558899',
      (v_base_date + INTERVAL '3 days' + TIME '17:00:00') AT TIME ZONE 'Asia/Manila',
      (v_base_date + INTERVAL '3 days' + TIME '20:00:00') AT TIME ZONE 'Asia/Manila',
      3,
      6500.00,
      'paid',
      'cash',
      'Grandparents Golden Anniversary & Family Dinner (25 Guests). Acoustic live setup & panoramic skyline view.'
    );
  END IF;

END $$;
