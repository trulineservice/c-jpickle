import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import PlayersClient, { type PlayerSummary } from './players-client';
import {
  parsePaginationParams,
  buildRangeFromPage,
  buildPaginationMeta,
  type PaginationMeta,
} from '@/lib/pagination';

export const dynamic = 'force-dynamic';

export interface PlayerGlobalStats {
  totalActive: number;
  totalArchived: number;
  totalAll: number;
  totalMatchesPlayed: number;
  totalHoursPlayed: number;
}

export default async function AdminPlayersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const sp = await searchParams;

  // 1. Auth guard
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

  // 2. Parse URL params
  const { page, limit, search, sort, tab } = parsePaginationParams(sp, {
    tab: 'active',
    sort: 'matches_desc',
    limit: 25,
  });

  const activeTab = (tab === 'archived' || tab === 'all') ? tab : 'active';

  // 3. Build Supabase filters
  const { from, to } = buildRangeFromPage(page, limit);

  // Base query — profile + joined player_stats view
  type ProfileRow = {
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    role: string;
    created_at: string;
    is_deleted: boolean;
    deleted_at: string | null;
    deleted_reason: string | null;
    skill_level: string | null;
    emergency_contact: string | null;
    notes: string | null;
    player_stats: {
      total_played: number;
      total_hours: number;
      total_spend: number;
      last_played: string | null;
    } | null;
  };

  let countQuery = supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true });

  let dataQuery = supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      email,
      phone,
      role,
      created_at,
      is_deleted,
      deleted_at,
      deleted_reason,
      skill_level,
      emergency_contact,
      notes
    `);

  // Tab filter (is_deleted)
  if (activeTab === 'active') {
    countQuery = countQuery.eq('is_deleted', false);
    dataQuery = dataQuery.eq('is_deleted', false);
  } else if (activeTab === 'archived') {
    countQuery = countQuery.eq('is_deleted', true);
    dataQuery = dataQuery.eq('is_deleted', true);
  }

  // Search filter
  if (search.trim()) {
    const searchLike = `%${search.trim()}%`;
    countQuery = countQuery.or(
      `full_name.ilike.${searchLike},email.ilike.${searchLike},phone.ilike.${searchLike}`
    );
    dataQuery = dataQuery.or(
      `full_name.ilike.${searchLike},email.ilike.${searchLike},phone.ilike.${searchLike}`
    );
  }

  // Sort
  const sortMap: Record<string, { column: string; ascending: boolean }> = {
    name_asc: { column: 'full_name', ascending: true },
    recent: { column: 'created_at', ascending: false },
    matches_desc: { column: 'created_at', ascending: false },
    hours_desc: { column: 'created_at', ascending: false },
    spend_desc: { column: 'created_at', ascending: false },
  };
  const sortOpt = sortMap[sort] ?? { column: 'created_at', ascending: false };
  dataQuery = dataQuery.order(sortOpt.column, { ascending: sortOpt.ascending });

  // Apply pagination range
  dataQuery = dataQuery.range(from, to);

  // 4. Global stats & paginated profiles
  const [
    { count: totalActive },
    { count: totalArchived },
    { count: totalAll },
    { count: totalCount },
    { data: rawPlayers, error: rawError },
    { data: globalStatsRows },
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_deleted', false),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_deleted', true),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    countQuery,
    dataQuery,
    supabase.from('player_stats').select('total_played, total_hours'),
  ]);

  if (rawError) {
    console.error('[Admin Players Fetch Error]:', rawError);
  }

  // Fetch performance stats for the paginated slice of players
  const profileIds = (rawPlayers ?? []).map((p) => p.id);
  const { data: statsRows } = profileIds.length > 0
    ? await supabase
        .from('player_stats')
        .select('id, total_played, total_hours, total_spend, last_played')
        .in('id', profileIds)
    : { data: [] };

  const statsMap = new Map((statsRows ?? []).map((s) => [s.id, s]));

  const globalStats: PlayerGlobalStats = {
    totalActive: totalActive ?? 0,
    totalArchived: totalArchived ?? 0,
    totalAll: totalAll ?? 0,
    totalMatchesPlayed: (globalStatsRows ?? []).reduce(
      (sum: number, r: { total_played: number }) => sum + Number(r.total_played || 0),
      0
    ),
    totalHoursPlayed: (globalStatsRows ?? []).reduce(
      (sum: number, r: { total_hours: number }) => sum + Number(r.total_hours || 0),
      0
    ),
  };

  // 5. Map raw rows to PlayerSummary
  const playerSummaries: PlayerSummary[] = (rawPlayers ?? []).map((p) => {
    const stats = statsMap.get(p.id);
    return {
      id: p.id,
      fullName: p.full_name || 'Member Player',
      email: p.email || '—',
      phone: p.phone || '—',
      role: p.role || 'client',
      isRegistered: true,
      memberSince: p.created_at,
      isDeleted: Boolean(p.is_deleted),
      deletedAt: p.deleted_at || null,
      deletedReason: p.deleted_reason || null,
      skillLevel: p.skill_level || '3.0',
      emergencyContact: p.emergency_contact || null,
      notes: p.notes || null,
      totalPlayed: Number(stats?.total_played ?? 0),
      totalHours: Number(stats?.total_hours ?? 0),
      totalSpend: Number(stats?.total_spend ?? 0),
      favoriteCourt: 'Court',
      lastPlayed: stats?.last_played || null,
      bookings: [],
    };
  });

  // 6. Build pagination meta
  const meta: PaginationMeta = buildPaginationMeta(page, limit, totalCount ?? 0);

  return (
    <PlayersClient
      players={playerSummaries}
      meta={meta}
      globalStats={globalStats}
      activeTab={activeTab}
      currentSearch={search}
      currentSort={sort || 'matches_desc'}
    />
  );
}
