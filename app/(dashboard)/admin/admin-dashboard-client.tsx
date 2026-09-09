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
    <div className="p-6 sm:p-10 max-w-[1440px] mx-auto space-y-8 text-foreground font-sans bg-background">
      
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row items-start md:items-baseline justify-between gap-4 border-b border-[#cacacb] dark:border-[#222226] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-widest text-[#707072] dark:text-[#8a8a93]">
              Administration
            </span>
            <span className="text-xs text-[#cacacb] dark:text-[#27272a]">•</span>
            <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#f5f5f5] dark:bg-[#18181c] text-foreground border border-[#cacacb] dark:border-[#27272a]">
              Executive Center
            </span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-display uppercase tracking-tight text-foreground">
            FINANCIAL &amp; OPERATIONS AUDIT
          </h1>
          <p className="text-xs text-[#707072] dark:text-[#8a8a93] mt-1">
            Real-time revenue metrics, occupancy utilization, PayMongo online gateway telemetry, and master booking registry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleExportCSV}
            variant="outline"
            size="sm"
            className="border-[#cacacb] dark:border-[#27272a] text-foreground hover:bg-[#f5f5f5] dark:hover:bg-[#18181c] h-10 px-4 text-xs font-medium cursor-pointer"
          >
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>

          {/* Add Staff Account Modal */}
          <Dialog>
            <DialogTrigger
              render={
                <Button size="sm" className="bg-[#111111] dark:bg-white text-white dark:text-[#111111] hover:bg-[#222222] dark:hover:bg-zinc-200 h-10 px-5 text-xs font-medium cursor-pointer">
                  <UserPlus className="h-4 w-4 mr-2" /> Add Staff Account
                </Button>
              }
            />
            <DialogContent className="sm:max-w-md bg-white dark:bg-[#121215] border border-[#cacacb] dark:border-[#27272a] text-foreground rounded-none p-6 sm:p-8 shadow-2xl">
              <form action={createCashierAccount}>
                <DialogHeader className="space-y-1 pb-2">
                  <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">
                    Provision Staff Account
                  </DialogTitle>
                  <DialogDescription className="text-xs text-[#707072] dark:text-[#8a8a93]">
                    Create a new user account with Cashier or Manager permissions at C&amp;J Arena.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName" className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Staff Full Name
                    </Label>
                    <Input
                      id="fullName"
                      name="fullName"
                      placeholder="Jane Doe"
                      required
                      className="h-10 px-4 rounded-full bg-[#f5f5f5] dark:bg-[#18181c] text-xs text-foreground border border-transparent focus:border-[#111111] dark:focus:border-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="staff@cjcourt.com"
                      required
                      className="h-10 px-4 rounded-full bg-[#f5f5f5] dark:bg-[#18181c] text-xs text-foreground border border-transparent focus:border-[#111111] dark:focus:border-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="role" className="text-xs font-bold uppercase tracking-wider text-foreground">
                      System Role
                    </Label>
                    <select
                      id="role"
                      name="role"
                      className="w-full h-10 px-4 rounded-full bg-[#f5f5f5] dark:bg-[#18181c] border border-transparent text-foreground text-xs font-medium outline-none focus:border-[#111111] dark:focus:border-white cursor-pointer"
                    >
                      <option value="cashier">Cashier Staff</option>
                      <option value="owner">Owner / Co-Admin</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Temporary Password
                    </Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      required
                      className="h-10 px-4 rounded-full bg-[#f5f5f5] dark:bg-[#18181c] text-xs text-foreground border border-transparent focus:border-[#111111] dark:focus:border-white"
                    />
                  </div>
                </div>

                <DialogFooter className="pt-2">
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full bg-[#111111] dark:bg-white text-white dark:text-[#111111] hover:bg-[#222222] dark:hover:bg-zinc-200 font-medium text-sm h-11 cursor-pointer"
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
        <div className="border border-[#111111] dark:border-zinc-700 bg-[#f5f5f5] dark:bg-[#18181c] p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[#111111] dark:bg-white text-white dark:text-[#111111] flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground uppercase tracking-wide">
                Pending Refund Requests ({pendingRefunds.length})
              </h4>
              <p className="text-xs text-[#707072] dark:text-[#8a8a93] mt-0.5">
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
            className="bg-[#111111] dark:bg-white text-white dark:text-[#111111] hover:bg-[#222222] dark:hover:bg-zinc-200 text-xs px-5 h-9 shrink-0 cursor-pointer"
          >
            Review Pending Requests
          </Button>
        </div>
      )}

      {/* Metrics Grid (4-Up Flat Row with 1px Hairlines) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Monthly Gross */}
        <div className="border border-[#cacacb] dark:border-[#222226] p-6 bg-white dark:bg-[#121215] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#707072] dark:text-[#8a8a93]">
              Monthly Gross Revenue
            </span>
            <DollarSign className="h-4 w-4 text-foreground" />
          </div>
          <div className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            ₱{metrics.thisMonthRevenue.toFixed(2)}
          </div>
          <p className="text-xs text-[#007d48] dark:text-[#10b981] flex items-center gap-1 font-semibold">
            <TrendingUp className="w-3.5 h-3.5" />
            {metrics.monthOverMonthGrowth >= 0 ? '+' : ''}
            {metrics.monthOverMonthGrowth.toFixed(1)}% vs. Last Month
          </p>
        </div>

        {/* YTD Revenue */}
        <div className="border border-[#cacacb] dark:border-[#222226] p-6 bg-white dark:bg-[#121215] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#707072] dark:text-[#8a8a93]">
              Year-To-Date Gross
            </span>
            <Calendar className="h-4 w-4 text-foreground" />
          </div>
          <div className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            ₱{metrics.ytdRevenue.toFixed(2)}
          </div>
          <p className="text-xs text-[#707072] dark:text-[#8a8a93]">Total bookings &amp; pro shop sales</p>
        </div>

        {/* Total Hours Booked */}
        <div className="border border-[#cacacb] dark:border-[#222226] p-6 bg-white dark:bg-[#121215] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#707072] dark:text-[#8a8a93]">
              Total Hours Booked
            </span>
            <Clock className="h-4 w-4 text-foreground" />
          </div>
          <div className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            {metrics.totalHoursBooked} hrs
          </div>
          <p className="text-xs text-[#707072] dark:text-[#8a8a93]">
            {metrics.monthlyHoursBooked} hrs booked this month
          </p>
        </div>

        {/* Court Occupancy Rate */}
        <div className="border border-[#cacacb] dark:border-[#222226] p-6 bg-white dark:bg-[#121215] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#707072] dark:text-[#8a8a93]">
              Court Utilization Rate
            </span>
            <Percent className="h-4 w-4 text-foreground" />
          </div>
          <div className="text-3xl sm:text-4xl font-bold tracking-tight text-[#007d48] dark:text-[#10b981]">
            {metrics.courtOccupancyRate.toFixed(1)}%
          </div>
          <p className="text-xs text-[#707072] dark:text-[#8a8a93]">16 hrs/day × 2 indoor courts</p>
        </div>

      </div>

      {/* Philippine BIR EOPT Tax & Statutory Discount Compliance Strip */}
      <div className="border border-[#cacacb] dark:border-[#222226] p-6 bg-[#fafafa] dark:bg-[#18181c] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#cacacb] dark:border-[#222226] pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#007d48] dark:text-[#10b981]" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">
              Philippine Tax Compliance (BIR EOPT Act RA 11976 / RA 9994 / RA 10754)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-[#707072] dark:text-[#8a8a93]">
            TIN: 432-891-002-00000 • MIN: MIN-260908-CJ01
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-white dark:bg-[#121215] border border-[#e5e5e5] dark:border-[#27272a] space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#707072] dark:text-[#8a8a93]">
              VATable Net Sales
            </span>
            <div className="text-xl font-bold text-foreground">
              ₱{(metrics.posVatableSales || 0).toFixed(2)}
            </div>
            <p className="text-[10px] text-[#707072] dark:text-[#8a8a93]">Subject to 12% standard output VAT</p>
          </div>

          <div className="p-4 bg-white dark:bg-[#121215] border border-[#e5e5e5] dark:border-[#27272a] space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#707072] dark:text-[#8a8a93]">
              12% Output VAT
            </span>
            <div className="text-xl font-bold text-foreground">
              ₱{(metrics.posVatAmount || 0).toFixed(2)}
            </div>
            <p className="text-[10px] text-[#707072] dark:text-[#8a8a93]">Tax liabilities for BIR filing</p>
          </div>

          <div className="p-4 bg-white dark:bg-[#121215] border border-[#e5e5e5] dark:border-[#27272a] space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#707072] dark:text-[#8a8a93]">
              VAT-Exempt Sales
            </span>
            <div className="text-xl font-bold text-foreground">
              ₱{(metrics.posVatExemptSales || 0).toFixed(2)}
            </div>
            <p className="text-[10px] text-[#707072] dark:text-[#8a8a93]">Senior Citizen &amp; PWD base</p>
          </div>

          <div className="p-4 bg-white dark:bg-[#121215] border border-[#e5e5e5] dark:border-[#27272a] space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#007d48] dark:text-[#10b981]">
              SC / PWD Discounts
            </span>
            <div className="text-xl font-bold text-[#007d48] dark:text-[#10b981]">
              ₱{(metrics.posDiscounts || 0).toFixed(2)}
            </div>
            <p className="text-[10px] text-[#707072] dark:text-[#8a8a93]">20% statutory deductions granted</p>
          </div>
        </div>
      </div>

      {/* Revenue Stream Breakdown Card */}
      <div className="border border-[#cacacb] dark:border-[#222226] p-6 sm:p-8 bg-white dark:bg-[#121215] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#e5e5e5] dark:border-[#222226] pb-4">
          <div>
            <h3 className="text-lg font-bold tracking-tight text-foreground">
              Revenue Stream Breakdown
            </h3>
            <p className="text-xs text-[#707072] dark:text-[#8a8a93]">
              PayMongo Online Channels vs. Walk-In Cash POS Register
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-[#707072] dark:text-[#8a8a93]">Total Volume: </span>
            <span className="font-bold text-foreground">₱{(metrics.paymongoRevenue + metrics.cashRevenue).toFixed(2)}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-3 pt-2">
          <div className="h-3 w-full rounded-full bg-[#f5f5f5] dark:bg-[#18181c] overflow-hidden flex border border-[#cacacb] dark:border-[#27272a]">
            <div
              style={{ width: `${paymongoPercent}%` }}
              className="bg-[#111111] dark:bg-white h-full transition-all duration-500"
              title={`PayMongo: ${paymongoPercent}%`}
            />
            <div
              style={{ width: `${cashPercent}%` }}
              className="bg-[#007d48] dark:bg-[#10b981] h-full transition-all duration-500"
              title={`Cash: ${cashPercent}%`}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#111111] dark:bg-white" />
              <span className="text-[#707072] dark:text-[#8a8a93]">PayMongo Online:</span>
              <span className="font-bold text-foreground">
                ₱{metrics.paymongoRevenue.toFixed(2)} ({paymongoPercent}%)
              </span>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <div className="w-3 h-3 rounded-full bg-[#007d48] dark:bg-[#10b981]" />
              <span className="text-[#707072] dark:text-[#8a8a93]">Cash / Counter POS:</span>
              <span className="font-bold text-foreground">
                ₱{metrics.cashRevenue.toFixed(2)} ({cashPercent}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Master Booking Audit Log Table */}
      <div id="audit-table" className="border border-[#cacacb] dark:border-[#222226] bg-white dark:bg-[#121215] overflow-hidden">
        <div className="p-6 border-b border-[#cacacb] dark:border-[#222226] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold tracking-tight text-foreground">
              Master Court Booking Audit Log
            </h3>
            <p className="text-xs text-[#707072] dark:text-[#8a8a93]">
              Verified public reservations, walk-in register locks, and transaction statuses.
            </p>
          </div>

          {/* Live Filter & Search Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#707072] dark:text-[#8a8a93]" />
              <Input
                placeholder="Search player, email, ref..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9 rounded-full bg-[#f5f5f5] dark:bg-[#18181c] text-xs text-foreground placeholder:text-[#707072] dark:placeholder:text-[#8a8a93] border border-transparent focus:border-[#111111] dark:focus:border-white"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-4 rounded-full bg-[#f5f5f5] dark:bg-[#18181c] border border-transparent text-xs font-medium text-foreground outline-none cursor-pointer"
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
              className="h-9 px-4 rounded-full bg-[#f5f5f5] dark:bg-[#18181c] border border-transparent text-xs font-medium text-foreground outline-none cursor-pointer"
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
            <TableHeader className="bg-[#f5f5f5] dark:bg-[#18181c] border-b border-[#cacacb] dark:border-[#222226]">
              <TableRow className="border-[#cacacb] dark:border-[#222226]">
                <TableHead className="text-xs font-bold uppercase tracking-wider text-foreground">Ref ID</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-foreground">Player</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-foreground">Court</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-foreground">Time Interval</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-foreground">Channel</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-foreground">Status</TableHead>
                <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-foreground">Total</TableHead>
                <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-foreground">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-[#707072] dark:text-[#8a8a93] text-xs font-medium">
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
                    <TableRow key={b.id} className="border-b border-[#e5e5e5] dark:border-[#222226] hover:bg-[#f5f5f5] dark:hover:bg-[#18181c] transition-colors">
                      <TableCell className="font-mono text-xs font-bold text-foreground">
                        #{b.id.slice(0, 8).toUpperCase()}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-foreground text-xs">{b.guest_name || 'Player'}</div>
                        <div className="text-[11px] text-[#707072] dark:text-[#8a8a93]">{b.guest_email || 'Walk-in client'}</div>
                      </TableCell>
                      <TableCell className="font-medium text-foreground text-xs">{b.court_name}</TableCell>
                      <TableCell className="text-[#707072] dark:text-[#8a8a93] text-xs">
                        {formatDateTime(b.start_time)} ({b.duration_hours} hr{b.duration_hours > 1 ? 's' : ''})
                      </TableCell>
                      <TableCell>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#f5f5f5] dark:bg-[#18181c] text-foreground border border-[#cacacb] dark:border-[#27272a]">
                          {b.payment_method}
                        </span>
                      </TableCell>
                      <TableCell>
                        {isCheckedIn ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#f5f5f5] dark:bg-[#18181c] text-[#007d48] dark:text-[#10b981] border border-[#cacacb] dark:border-[#27272a]">
                            Checked In
                          </span>
                        ) : isPaid ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#f5f5f5] dark:bg-[#18181c] text-[#007d48] dark:text-[#10b981] border border-[#cacacb] dark:border-[#27272a]">
                            Paid
                          </span>
                        ) : isRefundPending ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-white dark:bg-[#121215] text-[#d30005] dark:text-red-400 border border-[#d30005] dark:border-red-500/50">
                            Refund Queued
                          </span>
                        ) : isCancelled ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#f5f5f5] dark:bg-[#18181c] text-[#707072] dark:text-[#8a8a93] border border-[#cacacb] dark:border-[#27272a]">
                            Cancelled
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#f5f5f5] dark:bg-[#18181c] text-foreground border border-[#cacacb] dark:border-[#27272a]">
                            {b.status}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold text-sm text-foreground">
                        ₱{Number(b.total_price).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {isRefundPending ? (
                          <Button
                            size="xs"
                            onClick={() => setVoidModalBooking(b)}
                            className="bg-[#111111] dark:bg-white text-white dark:text-[#111111] hover:bg-[#222222] dark:hover:bg-zinc-200 text-[11px] px-3 rounded-full cursor-pointer"
                          >
                            <Wallet className="w-3.5 h-3.5 mr-1" />
                            Review
                          </Button>
                        ) : isCancelled ? (
                          <div className="text-right">
                            {b.refund_reference ? (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-[#007d48] dark:text-[#10b981] bg-[#f5f5f5] dark:bg-[#18181c] px-2 py-0.5 rounded-full border border-[#cacacb] dark:border-[#27272a]"
                                title={`Refund Ref: ${b.refund_reference}`}
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                Refunded
                              </span>
                            ) : (
                              <span className="text-[11px] text-[#707072] dark:text-[#8a8a93]">Voided</span>
                            )}
                          </div>
                        ) : (
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => setVoidModalBooking(b)}
                            className="border-[#cacacb] dark:border-[#27272a] text-[#d30005] dark:text-red-400 hover:bg-[#f5f5f5] dark:hover:bg-[#18181c] text-[11px] px-3 rounded-full cursor-pointer"
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
