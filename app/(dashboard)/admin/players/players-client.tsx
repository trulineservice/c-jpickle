'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Users,
  Search,
  Calendar,
  Clock,
  DollarSign,
  Trophy,
  ArrowUpDown,
  History,
  X,
  CreditCard,
  Banknote,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

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
  totalPlayed: number;
  totalHours: number;
  totalSpend: number;
  favoriteCourt: string;
  lastPlayed: string | null;
  bookings: PlayerMatchRecord[];
}

export default function PlayersClient({ players }: { players: PlayerSummary[] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'registered' | 'guest'>('all');
  const [sortBy, setSortBy] = useState<'matches_desc' | 'hours_desc' | 'spend_desc' | 'recent' | 'name_asc'>('matches_desc');
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerSummary | null>(null);

  // Overall Facility Player Metrics
  const totalPlayersCount = players.length;
  const totalMatchesPlayed = players.reduce((sum, p) => sum + p.totalPlayed, 0);
  const totalHoursPlayed = players.reduce((sum, p) => sum + p.totalHours, 0);
  const topPlayer = useMemo(() => {
    return players.reduce<PlayerSummary | null>((top, curr) => {
      if (!top || curr.totalPlayed > top.totalPlayed) return curr;
      return top;
    }, null);
  }, [players]);

  // Filter and Sort Players
  const filteredPlayers = useMemo(() => {
    return players
      .filter((p) => {
        const matchesSearch =
          p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.phone.includes(searchQuery);

        const matchesRole =
          roleFilter === 'all' ||
          (roleFilter === 'registered' && p.isRegistered) ||
          (roleFilter === 'guest' && !p.isRegistered);

        return matchesSearch && matchesRole;
      })
      .sort((a, b) => {
        if (sortBy === 'matches_desc') return b.totalPlayed - a.totalPlayed;
        if (sortBy === 'hours_desc') return b.totalHours - a.totalHours;
        if (sortBy === 'spend_desc') return b.totalSpend - a.totalSpend;
        if (sortBy === 'recent') {
          const aTime = a.lastPlayed ? new Date(a.lastPlayed).getTime() : 0;
          const bTime = b.lastPlayed ? new Date(b.lastPlayed).getTime() : 0;
          return bTime - aTime;
        }
        if (sortBy === 'name_asc') return a.fullName.localeCompare(b.fullName);
        return 0;
      });
  }, [players, searchQuery, roleFilter, sortBy]);

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
    <div className="p-6 sm:p-10 max-w-[1440px] mx-auto space-y-8 text-[#111111] font-sans bg-white">
      
      {/* Header */}
      <div className="border-b border-[#cacacb] pb-6 flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-widest text-[#707072]">
              Administration
            </span>
            <span className="text-xs text-[#cacacb]">•</span>
            <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#f5f5f5] text-[#111111] border border-[#cacacb]">
              Player Intelligence &amp; Engagement
            </span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-display uppercase tracking-tight text-[#111111]">
            PLAYER DIRECTORY &amp; HISTORY
          </h1>
          <p className="text-xs text-[#707072] mt-1">
            Comprehensive directory of all facility players, play frequencies, court hours, and chronological match records.
          </p>
        </div>
      </div>

      {/* Top 4 Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Total Players */}
        <div className="border border-[#cacacb] p-6 bg-white space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#707072]">
              Total Tracked Players
            </span>
            <Users className="h-4 w-4 text-[#111111]" />
          </div>
          <div className="text-3xl sm:text-4xl font-bold tracking-tight text-[#111111]">
            {totalPlayersCount}
          </div>
          <p className="text-xs text-[#707072]">
            {players.filter((p) => p.isRegistered).length} registered member accounts
          </p>
        </div>

        {/* Total Matches Played */}
        <div className="border border-[#cacacb] p-6 bg-white space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#707072]">
              Facility Matches Played
            </span>
            <Calendar className="h-4 w-4 text-[#111111]" />
          </div>
          <div className="text-3xl sm:text-4xl font-bold tracking-tight text-[#111111]">
            {totalMatchesPlayed}
          </div>
          <p className="text-xs text-[#007d48] font-semibold">
            Across all indoor arenas
          </p>
        </div>

        {/* Total Court Hours */}
        <div className="border border-[#cacacb] p-6 bg-white space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#707072]">
              Total Court Hours
            </span>
            <Clock className="h-4 w-4 text-[#111111]" />
          </div>
          <div className="text-3xl sm:text-4xl font-bold tracking-tight text-[#111111]">
            {totalHoursPlayed} hrs
          </div>
          <p className="text-xs text-[#707072]">
            Cumulative play time recorded
          </p>
        </div>

        {/* Top Regular Player */}
        <div className="border border-[#cacacb] p-6 bg-white space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#707072]">
              Top Regular Player
            </span>
            <Trophy className="h-4 w-4 text-[#007d48]" />
          </div>
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-[#111111] truncate">
            {topPlayer ? topPlayer.fullName : '—'}
          </div>
          <p className="text-xs text-[#007d48] font-semibold">
            {topPlayer ? `${topPlayer.totalPlayed} matches (${topPlayer.totalHours} hrs)` : 'No matches yet'}
          </p>
        </div>

      </div>

      {/* Filter and Search Controls Strip */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b border-[#cacacb] pb-4">
        
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#707072]" />
          <Input
            placeholder="Search by player name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 rounded-full bg-[#f5f5f5] text-xs text-[#111111] placeholder:text-[#707072] border-transparent focus-visible:bg-white focus-visible:border-[#111111]"
          />
        </div>

        {/* Filters and Sort */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Role Filter Chips */}
          <div className="flex items-center gap-1 border border-[#cacacb] rounded-full p-0.5 bg-[#f5f5f5]">
            {(['all', 'registered', 'guest'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setRoleFilter(mode)}
                className={`px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider transition-colors cursor-pointer ${
                  roleFilter === mode
                    ? 'bg-[#111111] text-white shadow-xs'
                    : 'text-[#707072] hover:text-[#111111]'
                }`}
              >
                {mode === 'all' ? 'All Players' : mode === 'registered' ? 'Registered' : 'Guests'}
              </button>
            ))}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 text-xs text-[#707072]">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-9 px-3 rounded-full bg-[#f5f5f5] border border-[#cacacb] text-xs font-semibold text-[#111111] outline-none cursor-pointer"
            >
              <option value="matches_desc">Most Matches Played</option>
              <option value="hours_desc">Most Court Hours</option>
              <option value="spend_desc">Highest Spend (₱)</option>
              <option value="recent">Recently Played</option>
              <option value="name_asc">Name (A-Z)</option>
            </select>
          </div>
        </div>

      </div>

      {/* Players Directory Table */}
      <Card className="border border-[#cacacb] bg-white rounded-none shadow-none overflow-hidden">
        <CardHeader className="border-b border-[#cacacb] bg-[#f5f5f5] p-6">
          <CardTitle className="text-lg font-bold uppercase tracking-tight text-[#111111]">
            Player Roster ({filteredPlayers.length})
          </CardTitle>
          <CardDescription className="text-xs text-[#707072] mt-0.5">
            Click on any player row to view their full chronological match history and court session details.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-white border-b border-[#cacacb]">
              <TableRow className="border-[#cacacb]">
                <TableHead className="text-xs font-bold uppercase tracking-wider text-[#707072] h-12">Player</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-[#707072] h-12">Contact</TableHead>
                <TableHead className="text-center text-xs font-bold uppercase tracking-wider text-[#707072] h-12">Total Played</TableHead>
                <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-[#707072] h-12">Lifetime Spend</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-[#707072] h-12">Fav Court</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-[#707072] h-12">Last Match</TableHead>
                <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-[#707072] h-12">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPlayers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16 text-[#707072] text-xs font-medium">
                    No players found matching your search criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredPlayers.map((player) => (
                  <TableRow
                    key={player.id}
                    className="border-b border-[#cacacb] hover:bg-[#f5f5f5]/60 transition-colors cursor-pointer"
                    onClick={() => setSelectedPlayer(player)}
                  >
                    {/* Player Name & Badge */}
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#111111] text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {(player.fullName || 'P').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-[#111111]">
                            {player.fullName}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {player.isRegistered ? (
                              <span className="inline-block text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#e8f5e9] text-[#007d48] border border-[#a5d6a7]">
                                {player.role === 'owner' ? 'Owner' : player.role === 'admin' ? 'Admin' : 'Member'}
                              </span>
                            ) : (
                              <span className="inline-block text-[9px] font-medium uppercase px-2 py-0.5 rounded-full bg-[#f5f5f5] text-[#707072] border border-[#cacacb]">
                                Guest
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Contact info */}
                    <TableCell className="text-xs text-[#707072] py-4">
                      <div>{player.email || '—'}</div>
                      <div className="text-[11px] text-[#999999]">{player.phone || '—'}</div>
                    </TableCell>

                    {/* Total Played */}
                    <TableCell className="text-center py-4">
                      <span className="font-bold text-sm text-[#111111]">
                        {player.totalPlayed}
                      </span>
                      <span className="text-[11px] text-[#707072] block">
                        {player.totalHours} court hrs
                      </span>
                    </TableCell>

                    {/* Lifetime Spend */}
                    <TableCell className="text-right font-bold text-sm text-[#111111] py-4">
                      ₱{player.totalSpend.toFixed(2)}
                    </TableCell>

                    {/* Favorite Court */}
                    <TableCell className="text-xs text-[#707072] py-4 truncate max-w-[140px]">
                      {player.favoriteCourt}
                    </TableCell>

                    {/* Last Match */}
                    <TableCell className="text-xs text-[#707072] py-4 font-mono">
                      {player.lastPlayed ? formatDateOnly(player.lastPlayed) : '—'}
                    </TableCell>

                    {/* Action */}
                    <TableCell className="text-right py-4" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedPlayer(player)}
                        className="h-8 px-3 text-xs border-[#cacacb] hover:border-[#111111] gap-1.5 font-semibold cursor-pointer"
                      >
                        <History className="w-3.5 h-3.5" />
                        History ({player.bookings.length})
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Player Match History Modal / Slide-Over Drawer */}
      {selectedPlayer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#cacacb] w-full max-w-4xl max-h-[90vh] flex flex-col text-[#111111] shadow-2xl animate-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-[#cacacb] flex items-start justify-between bg-[#fbfbfb]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#111111] text-white flex items-center justify-center text-lg font-bold shrink-0">
                  {(selectedPlayer.fullName || 'P').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold tracking-tight text-[#111111]">
                      {selectedPlayer.fullName}
                    </h2>
                    <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#111111] text-white">
                      {selectedPlayer.isRegistered ? selectedPlayer.role.toUpperCase() : 'GUEST PLAYER'}
                    </span>
                  </div>
                  <p className="text-xs text-[#707072] mt-0.5">
                    {selectedPlayer.email} • {selectedPlayer.phone || 'No phone recorded'} • Member since {formatDateOnly(selectedPlayer.memberSince)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPlayer(null)}
                className="p-2 rounded-full hover:bg-[#e5e5e5] text-[#707072] hover:text-[#111111] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Player Stats Quick Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-6 border-b border-[#cacacb] bg-white">
              <div className="p-3 bg-[#f5f5f5] border border-[#cacacb]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#707072] block">
                  Times Played
                </span>
                <span className="text-xl font-bold text-[#111111]">
                  {selectedPlayer.totalPlayed} matches
                </span>
              </div>
              <div className="p-3 bg-[#f5f5f5] border border-[#cacacb]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#707072] block">
                  Total Court Hours
                </span>
                <span className="text-xl font-bold text-[#111111]">
                  {selectedPlayer.totalHours} hrs
                </span>
              </div>
              <div className="p-3 bg-[#f5f5f5] border border-[#cacacb]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#707072] block">
                  Lifetime Spend
                </span>
                <span className="text-xl font-bold text-[#111111]">
                  ₱{selectedPlayer.totalSpend.toFixed(2)}
                </span>
              </div>
              <div className="p-3 bg-[#f5f5f5] border border-[#cacacb]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#707072] block">
                  Preferred Arena
                </span>
                <span className="text-sm font-bold text-[#007d48] truncate block">
                  {selectedPlayer.favoriteCourt}
                </span>
              </div>
            </div>

            {/* Match History Table */}
            <div className="flex-1 overflow-y-auto p-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#707072] mb-3">
                Complete Chronological Booking &amp; Match History ({selectedPlayer.bookings.length})
              </h3>

              {selectedPlayer.bookings.length === 0 ? (
                <div className="text-center py-12 text-[#707072] text-xs">
                  No match or booking records on file for this player.
                </div>
              ) : (
                <div className="border border-[#cacacb] overflow-hidden">
                  <Table>
                    <TableHeader className="bg-[#f5f5f5] border-b border-[#cacacb]">
                      <TableRow className="border-[#cacacb]">
                        <TableHead className="text-[11px] font-bold uppercase tracking-wider text-[#707072] h-10">Ref</TableHead>
                        <TableHead className="text-[11px] font-bold uppercase tracking-wider text-[#707072] h-10">Court</TableHead>
                        <TableHead className="text-[11px] font-bold uppercase tracking-wider text-[#707072] h-10">Schedule</TableHead>
                        <TableHead className="text-[11px] font-bold uppercase tracking-wider text-[#707072] h-10">Duration</TableHead>
                        <TableHead className="text-[11px] font-bold uppercase tracking-wider text-[#707072] h-10">Status</TableHead>
                        <TableHead className="text-[11px] font-bold uppercase tracking-wider text-[#707072] h-10">Payment</TableHead>
                        <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-[#707072] h-10">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPlayer.bookings.map((b) => (
                        <TableRow key={b.id} className="border-b border-[#e5e5e5] text-xs">
                          <TableCell className="font-mono text-[11px] py-3 font-bold text-[#111111]">
                            #{b.id.slice(0, 8).toUpperCase()}
                          </TableCell>
                          <TableCell className="py-3 font-semibold text-[#111111]">
                            {b.courtName}
                            {b.notes && (
                              <span className="block text-[10px] font-normal text-[#007d48]">
                                {b.notes}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="py-3 text-[#707072] font-mono text-[11px]">
                            {formatDateTime(b.startTime)}
                          </TableCell>
                          <TableCell className="py-3 text-[#707072]">
                            {b.durationHours} hr{b.durationHours > 1 ? 's' : ''}
                          </TableCell>
                          <TableCell className="py-3">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              b.status === 'paid' || b.status === 'checked_in' || b.status === 'walk_in'
                                ? 'bg-[#e8f5e9] text-[#007d48] border border-[#a5d6a7]'
                                : b.status === 'pending_payment'
                                ? 'bg-[#fff8e1] text-[#f57f17] border border-[#ffe082]'
                                : 'bg-[#ffebee] text-[#c62828] border border-[#ef9a9a]'
                            }`}>
                              {b.status.replace(/_/g, ' ')}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 capitalize text-[#707072]">
                            {b.paymentMethod}
                          </TableCell>
                          <TableCell className="py-3 text-right font-bold text-[#111111]">
                            ₱{b.totalPrice.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#cacacb] bg-[#fbfbfb] flex justify-end">
              <Button
                variant="outline"
                onClick={() => setSelectedPlayer(null)}
                className="text-xs px-5 border-[#cacacb] hover:border-[#111111] cursor-pointer"
              >
                Close History
              </Button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
