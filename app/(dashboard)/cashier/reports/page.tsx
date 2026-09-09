import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Banknote, CreditCard, QrCode, Receipt, TrendingUp, ShieldCheck, BadgePercent } from "lucide-react";

export default async function CashierReportsPage() {
  const supabase = await createClient();

  // 1. Authenticate user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 2. Fetch all POS transactions processed by this cashier with BIR tax breakdown
  const { data: transactions } = await supabase
    .from("pos_transactions")
    .select(`
      id,
      invoice_number,
      customer_name,
      discount_type,
      discount_id_number,
      gross_amount,
      discount_amount,
      vatable_sales,
      vat_amount,
      vat_exempt_sales,
      total_amount,
      payment_method,
      created_at
    `)
    .eq("cashier_id", user.id)
    .order("created_at", { ascending: false });

  // 3. Compute shift metrics
  const totalSales = transactions?.reduce((sum, tx) => sum + Number(tx.total_amount), 0) || 0;
  const totalGross = transactions?.reduce((sum, tx) => sum + Number(tx.gross_amount || tx.total_amount), 0) || 0;
  const totalVatable = transactions?.reduce((sum, tx) => sum + Number(tx.vatable_sales || 0), 0) || 0;
  const totalVat = transactions?.reduce((sum, tx) => sum + Number(tx.vat_amount || 0), 0) || 0;
  const totalVatExempt = transactions?.reduce((sum, tx) => sum + Number(tx.vat_exempt_sales || 0), 0) || 0;
  const totalDiscounts = transactions?.reduce((sum, tx) => sum + Number(tx.discount_amount || 0), 0) || 0;
  const totalTransactions = transactions?.length || 0;
  
  const cashSales = transactions?.filter(tx => tx.payment_method?.toLowerCase() === 'cash').reduce((sum, tx) => sum + Number(tx.total_amount), 0) || 0;
  const digitalSales = totalSales - cashSales;

  const formatDateTime = (dateStr: string) => 
    new Intl.DateTimeFormat('en-PH', { 
      month: 'short', day: 'numeric', year: 'numeric', 
      hour: '2-digit', minute: '2-digit',
      timeZone: 'Asia/Manila'
    }).format(new Date(dateStr));

  return (
    <div className="p-6 sm:p-10 max-w-[1440px] mx-auto space-y-8 text-[#111111] font-sans bg-white">
      {/* Header & Overview */}
      <div className="border-b border-[#cacacb] pb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold uppercase tracking-widest text-[#707072]">
            Operations
          </span>
          <span className="text-xs text-[#cacacb]">•</span>
          <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#f5f5f5] text-[#007d48] border border-[#cacacb]">
            BIR EOPT (RA 11976) Shift Reconciliation
          </span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-display uppercase tracking-tight text-[#111111]">
          SHIFT &amp; TAX RECONCILIATION
        </h1>
        <p className="text-xs text-[#707072] mt-1">
          Cashier shift telemetry, physical cash drawer balancing, and Philippine statutory VAT &amp; SC/PWD audit logs.
        </p>
      </div>

      {/* Primary Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Net Shift Revenue */}
        <div className="border border-[#cacacb] bg-white p-6 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-[#707072]">Net Shift Revenue</span>
            <div className="w-8 h-8 rounded-full bg-[#f5f5f5] border border-[#cacacb] flex items-center justify-center text-[#111111]">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <div className="text-4xl font-display uppercase tracking-tight text-[#111111]">
            ₱{totalSales.toFixed(2)}
          </div>
          <p className="text-xs text-[#707072] flex items-center gap-1 font-medium">
            <TrendingUp className="w-3.5 h-3.5 text-[#007d48]" /> {totalTransactions} sales transactions
          </p>
        </div>

        {/* Cash Drawer */}
        <div className="border border-[#cacacb] bg-white p-6 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-[#707072]">Cash Drawer (Tender)</span>
            <div className="w-8 h-8 rounded-full bg-[#f5f5f5] border border-[#cacacb] flex items-center justify-center text-[#111111]">
              <Banknote className="h-4 w-4" />
            </div>
          </div>
          <div className="text-4xl font-display uppercase tracking-tight text-[#111111]">
            ₱{cashSales.toFixed(2)}
          </div>
          <p className="text-xs text-[#707072]">Physical currency in register drawer</p>
        </div>

        {/* Digital Payments */}
        <div className="border border-[#cacacb] bg-white p-6 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-[#707072]">Digital &amp; QR Ph</span>
            <div className="w-8 h-8 rounded-full bg-[#f5f5f5] border border-[#cacacb] flex items-center justify-center text-[#111111]">
              <QrCode className="h-4 w-4" />
            </div>
          </div>
          <div className="text-4xl font-display uppercase tracking-tight text-[#111111]">
            ₱{digitalSales.toFixed(2)}
          </div>
          <p className="text-xs text-[#707072]">GCash, Maya &amp; terminal cards</p>
        </div>

      </div>

      {/* BIR EOPT Statutory Tax Breakdown Card Cluster */}
      <div className="border border-[#cacacb] p-6 bg-[#fafafa] space-y-4">
        <div className="flex items-center justify-between border-b border-[#cacacb] pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#007d48]" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#111111]">
              Philippine BIR Tax Summary (EOPT RA 11976 / RA 9994 / RA 10754)
            </h3>
          </div>
          <span className="text-[11px] text-[#707072]">VAT Reg. TIN: 432-891-002-00000</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-white border border-[#e5e5e5] space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#707072]">
              VATable Sales (Net)
            </span>
            <div className="text-xl font-bold text-[#111111]">
              ₱{totalVatable.toFixed(2)}
            </div>
            <p className="text-[10px] text-[#707072]">Subject to 12% standard VAT</p>
          </div>

          <div className="p-4 bg-white border border-[#e5e5e5] space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#707072]">
              12% Output VAT
            </span>
            <div className="text-xl font-bold text-[#111111]">
              ₱{totalVat.toFixed(2)}
            </div>
            <p className="text-[10px] text-[#707072]">Collected for remittance</p>
          </div>

          <div className="p-4 bg-white border border-[#e5e5e5] space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#707072]">
              VAT-Exempt Sales
            </span>
            <div className="text-xl font-bold text-[#111111]">
              ₱{totalVatExempt.toFixed(2)}
            </div>
            <p className="text-[10px] text-[#707072]">Senior Citizen &amp; PWD base</p>
          </div>

          <div className="p-4 bg-white border border-[#e5e5e5] space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#007d48] flex items-center gap-1">
              <BadgePercent className="w-3 h-3 text-[#007d48]" />
              SC/PWD Discounts
            </span>
            <div className="text-xl font-bold text-[#007d48]">
              ₱{totalDiscounts.toFixed(2)}
            </div>
            <p className="text-[10px] text-[#707072]">20% statutory deductions</p>
          </div>
        </div>
      </div>

      {/* Detailed Transaction History Table */}
      <Card className="border border-[#cacacb] bg-white rounded-none shadow-none overflow-hidden">
        <CardHeader className="border-b border-[#cacacb] bg-[#f5f5f5] p-6">
          <CardTitle className="text-lg font-bold uppercase tracking-tight text-[#111111]">
            Official Sales Invoice Audit Log
          </CardTitle>
          <CardDescription className="text-xs text-[#707072] mt-0.5">
            Sequential Sales Invoices issued during your active shift with BIR statutory classifications.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-white border-b border-[#cacacb]">
              <TableRow className="border-[#cacacb]">
                <TableHead className="text-xs font-bold uppercase tracking-wider text-[#707072] h-12">Invoice No</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-[#707072] h-12">Timestamp</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-[#707072] h-12">Tax Class</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-[#707072] h-12">Channel</TableHead>
                <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-[#707072] h-12">Gross</TableHead>
                <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-[#707072] h-12">Discount</TableHead>
                <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-[#707072] h-12">Net Paid</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!transactions || transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16 text-[#707072] text-xs font-medium">
                    No transactions recorded for this cashier shift yet.
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((tx) => {
                  const isDiscounted = tx.discount_type === 'senior_citizen' || tx.discount_type === 'pwd';
                  const invoiceRef = tx.invoice_number || `#${tx.id.split('-')[0].toUpperCase()}`;

                  return (
                    <TableRow key={tx.id} className="border-b border-[#cacacb] hover:bg-[#f5f5f5]/60 transition-colors">
                      <TableCell className="font-mono text-xs font-bold text-[#111111] py-4">
                        {invoiceRef}
                        {tx.customer_name && (
                          <span className="block text-[10px] font-sans font-normal text-[#707072] truncate max-w-[140px]">
                            {tx.customer_name}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-[#707072] text-xs py-4 font-mono">
                        {formatDateTime(tx.created_at)}
                      </TableCell>
                      <TableCell className="py-4">
                        {isDiscounted ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#e8f5e9] text-[#007d48] border border-[#a5d6a7]">
                            {tx.discount_type === 'senior_citizen' ? 'Senior (20%)' : 'PWD (20%)'}
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#f5f5f5] text-[#707072] border border-[#cacacb]">
                            12% VAT
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-4">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f5f5f5] text-[#111111] border border-[#cacacb] text-[11px] font-bold uppercase tracking-wider">
                          {tx.payment_method === 'Cash' && <Banknote className="h-3 w-3 text-[#111111]" />}
                          {tx.payment_method === 'Card' && <CreditCard className="h-3 w-3 text-[#111111]" />}
                          {tx.payment_method !== 'Cash' && tx.payment_method !== 'Card' && <QrCode className="h-3 w-3 text-[#111111]" />}
                          {tx.payment_method}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-xs text-[#707072] py-4">
                        ₱{Number(tx.gross_amount || tx.total_amount).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium text-[#007d48] py-4">
                        {Number(tx.discount_amount) > 0 ? `-₱${Number(tx.discount_amount).toFixed(2)}` : '—'}
                      </TableCell>
                      <TableCell className="text-right font-bold text-sm text-[#111111] py-4">
                        ₱{Number(tx.total_amount).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}