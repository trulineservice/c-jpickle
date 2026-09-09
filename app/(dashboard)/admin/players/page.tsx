import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import PlayersClient, { type PlayerSummary, type PlayerMatchRecord } from './players-client';

export const dynamic = 'force-dynamic';

export default async function AdminPlayersPage() {
  const supabase = await createClient();

  // 1. Authenticate user and verify Owner or Admin access
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['owner', 'admin'].includes(profile.role)) {
    redirect('/dashboard');
  }

  // 2. Fetch all Profiles (including email synced from auth)
  const { data: profilesData } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, role, created_at')
    .order('created_at', { ascending: false });

  // 3. Fetch all Bookings with Court Information
  const { data: bookingsData } = await supabase
    .from('bookings')
    .select(`
      id,
      court_id,
      user_id,
      guest_name,
      guest_email,
      guest_phone,
      start_time,
      end_time,
      duration_hours,
      total_price,
      status,
      payment_method,
      notes,
      created_at,
      courts ( name )
    `)
    .order('start_time', { ascending: false });

  // 4. Aggregate player profiles and histories
  const playersMap = new Map<string, {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    role: string;
    isRegistered: boolean;
    memberSince: string;
    courtCounts: Map<string, number>;
    bookings: PlayerMatchRecord[];
  }>();

  // Initialize registered profiles
  (profilesData || []).forEach((p) => {
    playersMap.set(p.id, {
      id: p.id,
      fullName: p.full_name || 'Member Player',
      email: p.email || '',
      phone: p.phone || '',
      role: p.role || 'client',
      isRegistered: true,
      memberSince: p.created_at,
      courtCounts: new Map<string, number>(),
      bookings: [],
    });
  });

  // Assign bookings to players (match by user_id or by guest_email)
  (bookingsData || []).forEach((b) => {
    const courtData = b.courts as unknown as { name: string } | { name: string }[] | null;
    const courtName = Array.isArray(courtData) ? courtData[0]?.name : courtData?.name || 'Indoor Court';
    
    const matchRecord: PlayerMatchRecord = {
      id: b.id,
      courtName,
      startTime: b.start_time,
      endTime: b.end_time,
      durationHours: Number(b.duration_hours) || 1,
      totalPrice: Number(b.total_price) || 0,
      status: b.status,
      paymentMethod: b.payment_method || 'paymongo',
      notes: b.notes,
      createdAt: b.created_at,
    };

    let targetPlayer = b.user_id ? playersMap.get(b.user_id) : undefined;

    // If booking was made with a registered email but missing user_id
    if (!targetPlayer && b.guest_email) {
      for (const p of playersMap.values()) {
        if (p.email && p.email.toLowerCase() === b.guest_email.toLowerCase()) {
          targetPlayer = p;
          break;
        }
      }
    }

    // If still not found, aggregate under guest player identifier
    if (!targetPlayer) {
      const guestKey = b.guest_email ? `guest:${b.guest_email.toLowerCase()}` : `guest-name:${b.guest_name || 'walk-in'}`;
      if (!playersMap.has(guestKey)) {
        playersMap.set(guestKey, {
          id: guestKey,
          fullName: b.guest_name || 'Walk-in Player',
          email: b.guest_email || '—',
          phone: b.guest_phone || '—',
          role: 'guest',
          isRegistered: false,
          memberSince: b.created_at,
          courtCounts: new Map<string, number>(),
          bookings: [],
        });
      }
      targetPlayer = playersMap.get(guestKey)!;
    }

    // Backfill contact details if missing
    if ((!targetPlayer.email || targetPlayer.email === '—') && b.guest_email) {
      targetPlayer.email = b.guest_email;
    }
    if ((!targetPlayer.phone || targetPlayer.phone === '—') && b.guest_phone) {
      targetPlayer.phone = b.guest_phone;
    }
    if ((!targetPlayer.fullName || targetPlayer.fullName === 'Member Player') && b.guest_name) {
      targetPlayer.fullName = b.guest_name;
    }

    targetPlayer.bookings.push(matchRecord);
    const curCount = targetPlayer.courtCounts.get(courtName) || 0;
    targetPlayer.courtCounts.set(courtName, curCount + 1);
  });

  // 5. Build final PlayerSummary objects
  const playerSummaries: PlayerSummary[] = Array.from(playersMap.values()).map((p) => {
    // Only count completed, checked-in, or walk-in matches as "played"
    const playedBookings = p.bookings.filter((b) => 
      ['paid', 'checked_in', 'walk_in'].includes(b.status)
    );

    const totalPlayed = playedBookings.length;
    const totalHours = playedBookings.reduce((sum, b) => sum + b.durationHours, 0);
    const totalSpend = playedBookings.reduce((sum, b) => sum + b.totalPrice, 0);

    // Favorite court
    let favoriteCourt = 'None';
    let maxPlays = 0;
    for (const [cName, count] of p.courtCounts.entries()) {
      if (count > maxPlays) {
        maxPlays = count;
        favoriteCourt = cName;
      }
    }

    // Most recent match date
    const lastPlayed = playedBookings.length > 0 ? playedBookings[0].startTime : null;

    return {
      id: p.id,
      fullName: p.fullName || 'Player',
      email: p.email || '—',
      phone: p.phone || '—',
      role: p.role,
      isRegistered: p.isRegistered,
      memberSince: p.memberSince,
      totalPlayed,
      totalHours,
      totalSpend,
      favoriteCourt,
      lastPlayed,
      bookings: p.bookings,
    };
  });

  // Sort by default: most played descending
  playerSummaries.sort((a, b) => b.totalPlayed - a.totalPlayed);

  return <PlayersClient players={playerSummaries} />;
}
