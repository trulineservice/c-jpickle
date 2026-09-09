'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Percent,
  Download,
  Search,
  UserPlus,
  Ban,
  CheckCircle2,
  Clock,
  ShieldCheck,
  CreditCard,
  Banknote,
  Wallet,
} from 'lucide-react';
import { createCashierAccount } from '@/app/actions';
import { AdminVoidRefundModal } from '@/components/admin-void-refund-modal';

export interface AdminBookingRecord {
  id: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  total_price: number;
  status: string;
  payment_method: string;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  court_name: string;
  created_at: string;
  refund_wallet_type?: string | null;
  refund_account_name?: string | null;
  refund_account_number?: string | null;
  refund_reason?: string | null;
  refund_status?: string | null;
  refund_reference?: string | null;
  refund_processed_at?: string | null;
}

export interface AdminMetrics {
  thisMonthRevenue: number;
  lastMonthRevenue: number;
  monthOverMonthGrowth: number;
  ytdRevenue: number;
  totalHoursBooked: number;
  monthlyHoursBooked: number;
  courtOccupancyRate: number;
  paymongoRevenue: number;
  cashRevenue: number;
  totalTransactionsCount: number;
  posVatableSales?: number;
  posVatAmount?: number;
  posVatExemptSales?: number;
  posDiscounts?: number;
}

export default function AdminDashboardClient({
  metrics,
  bookings,
}: {
  metrics: AdminMetrics;
  bookings: AdminBookingRecord[];
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [voidModalBooking, setVoidModalBooking] = useState<AdminBookingRecord | null>(null);

  const filteredBookings = bookings.filter((b) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      b.id.toLowerCase().includes(query) ||
      (b.guest_name && b.guest_name.toLowerCase().includes(query)) ||
      (b.guest_email && b.guest_email.toLowerCase().includes(query)) ||
      b.court_name.toLowerCase().includes(query) ||
      (b.refund_reference && b.refund_reference.toLowerCase().includes(query)) ||
      (b.refund_account_name && b.refund_account_name.toLowerCase().includes(query)) ||
      (b.refund_account_number && b.refund_account_number.toLowerCase().includes(query));

    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    const matchesMethod = methodFilter === 'all' || b.payment_method === methodFilter;

    return matchesSearch && matchesStatus && matchesMethod;
  });

  const pendingRefunds = bookings.filter(
    (b) => b.status === 'cancelled_refund_pending' || (b.refund_status === 'pending' && b.status !== 'voided')
  );

  const handleExportCSV = () => {
    const headers = [
      'Booking ID',
      'Court',
      'Start Time',
      'End Time',
      'Hours',
      'Total Price (PHP)',
      'Status',
      'Payment Channel',
      'Client Name',
      'Client Email',
      'Refund Wallet',
      'Refund Account',
      'Refund Reference',
      'Created At',
    ];

    const rows = filteredBookings.map((b) => [
      `"${b.id}"`,
      `"${b.court_name}"`,
      `"${b.start_time}"`,
      `"${b.end_time}"`,
      b.duration_hours,
      b.total_price,
      `"${b.status}"`,
      `"${b.payment_method}"`,
      `"${b.guest_name || 'Walk-in'}"`,
      `"${b.guest_email || 'N/A'}"`,
      `"${b.refund_wallet_type || ''}"`,
      `"${b.refund_account_number || ''}"`,
      `"${b.refund_reference || ''}"`,
      `"${b.created_at}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CJ_Court_Audit_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDateTime = (dateStr: string) =>
    new Intl.DateTimeFormat('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateStr));

  const totalRev = metrics.paymongoRevenue + metrics.cashRevenue || 1;
  const paymongoPercent = Math.round((metrics.paymongoRevenue / totalRev) * 100);
  const cashPercent = 100 - paymongoPercent;

  return (
    <div className="p-6 sm:p-10 max-w-[1440px] mx-auto space-y-8 text-[#111111] font-sans bg-white">
      
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row items-start md:items-baseline justify-between gap-4 border-b border-[#cacacb] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-widest text-[#707072]">
              Administration
            </span>
            <span className="text-xs text-[#cacacb]">•</span>
            <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#f5f5f5] text-[#111111] border border-[#cacacb]">
              Executive Center
            </span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-display uppercase tracking-tight text-[#111111]">
            FINANCIAL &amp; OPERATIONS AUDIT
          </h1>
          <p className="text-xs text-[#707072] mt-1">
            Real-time revenue metrics, occupancy utilization, PayMongo online gateway telemetry, and master booking registry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleExportCSV}
            variant="outline"
            size="sm"
            className="border-[#cacacb] text-[#111111] hover:bg-[#f5f5f5] h-10 px-4 text-xs font-medium"
          >
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>

          {/* Add Staff Account Modal */}
          <Dialog>
            <DialogTrigger
              render={
                <Button size="sm" className="bg-[#111111] text-white hover:bg-[#222222] h-10 px-5 text-xs font-medium">
                  <UserPlus className="h-4 w-4 mr-2" /> Add Staff Account
                </Button>
              }
            />
            <DialogContent className="sm:max-w-md bg-white border border-[#cacacb] text-[#111111] rounded-none p-6 sm:p-8">
              <form action={createCashierAccount}>
                <DialogHeader className="space-y-1 pb-2">
                  <DialogTitle className="text-2xl font-bold tracking-tight text-[#111111]">
                    Provision Staff Account
                  </DialogTitle>
                  <DialogDescription className="text-xs text-[#707072]">
                    Create a new user account with Cashier or Manager permissions at C&amp;J Arena.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName" className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                      Staff Full Name
                    </Label>
                    <Input
                      id="fullName"
                      name="fullName"
                      placeholder="Jane Doe"
                      required
                      className="h-10 px-4 rounded-full bg-[#f5f5f5] text-xs text-[#111111]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="staff@cjcourt.com"
                      required
                      className="h-10 px-4 rounded-full bg-[#f5f5f5] text-xs text-[#111111]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="role" className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                      System Role
                    </Label>
                    <select
                      id="role"
                      name="role"
                      className="w-full h-10 px-4 rounded-full bg-[#f5f5f5] border border-transparent text-[#111111] text-xs font-medium outline-none focus:border-[#111111]"
                    >
                      <option value="cashier">Cashier Staff</option>
                      <option value="owner">Owner / Co-Admin</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                      Temporary Password
                    </Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      required
                      className="h-10 px-4 rounded-full bg-[#f5f5f5] text-xs text-[#111111]"
                    />
                  </div>
                </div>

                <DialogFooter className="pt-2">
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full bg-[#111111] text-white hover:bg-[#222222] font-medium text-sm h-11"
                  >
                    Create Account
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Pending Refund Banner */}
      {pendingRefunds.length > 0 && (
        <div className="border border-[#111111] bg-[#f5f5f5] p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[#111111] text-white flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#111111] uppercase tracking-wide">
                Pending Refund Requests ({pendingRefunds.length})
              </h4>
              <p className="text-xs text-[#707072] mt-0.5">
                Players have submitted cancellation requests. Review details to release court slots and disburse e-wallet payouts.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setStatusFilter('cancelled_refund_pending');
              const el = document.getElementById('audit-table');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="bg-[#111111] text-white hover:bg-[#222222] text-xs px-5 h-9 shrink-0"
          >
            Review Pending Requests
          </Button>
        </div>
      )}

      {/* Metrics Grid (4-Up Flat Row with 1px Hairlines) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Monthly Gross */}
        <div className="border border-[#cacacb] p-6 bg-white space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#707072]">
              Monthly Gross Revenue
            </span>
            <DollarSign className="h-4 w-4 text-[#111111]" />
          </div>
          <div className="text-3xl sm:text-4xl font-bold tracking-tight text-[#111111]">
            ₱{metrics.thisMonthRevenue.toFixed(2)}
          </div>
          <p className="text-xs text-[#007d48] flex items-center gap-1 font-semibold">
            <TrendingUp className="w-3.5 h-3.5" />
            {metrics.monthOverMonthGrowth >= 0 ? '+' : ''}
            {metrics.monthOverMonthGrowth.toFixed(1)}% vs. Last Month
          </p>
        </div>

        {/* YTD Revenue */}
        <div className="border border-[#cacacb] p-6 bg-white space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#707072]">
              Year-To-Date Gross
            </span>
            <Calendar className="h-4 w-4 text-[#111111]" />
          </div>
          <div className="text-3xl sm:text-4xl font-bold tracking-tight text-[#111111]">
            ₱{metrics.ytdRevenue.toFixed(2)}
          </div>
          <p className="text-xs text-[#707072]">Total bookings &amp; pro shop sales</p>
        </div>

        {/* Total Hours Booked */}
        <div className="border border-[#cacacb] p-6 bg-white space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#707072]">
              Total Hours Booked
            </span>
            <Clock className="h-4 w-4 text-[#111111]" />
          </div>
          <div className="text-3xl sm:text-4xl font-bold tracking-tight text-[#111111]">
            {metrics.totalHoursBooked} hrs
          </div>
          <p className="text-xs text-[#707072]">
            {metrics.monthlyHoursBooked} hrs booked this month
          </p>
        </div>

        {/* Court Occupancy Rate */}
        <div className="border border-[#cacacb] p-6 bg-white space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#707072]">
              Court Utilization Rate
            </span>
            <Percent className="h-4 w-4 text-[#111111]" />
          </div>
          <div className="text-3xl sm:text-4xl font-bold tracking-tight text-[#007d48]">
            {metrics.courtOccupancyRate.toFixed(1)}%
          </div>
          <p className="text-xs text-[#707072]">16 hrs/day × 2 indoor courts</p>
        </div>

      </div>

      {/* Philippine BIR EOPT Tax & Statutory Discount Compliance Strip */}
      <div className="border border-[#cacacb] p-6 bg-[#fafafa] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#cacacb] pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#007d48]" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#111111]">
              Philippine Tax Compliance (BIR EOPT Act RA 11976 / RA 9994 / RA 10754)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-[#707072]">
            TIN: 432-891-002-00000 • MIN: MIN-260908-CJ01
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-white border border-[#e5e5e5] space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#707072]">
              VATable Net Sales
            </span>
            <div className="text-xl font-bold text-[#111111]">
              ₱{(metrics.posVatableSales || 0).toFixed(2)}
            </div>
            <p className="text-[10px] text-[#707072]">Subject to 12% standard output VAT</p>
          </div>

          <div className="p-4 bg-white border border-[#e5e5e5] space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#707072]">
              12% Output VAT
            </span>
            <div className="text-xl font-bold text-[#111111]">
              ₱{(metrics.posVatAmount || 0).toFixed(2)}
            </div>
            <p className="text-[10px] text-[#707072]">Tax liabilities for BIR filing</p>
          </div>

          <div className="p-4 bg-white border border-[#e5e5e5] space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#707072]">
              VAT-Exempt Sales
            </span>
            <div className="text-xl font-bold text-[#111111]">
              ₱{(metrics.posVatExemptSales || 0).toFixed(2)}
            </div>
            <p className="text-[10px] text-[#707072]">Senior Citizen &amp; PWD base</p>
          </div>

          <div className="p-4 bg-white border border-[#e5e5e5] space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#007d48]">
              SC / PWD Discounts
            </span>
            <div className="text-xl font-bold text-[#007d48]">
              ₱{(metrics.posDiscounts || 0).toFixed(2)}
            </div>
            <p className="text-[10px] text-[#707072]">20% statutory deductions granted</p>
          </div>
        </div>
      </div>

      {/* Revenue Stream Breakdown Card */}
      <div className="border border-[#cacacb] p-6 sm:p-8 bg-white space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#e5e5e5] pb-4">
          <div>
            <h3 className="text-lg font-bold tracking-tight text-[#111111]">
              Revenue Stream Breakdown
            </h3>
            <p className="text-xs text-[#707072]">
              PayMongo Online Channels vs. Walk-In Cash POS Register
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-[#707072]">Total Volume: </span>
            <span className="font-bold text-[#111111]">₱{(metrics.paymongoRevenue + metrics.cashRevenue).toFixed(2)}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-3 pt-2">
          <div className="h-3 w-full rounded-full bg-[#f5f5f5] overflow-hidden flex border border-[#cacacb]">
            <div
              style={{ width: `${paymongoPercent}%` }}
              className="bg-[#111111] h-full transition-all duration-500"
              title={`PayMongo: ${paymongoPercent}%`}
            />
            <div
              style={{ width: `${cashPercent}%` }}
              className="bg-[#007d48] h-full transition-all duration-500"
              title={`Cash: ${cashPercent}%`}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#111111]" />
              <span className="text-[#707072]">PayMongo Online:</span>
              <span className="font-bold text-[#111111]">
                ₱{metrics.paymongoRevenue.toFixed(2)} ({paymongoPercent}%)
              </span>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <div className="w-3 h-3 rounded-full bg-[#007d48]" />
              <span className="text-[#707072]">Cash / Counter POS:</span>
              <span className="font-bold text-[#111111]">
                ₱{metrics.cashRevenue.toFixed(2)} ({cashPercent}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Master Booking Audit Log Table */}
      <div id="audit-table" className="border border-[#cacacb] bg-white overflow-hidden">
        <div className="p-6 border-b border-[#cacacb] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold tracking-tight text-[#111111]">
              Master Court Booking Audit Log
            </h3>
            <p className="text-xs text-[#707072]">
              Verified public reservations, walk-in register locks, and transaction statuses.
            </p>
          </div>

          {/* Live Filter & Search Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#707072]" />
              <Input
                placeholder="Search player, email, ref..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9 rounded-full bg-[#f5f5f5] text-xs text-[#111111] placeholder:text-[#707072]"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-4 rounded-full bg-[#f5f5f5] border border-transparent text-xs font-medium text-[#111111] outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="checked_in">Checked In</option>
              <option value="walk_in">Walk-in</option>
              <option value="cancelled_refund_pending">Refund Queued</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Payment Method Filter */}
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="h-9 px-4 rounded-full bg-[#f5f5f5] border border-transparent text-xs font-medium text-[#111111] outline-none cursor-pointer"
            >
              <option value="all">All Channels</option>
              <option value="paymongo">PayMongo</option>
              <option value="cash">Cash POS</option>
              <option value="counter_qr">Counter QR</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-[#f5f5f5] border-b border-[#cacacb]">
              <TableRow className="border-[#cacacb]">
                <TableHead className="text-xs font-bold uppercase tracking-wider text-[#111111]">Ref ID</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-[#111111]">Player</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-[#111111]">Court</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-[#111111]">Time Interval</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-[#111111]">Channel</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-[#111111]">Status</TableHead>
                <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-[#111111]">Total</TableHead>
                <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-[#111111]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-[#707072] text-xs font-medium">
                    No bookings matched your filter criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredBookings.map((b) => {
                  const isCheckedIn = b.status === 'checked_in';
                  const isPaid = b.status === 'paid';
                  const isRefundPending = b.status === 'cancelled_refund_pending' || b.refund_status === 'pending';
                  const isCancelled = b.status === 'cancelled';

                  return (
                    <TableRow key={b.id} className="border-b border-[#e5e5e5] hover:bg-[#f5f5f5] transition-colors">
                      <TableCell className="font-mono text-xs font-bold text-[#111111]">
                        #{b.id.slice(0, 8).toUpperCase()}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-[#111111] text-xs">{b.guest_name || 'Player'}</div>
                        <div className="text-[11px] text-[#707072]">{b.guest_email || 'Walk-in client'}</div>
                      </TableCell>
                      <TableCell className="font-medium text-[#111111] text-xs">{b.court_name}</TableCell>
                      <TableCell className="text-[#707072] text-xs">
                        {formatDateTime(b.start_time)} ({b.duration_hours} hr{b.duration_hours > 1 ? 's' : ''})
                      </TableCell>
                      <TableCell>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#f5f5f5] text-[#111111] border border-[#cacacb]">
                          {b.payment_method}
                        </span>
                      </TableCell>
                      <TableCell>
                        {isCheckedIn ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#f5f5f5] text-[#007d48] border border-[#cacacb]">
                            Checked In
                          </span>
                        ) : isPaid ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#f5f5f5] text-[#007d48] border border-[#cacacb]">
                            Paid
                          </span>
                        ) : isRefundPending ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-white text-[#d30005] border border-[#d30005]">
                            Refund Queued
                          </span>
                        ) : isCancelled ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#f5f5f5] text-[#707072] border border-[#cacacb]">
                            Cancelled
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#f5f5f5] text-[#111111] border border-[#cacacb]">
                            {b.status}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold text-sm text-[#111111]">
                        ₱{Number(b.total_price).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {isRefundPending ? (
                          <Button
                            size="xs"
                            onClick={() => setVoidModalBooking(b)}
                            className="bg-[#111111] text-white hover:bg-[#222222] text-[11px] px-3 rounded-full"
                          >
                            <Wallet className="w-3.5 h-3.5 mr-1" />
                            Review
                          </Button>
                        ) : isCancelled ? (
                          <div className="text-right">
                            {b.refund_reference ? (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-[#007d48] bg-[#f5f5f5] px-2 py-0.5 rounded-full border border-[#cacacb]"
                                title={`Refund Ref: ${b.refund_reference}`}
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                Refunded
                              </span>
                            ) : (
                              <span className="text-[11px] text-[#707072]">Voided</span>
                            )}
                          </div>
                        ) : (
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => setVoidModalBooking(b)}
                            className="border-[#cacacb] text-[#d30005] hover:bg-[#f5f5f5] text-[11px] px-3 rounded-full"
                          >
                            <Ban className="w-3 h-3 mr-1" />
                            Void
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Admin Void and Refund Modal */}
      {voidModalBooking && (
        <AdminVoidRefundModal
          isOpen={!!voidModalBooking}
          onClose={() => setVoidModalBooking(null)}
          booking={voidModalBooking}
          onSuccess={() => setVoidModalBooking(null)}
        />
      )}
    </div>
  );
}
