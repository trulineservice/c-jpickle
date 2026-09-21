'use client';

import { useState, useCallback, useTransition, useRef, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Users,
  Search,
  Trophy,
  History,
  X,
  CheckCircle2,
  AlertCircle,
  Plus,
  Pencil,
  Trash2,
  RotateCcw,
  Archive,
  UserCheck,
  UserX,
  Award,
  FileText,
  AlertTriangle,
  Phone,
  Mail,
} from 'lucide-react';
import {
  adminCreatePlayerAction,
  adminUpdatePlayerAction,
  adminSoftDeletePlayerAction,
  adminRestorePlayerAction,
  type AdminPlayerInput,
} from '@/app/actions';
import { PaginationBar } from '@/components/ui/pagination-bar';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import type { PaginationMeta } from '@/lib/pagination';
import type { PlayerGlobalStats } from './page';

export interface PlayerMatchRecord {
  id: string;
  courtName: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  totalPrice: number;
  status: string;
  paymentMethod: string;
  notes: string | null;
  createdAt: string;
}

export interface PlayerSummary {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  isRegistered: boolean;
  memberSince: string;
  isDeleted: boolean;
  deletedAt: string | null;
  deletedReason: string | null;
  skillLevel: string;
  emergencyContact: string | null;
  notes: string | null;
  totalPlayed: number;
  totalHours: number;
  totalSpend: number;
  favoriteCourt: string;
  lastPlayed: string | null;
  bookings: PlayerMatchRecord[];
}

const SKILL_LEVEL_OPTIONS = [
  { value: '2.0', label: '2.0 - Beginner (Learning Rules & Serving)' },
  { value: '2.5', label: '2.5 - Advanced Beginner (Sustains Short Rallies)' },
  { value: '3.0', label: '3.0 - Novice / Intermediate (Good Dinking & Serves)' },
  { value: '3.5', label: '3.5 - Solid Intermediate (Controlled Drops & Third Shots)' },
  { value: '4.0', label: '4.0 - Advanced (High Accuracy & Kitchen Control)' },
  { value: '4.5', label: '4.5 - Tournament / Semi-Pro (High Speed Firefights)' },
  { value: '5.0+', label: '5.0+ - Pro / Master Tier (Elite Competitive)' },
];

export default function PlayersClient({
  players,
  meta,
  globalStats,
  activeTab,
  currentSearch,
  currentSort,
}: {
  players: PlayerSummary[];
  meta: PaginationMeta;
  globalStats: PlayerGlobalStats;
  activeTab: 'active' | 'archived' | 'all';
  currentSearch: string;
  currentSort: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Local optimistic state for CRUD operations
  const [localPlayers, setLocalPlayers] = useState<PlayerSummary[]>(players);
  // Sync when server refreshes props
  useEffect(() => { setLocalPlayers(players); }, [players]);

  const [searchInput, setSearchInput] = useState(currentSearch);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modal states
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerSummary | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<PlayerSummary | null>(null);
  const [deletingPlayer, setDeletingPlayer] = useState<PlayerSummary | null>(null);
  const [deleteReasonPreset, setDeleteReasonPreset] = useState('Duplicate Profile');
  const [deleteReasonCustom, setDeleteReasonCustom] = useState('');

  // Form states
  const [formData, setFormData] = useState<AdminPlayerInput>({
    fullName: '',
    email: '',
    phone: '',
    role: 'client',
    skillLevel: '3.0',
    emergencyContact: '',
    notes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedbackMsg({ type, message });
    setTimeout(() => setFeedbackMsg(null), 5000);
  };

  // URL navigation helper
  const pushParams = useCallback(
    (updates: Record<string, string | number>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([k, v]) => params.set(k, String(v)));
      startTransition(() => router.push(`${pathname}?${params.toString()}`));
    },
    [router, pathname, searchParams]
  );

  // Tab change → reset to page 1
  const handleTabChange = (tab: 'active' | 'archived' | 'all') => {
    pushParams({ tab, page: 1, search: '' });
    setSearchInput('');
  };

  // Debounced search → page 1
  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      pushParams({ search: val, page: 1 });
    }, 400);
  };

  // Sort change → page 1
  const handleSortChange = (sort: string) => pushParams({ sort, page: 1 });

  // Pagination
  const handlePageChange = (page: number) => pushParams({ page });
  const handleLimitChange = (limit: number) => pushParams({ limit, page: 1 });

  // Global stats from full DB (never affected by current page/filter)
  const { totalActive, totalArchived, totalAll, totalMatchesPlayed, totalHoursPlayed } = globalStats;

  // Display list — use local optimistic state
  const displayPlayers = localPlayers;

  // Handle Create Player
  const handleOpenCreate = () => {
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      role: 'client',
      skillLevel: '3.0',
      emergencyContact: '',
      notes: '',
    });
    setShowCreateModal(true);
  };

  const submitCreatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim()) {
      showFeedback('error', 'Player full name is required.');
      return;
    }

    setIsSubmitting(true);
    const res = await adminCreatePlayerAction(formData);
    setIsSubmitting(false);

    if (!res.success) {
      showFeedback('error', res.error || 'Failed to create player profile.');
      return;
    }

    showFeedback('success', `Player "${formData.fullName}" successfully added to the roster!`);
    setShowCreateModal(false);

    // Optimistic append
    const newPlayer: PlayerSummary = {
      id: res.playerId || crypto.randomUUID(),
      fullName: formData.fullName.trim(),
      email: formData.email?.trim() || '—',
      phone: formData.phone?.trim() || '—',
      role: formData.role || 'client',
      isRegistered: true,
      memberSince: new Date().toISOString(),
      isDeleted: false,
      deletedAt: null,
      deletedReason: null,
      skillLevel: formData.skillLevel || '3.0',
      emergencyContact: formData.emergencyContact || null,
      notes: formData.notes || null,
      totalPlayed: 0,
      totalHours: 0,
      totalSpend: 0,
      favoriteCourt: 'None',
      lastPlayed: null,
      bookings: [],
    };
    setLocalPlayers((prev) => [newPlayer, ...prev]);
    router.refresh();
  };

  // Handle Edit Player
  const handleOpenEdit = (player: PlayerSummary) => {
    setEditingPlayer(player);
    setFormData({
      fullName: player.fullName,
      email: player.email === '—' ? '' : player.email,
      phone: player.phone === '—' ? '' : player.phone,
      role: (player.role === 'client' || player.role === 'customer' ? player.role : 'client') as 'client' | 'customer',
      skillLevel: player.skillLevel || '3.0',
      emergencyContact: player.emergencyContact || '',
      notes: player.notes || '',
    });
  };

  const submitUpdatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer) return;

    setIsSubmitting(true);
    const res = await adminUpdatePlayerAction(editingPlayer.id, formData);
    setIsSubmitting(false);

    if (!res.success) {
      showFeedback('error', res.error || 'Failed to update player.');
      return;
    }

    showFeedback('success', `Player profile for "${formData.fullName}" updated.`);
    setEditingPlayer(null);

    // Optimistic update
    setLocalPlayers((prev) =>
      prev.map((p) =>
        p.id === editingPlayer.id
          ? {
              ...p,
              fullName: formData.fullName.trim(),
              email: formData.email?.trim() || '—',
              phone: formData.phone?.trim() || '—',
              role: formData.role || p.role,
              skillLevel: formData.skillLevel || '3.0',
              emergencyContact: formData.emergencyContact || null,
              notes: formData.notes || null,
            }
          : p
      )
    );
    router.refresh();
  };

  // Handle Soft Delete
  const handleOpenDelete = (player: PlayerSummary) => {
    setDeletingPlayer(player);
    setDeleteReasonPreset('Duplicate Profile');
    setDeleteReasonCustom('');
  };

  const submitSoftDelete = async () => {
    if (!deletingPlayer) return;

    const finalReason = deleteReasonPreset === 'Other'
      ? (deleteReasonCustom.trim() || 'Archived by Administrator')
      : deleteReasonPreset;

    setIsSubmitting(true);
    const res = await adminSoftDeletePlayerAction(deletingPlayer.id, finalReason);
    setIsSubmitting(false);

    if (!res.success) {
      showFeedback('error', res.error || 'Failed to soft delete player.');
      return;
    }

    showFeedback('success', `Player "${deletingPlayer.fullName}" was soft-deleted and archived.`);
    setDeletingPlayer(null);

    // Optimistic update
    setLocalPlayers((prev) =>
      prev.map((p) =>
        p.id === deletingPlayer.id
          ? { ...p, isDeleted: true, deletedAt: new Date().toISOString(), deletedReason: finalReason }
          : p
      )
    );
    if (selectedPlayer?.id === deletingPlayer.id) {
      setSelectedPlayer((prev) => prev ? { ...prev, isDeleted: true, deletedAt: new Date().toISOString(), deletedReason: finalReason } : null);
    }
    router.refresh();
  };

  // Handle Restore Player
  const submitRestorePlayer = async (player: PlayerSummary) => {
    setIsSubmitting(true);
    const res = await adminRestorePlayerAction(player.id);
    setIsSubmitting(false);

    if (!res.success) {
      showFeedback('error', res.error || 'Failed to restore player.');
      return;
    }

    showFeedback('success', `Player "${player.fullName}" has been restored to active status.`);

    // Optimistic update
    setLocalPlayers((prev) =>
      prev.map((p) =>
        p.id === player.id
          ? { ...p, isDeleted: false, deletedAt: null, deletedReason: null }
          : p
      )
    );
    if (selectedPlayer?.id === player.id) {
      setSelectedPlayer((prev) => prev ? { ...prev, isDeleted: false, deletedAt: null, deletedReason: null } : null);
    }
    router.refresh();
  };

  const formatDateTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '—';
      return new Intl.DateTimeFormat('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Manila'
      }).format(d);
    } catch {
      return '—';
    }
  };

  const formatDateOnly = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '—';
      return new Intl.DateTimeFormat('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'Asia/Manila'
      }).format(d);
    } catch {
      return '—';
    }
  };

  return (
    <div className="space-y-6 text-foreground font-sans">
      
      {/* Toast Feedback Alert */}
      {feedbackMsg && (
        <div className={`p-4 border text-xs font-bold flex items-center justify-between animate-in fade-in duration-150 ${
          feedbackMsg.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 text-emerald-800 dark:text-emerald-300'
            : 'bg-red-50 dark:bg-red-950/60 border-red-300 text-red-800 dark:text-red-300'
        }`}>
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
            <span>{feedbackMsg.message}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-slate-400 hover:text-slate-700">✕</button>
        </div>
      )}

      {/* Header Bar */}
      <div className="border-b border-slate-300 dark:border-white/15 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#0B2A67] dark:text-[#FFD21C] bg-[#EDF4FC] dark:bg-[#0c1a3b] px-2.5 py-0.5 border border-[#0B2A67]/20 dark:border-[#FFD21C]/30">
              Admin &bull; Member Directory
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Player Intelligence &amp; Soft-Delete Management
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#0B2A67] dark:text-white">
            Players Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Full player profile CRUD with audit-safe soft deletes. Deleting archives the player while permanently preserving match bookings and sales invoices.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={handleOpenCreate}
            className="rounded-none text-xs font-black bg-[#FFD21C] hover:bg-[#E8BA00] text-[#0B2A67] h-9 px-4 flex items-center gap-1.5 shadow-xs transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Register New Player</span>
          </Button>
        </div>
      </div>

      {/* Facility KPI Metrics Grid — always reflects full DB, never paginated slice */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="border border-slate-300 dark:border-white/15 bg-white dark:bg-[#071E4B] p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Active Players</span>
            <div className="w-7 h-7 bg-emerald-50 dark:bg-emerald-950/60 text-[#007d48] dark:text-emerald-400 flex items-center justify-center border border-emerald-200">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-[#007d48] dark:text-emerald-400 my-1">
            {totalActive.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500">Entire database — all active members</p>
        </div>

        <div className="border border-slate-300 dark:border-white/15 bg-white dark:bg-[#071E4B] p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Archived (Soft Deleted)</span>
            <div className="w-7 h-7 bg-rose-50 dark:bg-rose-950/60 text-[#bf050b] dark:text-rose-400 flex items-center justify-center border border-rose-200">
              <Archive className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-[#bf050b] dark:text-rose-400 my-1">
            {totalArchived.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500">Audit-preserved &bull; Restore anytime</p>
        </div>

        <div className="border border-slate-300 dark:border-white/15 bg-white dark:bg-[#071E4B] p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Total Matches Played</span>
            <div className="w-7 h-7 bg-blue-50 dark:bg-blue-950/60 text-[#0B2A67] dark:text-blue-300 flex items-center justify-center border border-blue-200">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-[#0B2A67] dark:text-white my-1">
            {totalMatchesPlayed.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500">
            {totalHoursPlayed.toLocaleString()} Cumulative Court Hours
          </p>
        </div>

        <div className="border border-slate-300 dark:border-white/15 bg-white dark:bg-[#071E4B] p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Total Database Profiles</span>
            <div className="w-7 h-7 bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white flex items-center justify-center border border-slate-300">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-foreground my-1">
            {totalAll.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500">Complete Player Historical Roster</p>
        </div>
      </div>

      {/* Filter and Search Controls (Tabular Grid Controls) */}
      <div className="border border-slate-300 dark:border-white/15 bg-white dark:bg-[#071E4B] p-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs">
        
        {/* Status Tab Switcher (URL-driven) */}
        <div className="flex items-center border border-slate-300 dark:border-white/15 bg-slate-100 dark:bg-black/40">
          <button
            type="button"
            onClick={() => handleTabChange('active')}
            className={`px-3.5 py-1.5 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer rounded-none ${
              activeTab === 'active'
                ? 'bg-[#0B2A67] text-white dark:bg-[#FFD21C] dark:text-[#0B2A67]'
                : 'text-slate-600 dark:text-slate-300 hover:text-[#0B2A67]'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Active Players ({totalActive.toLocaleString()})</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('archived')}
            className={`px-3.5 py-1.5 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer rounded-none ${
              activeTab === 'archived'
                ? 'bg-[#bf050b] text-white dark:bg-red-700 dark:text-white'
                : 'text-slate-600 dark:text-slate-300 hover:text-[#bf050b]'
            }`}
          >
            <UserX className="w-3.5 h-3.5" />
            <span>Archived ({totalArchived.toLocaleString()})</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('all')}
            className={`px-3.5 py-1.5 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer rounded-none ${
              activeTab === 'all'
                ? 'bg-[#0B2A67] text-white dark:bg-[#FFD21C] dark:text-[#0B2A67]'
                : 'text-slate-600 dark:text-slate-300 hover:text-[#0B2A67]'
            }`}
          >
            <span>All ({totalAll.toLocaleString()})</span>
          </button>
        </div>

        {/* Search (debounced → URL) */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search name, email, phone, skill..."
            className="pl-9 h-9 text-xs rounded-none bg-slate-50 dark:bg-black/30 border border-slate-300 dark:border-white/15"
          />
          {searchInput && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-foreground text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Sort Controls (URL-driven) */}
        <div className="flex items-center gap-2">
          <select
            value={currentSort || 'matches_desc'}
            onChange={(e) => handleSortChange(e.target.value)}
            className="h-9 px-3 text-xs font-bold rounded-none bg-[#EDF4FC] dark:bg-[#0c1a3b] border border-[#0B2A67]/20 dark:border-white/15 text-[#0B2A67] dark:text-white outline-none cursor-pointer"
          >
            <option value="matches_desc">Sort: Most Played</option>
            <option value="hours_desc">Sort: Court Hours</option>
            <option value="spend_desc">Sort: Highest Spend</option>
            <option value="recent">Sort: Recently Active</option>
            <option value="name_asc">Sort: Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Main Players Table Grid (Non-Rounded) */}
      <div className="border border-slate-300 dark:border-white/15 bg-white dark:bg-[#071E4B] overflow-x-auto shadow-xs">
        <Table>
          <TableHeader className="bg-[#0B2A67] text-white">
            <TableRow className="border-none hover:bg-transparent">
              <TableHead className="text-xs font-black uppercase tracking-wider text-white py-3">Player Name &amp; Tier</TableHead>
              <TableHead className="text-xs font-black uppercase tracking-wider text-white py-3">Skill Level (DUPR)</TableHead>
              <TableHead className="text-xs font-black uppercase tracking-wider text-white py-3">Contact Details</TableHead>
              <TableHead className="text-center text-xs font-black uppercase tracking-wider text-white py-3">Matches / Hrs</TableHead>
              <TableHead className="text-right text-xs font-black uppercase tracking-wider text-white py-3">Total Spend (PHP)</TableHead>
              <TableHead className="text-xs font-black uppercase tracking-wider text-white py-3">Fav Court</TableHead>
              <TableHead className="text-xs font-black uppercase tracking-wider text-white py-3">Status</TableHead>
              <TableHead className="text-right text-xs font-black uppercase tracking-wider text-white py-3 w-44">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              <TableSkeleton rows={Math.min(meta.limit, 8)} columns={8} />
            ) : displayPlayers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-16 text-slate-400 text-xs font-medium">
                  No players found matching your filter criteria.
                </TableCell>
              </TableRow>
            ) : (
              displayPlayers.map((player) => (
                <TableRow
                  key={player.id}
                  className={`border-b border-slate-100 dark:border-white/10 hover:bg-[#EDF4FC]/40 dark:hover:bg-white/5 transition-colors cursor-pointer ${
                    player.isDeleted ? 'bg-red-50/20 dark:bg-red-950/10 opacity-75' : ''
                  }`}
                  onClick={() => setSelectedPlayer(player)}
                >
                  {/* Name & Avatar */}
                  <TableCell className="py-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-none text-white flex items-center justify-center font-bold text-xs shrink-0 ${
                        player.isDeleted
                          ? 'bg-red-700'
                          : player.isRegistered
                          ? 'bg-[#0B2A67] dark:bg-[#FFD21C] dark:text-[#0B2A67]'
                          : 'bg-slate-500'
                      }`}>
                        {(player.fullName || 'P').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-black text-xs text-foreground flex items-center gap-1.5">
                          <span>{player.fullName}</span>
                          {player.isDeleted && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.2 bg-red-100 text-red-700 border border-red-300">
                              Archived
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 block">
                          Member since {formatDateOnly(player.memberSince)}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  {/* Skill Level */}
                  <TableCell className="py-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black uppercase border border-amber-300 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300">
                      <Award className="w-3 h-3 text-amber-600" />
                      <span>{player.skillLevel || '3.0'}</span>
                    </span>
                  </TableCell>

                  {/* Contact */}
                  <TableCell className="py-3 text-xs">
                    <div className="font-medium text-foreground">{player.email || '—'}</div>
                    <div className="text-[11px] font-mono text-slate-500">{player.phone || '—'}</div>
                  </TableCell>

                  {/* Matches & Hours */}
                  <TableCell className="py-3 text-center">
                    <span className="font-black text-xs font-mono text-foreground block">
                      {player.totalPlayed} matches
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {player.totalHours} hrs
                    </span>
                  </TableCell>

                  {/* Total Spend */}
                  <TableCell className="py-3 text-right font-black font-mono text-xs sm:text-sm text-[#007d48] dark:text-emerald-400">
                    ₱{player.totalSpend.toFixed(2)}
                  </TableCell>

                  {/* Favorite Court */}
                  <TableCell className="py-3 text-xs text-slate-600 dark:text-slate-300 truncate max-w-[130px]">
                    {player.favoriteCourt}
                  </TableCell>

                  {/* Status Badge */}
                  <TableCell className="py-3">
                    {player.isDeleted ? (
                      <div>
                        <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-red-100 text-red-800 border border-red-300 block w-max">
                          Soft Deleted
                        </span>
                        {player.deletedReason && (
                          <span className="text-[9px] text-slate-400 truncate max-w-[100px] block mt-0.5" title={player.deletedReason}>
                            {player.deletedReason}
                          </span>
                        )}
                      </div>
                    ) : player.isRegistered ? (
                      <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-emerald-100 text-[#007d48] border border-emerald-300">
                        Active Member
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-slate-100 text-slate-600 border border-slate-300">
                        Walk-in Guest
                      </span>
                    )}
                  </TableCell>

                  {/* Action Buttons */}
                  <TableCell className="py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      {!player.isDeleted ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEdit(player)}
                            className="h-7 px-2 text-[11px] rounded-none border-slate-300 dark:border-white/15 hover:bg-[#EDF4FC] cursor-pointer"
                            title="Edit Player Details"
                          >
                            <Pencil className="w-3 h-3 text-[#0B2A67] dark:text-[#FFD21C]" />
                            <span className="hidden xl:inline ml-1">Edit</span>
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenDelete(player)}
                            disabled={player.role === 'owner' || player.role === 'admin'}
                            className="h-7 px-2 text-[11px] rounded-none border-red-200 text-red-600 hover:bg-red-50 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            title={player.role === 'owner' || player.role === 'admin' ? "Admins cannot be deleted" : "Soft Delete / Archive Player"}
                          >
                            <Trash2 className="w-3 h-3" />
                            <span className="hidden xl:inline ml-1">Archive</span>
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => submitRestorePlayer(player)}
                          disabled={isSubmitting}
                          className="h-7 px-2 text-[11px] rounded-none bg-[#007d48] hover:bg-[#00663a] text-white font-bold cursor-pointer"
                          title="Restore Player to Active Roster"
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          <span>Restore</span>
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedPlayer(player)}
                        className="h-7 px-2 text-[11px] rounded-none text-slate-600 hover:bg-slate-100 cursor-pointer"
                        title="View Complete Match History"
                      >
                        <History className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination Bar */}
        <div className="px-4 pb-4">
          <PaginationBar
            meta={meta}
            onPageChange={handlePageChange}
            onLimitChange={handleLimitChange}
            label={activeTab === 'archived' ? 'archived players' : activeTab === 'all' ? 'players' : 'active players'}
            isLoading={isPending}
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. REGISTER NEW PLAYER MODAL (CREATE)                                     */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#071E4B] border border-slate-300 dark:border-white/20 p-6 shadow-2xl max-w-lg w-full text-foreground space-y-4 rounded-none">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-none bg-[#0B2A67] text-white flex items-center justify-center font-bold">
                  <Plus className="w-4 h-4 stroke-[3]" />
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-wider text-[#0B2A67] dark:text-white">
                    Register New Player Profile
                  </h3>
                  <p className="text-[11px] text-slate-500">Create a member or player record in C&amp;J directory</p>
                </div>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={submitCreatePlayer} className="space-y-3.5 pt-1">
              <div className="space-y-1">
                <Label className="text-xs font-bold uppercase tracking-wider text-[#0B2A67] dark:text-white">
                  Full Name *
                </Label>
                <Input
                  type="text"
                  placeholder="e.g. Rafael Nadal"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="h-9 text-xs font-semibold rounded-none bg-slate-50 dark:bg-black/30 border border-slate-300 dark:border-white/15"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold uppercase tracking-wider text-[#0B2A67] dark:text-white">
                    Email Address
                  </Label>
                  <Input
                    type="email"
                    placeholder="player@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="h-9 text-xs rounded-none bg-slate-50 dark:bg-black/30 border border-slate-300 dark:border-white/15"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold uppercase tracking-wider text-[#0B2A67] dark:text-white">
                    Phone Number
                  </Label>
                  <Input
                    type="tel"
                    placeholder="09XX-XXX-XXXX"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="h-9 text-xs rounded-none bg-slate-50 dark:bg-black/30 border border-slate-300 dark:border-white/15 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold uppercase tracking-wider text-[#0B2A67] dark:text-white">
                    Skill Level / DUPR
                  </Label>
                  <select
                    value={formData.skillLevel}
                    onChange={(e) => setFormData({ ...formData, skillLevel: e.target.value })}
                    className="w-full h-9 px-3 text-xs font-bold rounded-none bg-slate-50 dark:bg-black/30 border border-slate-300 dark:border-white/15 text-[#0B2A67] dark:text-white"
                  >
                    {SKILL_LEVEL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value} className="dark:bg-[#071E4B]">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold uppercase tracking-wider text-[#0B2A67] dark:text-white">
                    Directory Role
                  </Label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full h-9 px-3 text-xs font-bold rounded-none bg-slate-50 dark:bg-black/30 border border-slate-300 dark:border-white/15 text-[#0B2A67] dark:text-white"
                  >
                    <option value="client" className="dark:bg-[#071E4B]">Client / Member</option>
                    <option value="customer" className="dark:bg-[#071E4B]">Regular Customer</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold uppercase tracking-wider text-[#0B2A67] dark:text-white">
                  Emergency Contact / Phone (Optional)
                </Label>
                <Input
                  type="text"
                  placeholder="e.g. Maria Santos (0917-555-1234)"
                  value={formData.emergencyContact}
                  onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                  className="h-9 text-xs rounded-none bg-slate-50 dark:bg-black/30 border border-slate-300 dark:border-white/15"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold uppercase tracking-wider text-[#0B2A67] dark:text-white">
                  Player Remarks / Medical Notes (Optional)
                </Label>
                <Input
                  type="text"
                  placeholder="e.g. Right handed, prefers indoor court 1"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="h-9 text-xs rounded-none bg-slate-50 dark:bg-black/30 border border-slate-300 dark:border-white/15"
                />
              </div>

              <div className="pt-2 flex gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 h-9 text-xs font-bold rounded-none border-slate-300 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 h-9 text-xs bg-[#FFD21C] hover:bg-[#E8BA00] text-[#0B2A67] rounded-none font-black cursor-pointer"
                >
                  {isSubmitting ? 'Creating Profile...' : 'Confirm Registration'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. EDIT PLAYER MODAL (UPDATE)                                             */}
      {/* ========================================================================= */}
      {editingPlayer && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#071E4B] border border-slate-300 dark:border-white/20 p-6 shadow-2xl max-w-lg w-full text-foreground space-y-4 rounded-none">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-none bg-[#0B2A67] text-white flex items-center justify-center">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-wider text-[#0B2A67] dark:text-white">
                    Edit Player Profile
                  </h3>
                  <p className="text-[11px] text-slate-500">Update player contact details, skill level, and remarks</p>
                </div>
              </div>
              <button onClick={() => setEditingPlayer(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={submitUpdatePlayer} className="space-y-3.5 pt-1">
              <div className="space-y-1">
                <Label className="text-xs font-bold uppercase tracking-wider text-[#0B2A67] dark:text-white">
                  Full Name *
                </Label>
                <Input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="h-9 text-xs font-semibold rounded-none bg-slate-50 dark:bg-black/30 border border-slate-300 dark:border-white/15"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold uppercase tracking-wider text-[#0B2A67] dark:text-white">
                    Email Address
                  </Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="h-9 text-xs rounded-none bg-slate-50 dark:bg-black/30 border border-slate-300 dark:border-white/15"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold uppercase tracking-wider text-[#0B2A67] dark:text-white">
                    Phone Number
                  </Label>
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="h-9 text-xs rounded-none bg-slate-50 dark:bg-black/30 border border-slate-300 dark:border-white/15 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold uppercase tracking-wider text-[#0B2A67] dark:text-white">
                    Skill Level / DUPR
                  </Label>
                  <select
                    value={formData.skillLevel}
                    onChange={(e) => setFormData({ ...formData, skillLevel: e.target.value })}
                    className="w-full h-9 px-3 text-xs font-bold rounded-none bg-slate-50 dark:bg-black/30 border border-slate-300 dark:border-white/15 text-[#0B2A67] dark:text-white"
                  >
                    {SKILL_LEVEL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value} className="dark:bg-[#071E4B]">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold uppercase tracking-wider text-[#0B2A67] dark:text-white">
                    Role
                  </Label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full h-9 px-3 text-xs font-bold rounded-none bg-slate-50 dark:bg-black/30 border border-slate-300 dark:border-white/15 text-[#0B2A67] dark:text-white"
                  >
                    <option value="client" className="dark:bg-[#071E4B]">Client / Member</option>
                    <option value="customer" className="dark:bg-[#071E4B]">Regular Customer</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold uppercase tracking-wider text-[#0B2A67] dark:text-white">
                  Emergency Contact (Optional)
                </Label>
                <Input
                  type="text"
                  value={formData.emergencyContact}
                  onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                  className="h-9 text-xs rounded-none bg-slate-50 dark:bg-black/30 border border-slate-300 dark:border-white/15"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold uppercase tracking-wider text-[#0B2A67] dark:text-white">
                  Notes / Player Remarks
                </Label>
                <Input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="h-9 text-xs rounded-none bg-slate-50 dark:bg-black/30 border border-slate-300 dark:border-white/15"
                />
              </div>

              <div className="pt-2 flex gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingPlayer(null)}
                  className="flex-1 h-9 text-xs font-bold rounded-none border-slate-300 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 h-9 text-xs bg-[#0B2A67] hover:bg-[#123A82] text-white rounded-none font-black cursor-pointer"
                >
                  {isSubmitting ? 'Saving Changes...' : 'Save Profile'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SOFT DELETE CONFIRMATION MODAL                                         */}
      {/* ========================================================================= */}
      {deletingPlayer && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#071E4B] border border-red-300 dark:border-red-900 p-6 shadow-2xl max-w-md w-full text-foreground space-y-4 rounded-none">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-white/10">
              <div className="w-9 h-9 rounded-none bg-red-100 dark:bg-red-950 text-red-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-sm uppercase tracking-wider text-[#bf050b] dark:text-red-400">
                  Soft Delete Player
                </h3>
                <p className="text-[11px] text-slate-500">Archive profile while preserving financial history</p>
              </div>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-2 leading-relaxed">
              <p>
                Are you sure you want to archive <strong>&ldquo;{deletingPlayer.fullName}&rdquo;</strong>?
              </p>
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] text-[#007d48] dark:text-emerald-300">
                🛡️ <strong>Audit Protection:</strong> This player will be hidden from new bookings, but their <strong>{deletingPlayer.totalPlayed} past match bookings</strong> and payment receipts will remain completely preserved. You can restore this player anytime.
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-[#0B2A67] dark:text-white">
                Reason for Archiving:
              </Label>
              <select
                value={deleteReasonPreset}
                onChange={(e) => setDeleteReasonPreset(e.target.value)}
                className="w-full h-9 px-3 text-xs font-bold rounded-none bg-slate-50 dark:bg-black/30 border border-slate-300 dark:border-white/15"
              >
                <option value="Duplicate Profile">Duplicate Profile</option>
                <option value="Player Requested Deletion">Player Requested Deactivation</option>
                <option value="Inactive / Churned Player">Inactive / Churned Player</option>
                <option value="Policy Violation">Suspended - Court Policy Violation</option>
                <option value="Other">Other Reason...</option>
              </select>

              {deleteReasonPreset === 'Other' && (
                <Input
                  type="text"
                  placeholder="Specify custom archive reason..."
                  value={deleteReasonCustom}
                  onChange={(e) => setDeleteReasonCustom(e.target.value)}
                  className="h-9 text-xs rounded-none bg-slate-50 dark:bg-black/30 border border-slate-300 mt-1"
                />
              )}
            </div>

            <div className="pt-2 flex gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeletingPlayer(null)}
                className="flex-1 h-9 text-xs font-bold rounded-none border-slate-300 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={submitSoftDelete}
                disabled={isSubmitting}
                className="flex-1 h-9 text-xs bg-[#bf050b] hover:bg-[#990409] text-white rounded-none font-black cursor-pointer"
              >
                {isSubmitting ? 'Archiving...' : 'Confirm Soft Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. PLAYER DETAILS & MATCH HISTORY MODAL                                   */}
      {/* ========================================================================= */}
      {selectedPlayer && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#071E4B] border border-slate-300 dark:border-white/20 w-full max-w-4xl max-h-[90vh] flex flex-col text-foreground shadow-2xl rounded-none">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50 dark:bg-black/20">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-none text-white flex items-center justify-center font-bold text-sm shrink-0 ${
                  selectedPlayer.isDeleted ? 'bg-red-700' : 'bg-[#0B2A67] dark:bg-[#FFD21C] dark:text-[#0B2A67]'
                }`}>
                  {(selectedPlayer.fullName || 'P').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-black text-base uppercase tracking-tight text-[#0B2A67] dark:text-white flex items-center gap-2">
                    <span>{selectedPlayer.fullName}</span>
                    {selectedPlayer.isDeleted ? (
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-red-100 text-red-800 border border-red-300">
                        Archived Profile
                      </span>
                    ) : (
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-emerald-100 text-[#007d48] border border-emerald-300">
                        Active Roster
                      </span>
                    )}
                  </h3>
                  <div className="text-xs text-slate-500 flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1 font-mono">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {selectedPlayer.phone || 'No phone'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-400" />
                      {selectedPlayer.email || 'No email'}
                    </span>
                    <span className="flex items-center gap-1 font-bold text-amber-700 dark:text-amber-300">
                      <Award className="w-3 h-3 text-amber-500" />
                      DUPR: {selectedPlayer.skillLevel || '3.0'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!selectedPlayer.isDeleted ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEdit(selectedPlayer)}
                      className="h-8 text-xs font-bold rounded-none border-slate-300 cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5 mr-1" />
                      Edit Profile
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenDelete(selectedPlayer)}
                      disabled={selectedPlayer.role === 'owner' || selectedPlayer.role === 'admin'}
                      className="h-8 text-xs font-bold rounded-none border-red-300 text-red-600 hover:bg-red-50 cursor-pointer disabled:opacity-30"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Archive
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => submitRestorePlayer(selectedPlayer)}
                    className="h-8 text-xs font-bold rounded-none bg-[#007d48] text-white hover:bg-[#00663a] cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1" />
                    Restore Player
                  </Button>
                )}

                <button
                  onClick={() => setSelectedPlayer(null)}
                  className="p-1 rounded-none text-slate-400 hover:text-slate-700 ml-2 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-300 dark:bg-white/10 border-b border-slate-300 dark:border-white/10 text-center">
              <div className="bg-white dark:bg-[#071E4B] p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Matches Played</span>
                <span className="text-xl font-black font-mono text-[#0B2A67] dark:text-white">{selectedPlayer.totalPlayed}</span>
              </div>
              <div className="bg-white dark:bg-[#071E4B] p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Court Hours</span>
                <span className="text-xl font-black font-mono text-[#0B2A67] dark:text-white">{selectedPlayer.totalHours} hrs</span>
              </div>
              <div className="bg-white dark:bg-[#071E4B] p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Lifetime Spend</span>
                <span className="text-xl font-black font-mono text-[#007d48] dark:text-emerald-400">₱{selectedPlayer.totalSpend.toFixed(2)}</span>
              </div>
              <div className="bg-white dark:bg-[#071E4B] p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Favorite Court</span>
                <span className="text-xs font-black truncate block mt-1 text-[#0B2A67] dark:text-white">{selectedPlayer.favoriteCourt}</span>
              </div>
            </div>

            {/* Notes / Emergency info if available */}
            {(selectedPlayer.emergencyContact || selectedPlayer.notes || selectedPlayer.deletedReason) && (
              <div className="px-4 py-2.5 bg-slate-50 dark:bg-black/30 border-b border-slate-200 dark:border-white/10 text-xs flex flex-wrap items-center gap-4">
                {selectedPlayer.emergencyContact && (
                  <div>
                    <span className="font-bold text-slate-500 uppercase text-[10px]">Emergency Contact: </span>
                    <span className="font-semibold">{selectedPlayer.emergencyContact}</span>
                  </div>
                )}
                {selectedPlayer.notes && (
                  <div>
                    <span className="font-bold text-slate-500 uppercase text-[10px]">Remarks: </span>
                    <span className="italic">{selectedPlayer.notes}</span>
                  </div>
                )}
                {selectedPlayer.deletedReason && (
                  <div>
                    <span className="font-bold text-red-600 uppercase text-[10px]">Archived Reason: </span>
                    <span className="font-semibold text-red-700">{selectedPlayer.deletedReason}</span>
                  </div>
                )}
              </div>
            )}

            {/* Bookings History Table */}
            <div className="p-4 overflow-y-auto max-h-[50vh]">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-black text-xs uppercase tracking-wider text-[#0B2A67] dark:text-white">
                  Match &amp; Booking Audit Trail ({selectedPlayer.bookings.length})
                </h4>
              </div>

              {selectedPlayer.bookings.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-slate-300 text-xs text-slate-500">
                  No match bookings found for this player.
                </div>
              ) : (
                <div className="border border-slate-300 dark:border-white/15 overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-100 dark:bg-black/40">
                      <TableRow className="border-none">
                        <TableHead className="text-xs font-bold text-slate-700 dark:text-white py-2">Match Date</TableHead>
                        <TableHead className="text-xs font-bold text-slate-700 dark:text-white py-2">Court</TableHead>
                        <TableHead className="text-xs font-bold text-slate-700 dark:text-white py-2">Duration</TableHead>
                        <TableHead className="text-xs font-bold text-slate-700 dark:text-white py-2">Status</TableHead>
                        <TableHead className="text-xs font-bold text-slate-700 dark:text-white py-2">Payment</TableHead>
                        <TableHead className="text-right text-xs font-bold text-slate-700 dark:text-white py-2">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPlayer.bookings.map((booking) => (
                        <TableRow key={booking.id} className="border-b border-slate-100 dark:border-white/10 text-xs">
                          <TableCell className="font-mono py-2 font-bold">{formatDateTime(booking.startTime)}</TableCell>
                          <TableCell className="font-semibold py-2">{booking.courtName}</TableCell>
                          <TableCell className="py-2">{booking.durationHours} hr{booking.durationHours > 1 ? 's' : ''}</TableCell>
                          <TableCell className="py-2">
                            <span className={`px-2 py-0.5 text-[9px] font-black uppercase border ${
                              booking.status === 'checked_in'
                                ? 'bg-emerald-100 text-[#007d48] border-emerald-300'
                                : booking.status === 'cancelled'
                                ? 'bg-red-100 text-red-700 border-red-300'
                                : 'bg-blue-100 text-[#0B2A67] border-blue-300'
                            }`}>
                              {booking.status}
                            </span>
                          </TableCell>
                          <TableCell className="py-2 capitalize">{booking.paymentMethod}</TableCell>
                          <TableCell className="text-right font-mono font-bold py-2">₱{booking.totalPrice.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-slate-200 dark:border-white/10 flex justify-end bg-slate-50 dark:bg-black/20">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedPlayer(null)}
                className="h-8 px-4 text-xs font-bold rounded-none border-slate-300 cursor-pointer"
              >
                Close Window
              </Button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
