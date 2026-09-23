"use client";

import React, { useState, useTransition, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Banknote,
  CreditCard,
  QrCode,
  Receipt,
  TrendingUp,
  ShieldCheck,
  BadgePercent,
  Ban,
  CheckCircle2,
  ArrowLeftRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PosMasterPinModal } from "@/components/pos/pos-master-pin-modal";
import { voidPosTransactionWithPin } from "@/app/actions";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { DateRangeFilter, type DateRange } from "@/components/ui/date-range-filter";
import type { PaginationMeta } from "@/lib/pagination";

export interface CashierReportTx {
  id: string;
  invoice_number: string | null;
  customer_name: string | null;
  discount_type: string | null;
  discount_id_number: string | null;
  gross_amount: number | null;
  discount_amount: number | null;
  vatable_sales: number | null;
  vat_amount: number | null;
  vat_exempt_sales: number | null;
  total_amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  void_reason?: string | null;
  voided_at?: string | null;
}

export interface ReportFinancialSummary {
  totalSales: number;
  totalGross: number;
  totalVatable: number;
  totalVat: number;
  totalVatExempt: number;
  totalDiscounts: number;
  totalTransactions: number;
  voidedCount: number;
  cashSales: number;
}

export function CashierReportsClient({
  initialTransactions,
  meta,
  financialSummary,
  dateRange: initialDateRange,
}: {
  initialTransactions: CashierReportTx[];
  meta: PaginationMeta;
  financialSummary: ReportFinancialSummary;
  dateRange: DateRange;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [transactions, setTransactions] = useState<CashierReportTx[]>(initialTransactions);
  const [selectedTxForVoid, setSelectedTxForVoid] = useState<CashierReportTx | null>(null);
  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(initialDateRange);

  // Build URL with updated params
  const pushParams = useCallback(
    (updates: Record<string, string | number>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([k, v]) => params.set(k, String(v)));
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams]
  );

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
    pushParams({ dateFrom: range.dateFrom, dateTo: range.dateTo, page: 1 });
  };

  const handlePageChange = (page: number) => pushParams({ page });
  const handleLimitChange = (limit: number) => pushParams({ limit, page: 1 });

  const handleVoidClick = (tx: CashierReportTx) => {
    setSelectedTxForVoid(tx);
    setVoidModalOpen(true);
  };

  const handleVoidSuccess = async (pin: string, reason?: string) => {
    if (!selectedTxForVoid) return;

    const res = await voidPosTransactionWithPin({
      transactionId: selectedTxForVoid.id,
      pin,
      reason: reason || "Shift Reconciliation Void",
    });

    if (!res.success) {
      return { success: false, error: res.error || "Failed to void transaction." };
    }

    setTransactions((prev) =>
      prev.map((tx) =>
        tx.id === selectedTxForVoid.id
          ? { ...tx, status: "voided", void_reason: reason || "Shift Reconciliation Void", voided_at: new Date().toISOString() }
          : tx
      )
    );

    setBannerMessage(res.message || "Invoice voided successfully.");
    setTimeout(() => setBannerMessage(null), 5000);
    setSelectedTxForVoid(null);
    return { success: true };
  };

  const formatDateTime = (dateStr: string) =>
    new Intl.DateTimeFormat("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Manila",
    }).format(new Date(dateStr));

  const { totalSales, totalVatable, totalVat, totalVatExempt, totalDiscounts, totalTransactions, voidedCount, cashSales } = financialSummary;
  const digitalSales = totalSales - cashSales;

  return (
    <div className="p-6 sm:p-10 max-w-[1440px] mx-auto space-y-8 text-foreground font-sans bg-background">
      {/* Header */}
      <div className="border-b border-[#cacacb] dark:border-[#222226] pb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold uppercase tracking-widest text-[#707072] dark:text-[#8a8a93]">
            Operations
          </span>
          <span className="text-xs text-[#cacacb] dark:text-[#27272a]">•</span>
          <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 bg-[#f5f5f5] dark:bg-[#18181c] text-[#007d48] dark:text-[#10b981] border border-[#cacacb] dark:border-[#27272a]">
            BIR EOPT (RA 11976) Shift Reconciliation
          </span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-display uppercase tracking-tight text-foreground">
          SHIFT &amp; TAX RECONCILIATION
        </h1>
        <p className="text-xs text-[#707072] dark:text-[#8a8a93] mt-1">
          Cashier shift telemetry, physical cash drawer balancing, and Philippine statutory VAT &amp; SC/PWD audit logs.
        </p>
      </div>

      {/* Date Range Audit Filter */}
      <DateRangeFilter
        value={dateRange}
        onChange={handleDateRangeChange}
        isLoading={isPending}
      />

      {/* Banner */}
      {bannerMessage && (
        <div className="bg-[#e8f5e9] dark:bg-emerald-950/60 border border-[#a5d6a7] dark:border-emerald-800 p-4 text-xs text-[#007d48] dark:text-emerald-300 font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{bannerMessage}</span>
        </div>
      )}

      {/* Financial Summary KPI Cards — always reflect full date window */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Net Revenue */}
        <div className="border border-[#cacacb] dark:border-[#222226] bg-white dark:bg-[#121215] p-6 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-[#707072] dark:text-[#8a8a93]">
              Net Shift Revenue
            </span>
            <div className="w-8 h-8 rounded-full bg-[#f5f5f5] dark:bg-[#18181c] border border-[#cacacb] dark:border-[#27272a] flex items-center justify-center">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <div className="text-4xl font-display uppercase tracking-tight text-foreground">
            ₱{totalSales.toFixed(2)}
          </div>
          <p className="text-xs text-[#707072] dark:text-[#8a8a93] flex items-center gap-1 font-medium">
            <TrendingUp className="w-3.5 h-3.5 text-[#007d48] dark:text-[#10b981]" />
            {totalTransactions} active sales
            {voidedCount > 0 && (
              <span className="text-[#d30005] ml-1">({voidedCount} voided)</span>
            )}
          </p>
        </div>

        {/* Cash Drawer */}
        <div className="border border-[#cacacb] dark:border-[#222226] bg-white dark:bg-[#121215] p-6 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-[#707072] dark:text-[#8a8a93]">
              Cash Drawer (Tender)
            </span>
            <div className="w-8 h-8 rounded-full bg-[#f5f5f5] dark:bg-[#18181c] border border-[#cacacb] dark:border-[#27272a] flex items-center justify-center">
              <Banknote className="h-4 w-4" />
            </div>
          </div>
          <div className="text-4xl font-display uppercase tracking-tight text-foreground">
            ₱{cashSales.toFixed(2)}
          </div>
          <p className="text-xs text-[#707072] dark:text-[#8a8a93]">Physical currency in register drawer</p>
        </div>

        {/* Digital */}
        <div className="border border-[#cacacb] dark:border-[#222226] bg-white dark:bg-[#121215] p-6 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-[#707072] dark:text-[#8a8a93]">
              Digital &amp; QR Ph
            </span>
            <div className="w-8 h-8 rounded-full bg-[#f5f5f5] dark:bg-[#18181c] border border-[#cacacb] dark:border-[#27272a] flex items-center justify-center">
              <QrCode className="h-4 w-4" />
            </div>
          </div>
          <div className="text-4xl font-display uppercase tracking-tight text-foreground">
            ₱{digitalSales.toFixed(2)}
          </div>
          <p className="text-xs text-[#707072] dark:text-[#8a8a93]">GCash, Maya &amp; terminal cards</p>
        </div>
      </div>

      {/* Sales & Discounts Summary */}
      <div className="border border-[#cacacb] dark:border-[#222226] p-6 bg-[#fafafa] dark:bg-[#18181c] space-y-4">
        <div className="flex items-center justify-between border-b border-[#cacacb] dark:border-[#222226] pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#007d48] dark:text-[#10b981]" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">
              Sales &amp; Privilege Discounts Summary
            </h3>
          </div>
          <span className="text-[11px] text-[#707072] dark:text-[#8a8a93]">Non-VAT Registered &bull; C&amp;J Sports Arena</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-white dark:bg-[#121215] border border-[#e5e5e5] dark:border-[#27272a] space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#707072] dark:text-[#8a8a93]">Gross Order Subtotal</span>
            <div className="text-xl font-bold text-foreground">₱{(financialSummary.totalGross || 0).toFixed(2)}</div>
            <p className="text-[10px] text-[#707072] dark:text-[#8a8a93]">Pre-discount item total</p>
          </div>
          <div className="p-4 bg-white dark:bg-[#121215] border border-[#e5e5e5] dark:border-[#27272a] space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#007d48] dark:text-[#10b981] flex items-center gap-1">
              <BadgePercent className="w-3 h-3" /> Total Discounts Granted
            </span>
            <div className="text-xl font-bold text-[#007d48] dark:text-[#10b981]">₱{totalDiscounts.toFixed(2)}</div>
            <p className="text-[10px] text-[#707072] dark:text-[#8a8a93]">Senior, PWD, Student, Staff</p>
          </div>
          <div className="p-4 bg-white dark:bg-[#121215] border border-[#e5e5e5] dark:border-[#27272a] space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#707072] dark:text-[#8a8a93]">Net Sales Paid</span>
            <div className="text-xl font-bold text-foreground">₱{totalSales.toFixed(2)}</div>
            <p className="text-[10px] text-[#707072] dark:text-[#8a8a93]">Total collected amount</p>
          </div>
          <div className="p-4 bg-white dark:bg-[#121215] border border-[#e5e5e5] dark:border-[#27272a] space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#707072] dark:text-[#8a8a93]">Completed Invoices</span>
            <div className="text-xl font-bold text-foreground">{totalTransactions}</div>
            <p className="text-[10px] text-[#707072] dark:text-[#8a8a93]">Active completed orders</p>
          </div>
        </div>
      </div>

      {/* Transaction Table */}
      <Card className="border border-[#cacacb] dark:border-[#222226] bg-white dark:bg-[#121215] rounded-none shadow-none overflow-hidden">
        <CardHeader className="border-b border-[#cacacb] dark:border-[#222226] bg-[#f5f5f5] dark:bg-[#18181c] p-6">
          <CardTitle className="text-lg font-bold uppercase tracking-tight text-foreground">
            Official Sales Invoice Audit Log
          </CardTitle>
          <CardDescription className="text-xs text-[#707072] dark:text-[#8a8a93] mt-0.5">
            Sequential Sales Invoices for the selected audit period. Voiding requires supervisor Master PIN authentication.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-white dark:bg-[#121215] border-b border-[#cacacb] dark:border-[#222226]">
              <TableRow className="border-[#cacacb] dark:border-[#222226]">
                {['Invoice No', 'Timestamp', 'Privilege', 'Channel', 'Gross', 'Discount', 'Net Paid', 'Status', 'Action'].map((h) => (
                  <TableHead
                    key={h}
                    className={`text-xs font-bold uppercase tracking-wider text-[#707072] dark:text-[#8a8a93] h-12 ${h === 'Gross' || h === 'Discount' || h === 'Net Paid' ? 'text-right' : ''} ${h === 'Action' ? 'text-right' : ''}`}
                  >
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending ? (
                <TableSkeleton rows={Math.min(meta.limit, 5)} columns={9} />
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-16 text-[#707072] dark:text-[#8a8a93] text-xs font-medium">
                    No transactions found for the selected date range.
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((tx) => {
                  const isDiscounted = tx.discount_type === "senior_citizen" || tx.discount_type === "pwd";
                  const invoiceRef = tx.invoice_number || `#${tx.id.split("-")[0].toUpperCase()}`;
                  const isVoided = tx.status === "voided";
                  return (
                    <TableRow
                      key={tx.id}
                      className={`border-b border-[#cacacb] dark:border-[#222226] transition-colors ${
                        isVoided ? "bg-red-50/40 dark:bg-red-950/10 text-[#a0a0a2]" : "hover:bg-[#f5f5f5]/60 dark:hover:bg-[#18181c]/60"
                      }`}
                    >
                      <TableCell className="font-mono text-xs font-bold text-foreground py-4">
                        <span className={isVoided ? "line-through text-[#a0a0a2]" : ""}>{invoiceRef}</span>
                        {tx.customer_name && (
                          <span className="block text-[10px] font-sans font-normal text-[#707072] dark:text-[#8a8a93] truncate max-w-[140px]">
                            {tx.customer_name}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-[#707072] dark:text-[#8a8a93] text-xs py-4 font-mono">
                        {formatDateTime(tx.created_at)}
                      </TableCell>
                      <TableCell className="py-4">
                        {tx.discount_type === "senior_citizen" ? (
                          <span className="inline-block px-2.5 py-0.5 text-[10px] font-bold uppercase bg-[#e8f5e9] dark:bg-emerald-950/50 text-[#007d48] dark:text-emerald-400 border border-[#a5d6a7] dark:border-emerald-800">
                            Senior (20%)
                          </span>
                        ) : tx.discount_type === "pwd" ? (
                          <span className="inline-block px-2.5 py-0.5 text-[10px] font-bold uppercase bg-[#e8f5e9] dark:bg-emerald-950/50 text-[#007d48] dark:text-emerald-400 border border-[#a5d6a7] dark:border-emerald-800">
                            PWD (20%)
                          </span>
                        ) : tx.discount_type === "student" ? (
                          <span className="inline-block px-2.5 py-0.5 text-[10px] font-bold uppercase bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                            Student (-₱10)
                          </span>
                        ) : tx.discount_type === "employee" ? (
                          <span className="inline-block px-2.5 py-0.5 text-[10px] font-bold uppercase bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                            Employee (10%)
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 text-[10px] font-medium bg-[#f5f5f5] dark:bg-[#18181c] text-[#707072] dark:text-[#8a8a93] border border-[#cacacb] dark:border-[#27272a]">
                            Regular
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-4">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#f5f5f5] dark:bg-[#18181c] text-foreground border border-[#cacacb] dark:border-[#27272a] text-[11px] font-bold uppercase tracking-wider">
                          {tx.payment_method === "Cash" && <Banknote className="h-3 w-3" />}
                          {tx.payment_method === "Credit / Debit Card" && <CreditCard className="h-3 w-3" />}
                          {tx.payment_method?.startsWith("Split") && <ArrowLeftRight className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />}
                          {!tx.payment_method?.startsWith("Split") && tx.payment_method !== "Cash" && tx.payment_method !== "Credit / Debit Card" && <QrCode className="h-3 w-3" />}
                          {tx.payment_method?.startsWith("Split:")
                            ? "Split (E-Wallet + Cash)"
                            : tx.payment_method}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-xs text-[#707072] dark:text-[#8a8a93] py-4">
                        ₱{Number(tx.gross_amount || tx.total_amount).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium text-[#007d48] dark:text-[#10b981] py-4">
                        {Number(tx.discount_amount) > 0 ? `-₱${Number(tx.discount_amount).toFixed(2)}` : "—"}
                      </TableCell>
                      <TableCell className={`text-right font-bold text-sm py-4 ${isVoided ? "line-through text-[#a0a0a2]" : "text-foreground"}`}>
                        ₱{Number(tx.total_amount).toFixed(2)}
                      </TableCell>
                      <TableCell className="py-4">
                        {isVoided ? (
                          <div>
                            <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase bg-red-100 dark:bg-red-950/60 text-[#d30005] border border-red-200 dark:border-red-900">
                              Voided
                            </span>
                            {tx.void_reason && (
                              <span className="block text-[10px] text-[#707072] italic truncate max-w-[130px]" title={tx.void_reason}>
                                {tx.void_reason}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase bg-[#e8f5e9] dark:bg-emerald-950/60 text-[#007d48] border border-[#a5d6a7] dark:border-emerald-800">
                            Completed
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right py-4">
                        {isVoided ? (
                          <span className="text-xs text-[#a0a0a2]">—</span>
                        ) : (
                          <Button
                            type="button"
                            size="xs"
                            variant="outline"
                            onClick={() => handleVoidClick(tx)}
                            className="h-8 px-3 text-xs font-bold text-[#d30005] border-[#cacacb] dark:border-[#27272a] hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer rounded-none"
                          >
                            <Ban className="w-3.5 h-3.5 mr-1" /> Void
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="px-6 pb-6">
            <PaginationBar
              meta={meta}
              onPageChange={handlePageChange}
              onLimitChange={handleLimitChange}
              label="invoices"
              isLoading={isPending}
            />
          </div>
        </CardContent>
      </Card>

      {/* Void Modal */}
      {selectedTxForVoid && (
        <PosMasterPinModal
          isOpen={voidModalOpen}
          onClose={() => { setVoidModalOpen(false); setSelectedTxForVoid(null); }}
          title="Void Sales Invoice"
          description={`Master PIN required to void invoice ${selectedTxForVoid.invoice_number || `#${selectedTxForVoid.id.slice(0, 8)}`} (₱${Number(selectedTxForVoid.total_amount).toFixed(2)}). All item stock will be restored.`}
          actionType="void_transaction"
          requireReason={true}
          onSuccess={handleVoidSuccess}
        />
      )}
    </div>
  );
}
