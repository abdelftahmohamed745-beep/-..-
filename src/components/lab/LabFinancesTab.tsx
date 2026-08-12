import React, { useState, useEffect } from 'react';
import { LabTransaction, LabOrder, LabFinanceType } from '../../types';
import { getLabTransactions, addLabTransaction } from '../../services/labService';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PlusCircle,
  CreditCard,
  Banknote,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar
} from 'lucide-react';

interface LabFinancesTabProps {
  labId: string;
  orders: LabOrder[];
  onShowToast: (title: string, message?: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const LabFinancesTab: React.FC<LabFinancesTabProps> = ({
  labId,
  orders,
  onShowToast
}) => {
  const [transactions, setTransactions] = useState<LabTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [type, setType] = useState<LabFinanceType>('REVENUE');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [category, setCategory] = useState('تحاليل طبية');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'TRANSFER'>('CASH');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, [labId]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const list = await getLabTransactions(labId);
      setTransactions(list);
    } catch (err) {
      console.error("Error fetching transactions:", err);
      onShowToast("خطأ", "تعذر تحميل المعاملات المالية", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || amount <= 0) {
      onShowToast("تنبيه", "يرجى إدخال عنوان المعاملة والمبلغ بشكل صحيح", "warning");
      return;
    }

    setSubmitting(true);
    try {
      const todayIso = new Date().toISOString().split('T')[0];
      await addLabTransaction(labId, {
        type,
        title: title.trim(),
        amount: Number(amount),
        category,
        paymentMethod,
        notes: notes.trim(),
        createdBy: 'admin',
        createdByName: 'مدير الحسابات',
        date: todayIso
      });

      onShowToast("نجاح", "تم تسجيل المعاملة المالية بنجاح", "success");
      setShowAddModal(false);
      setTitle('');
      setAmount(0);
      setNotes('');
      fetchTransactions();
    } catch (err) {
      console.error("Error adding transaction:", err);
      onShowToast("خطأ", "فشل تسجيل المعاملة المالية", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Combine Order Receipts & Manual Transactions for Full Revenue Ledger
  const orderRevenues = orders
    .filter((o) => o.paidAmount && o.paidAmount > 0)
    .map((o) => ({
      id: `ord_tx_${o.id}`,
      labId: o.labId,
      type: 'REVENUE' as LabFinanceType,
      title: `تحصيل طلب فحص #${o.orderNumber} - ${o.patientName}`,
      amount: o.paidAmount,
      category: 'فحوصات معملية',
      paymentMethod: 'CASH' as const,
      date: o.createdAt.split('T')[0],
      createdAt: o.createdAt,
      createdBy: 'system'
    }));

  const allTransactions = [...transactions, ...orderRevenues].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const filteredTransactions = allTransactions.filter((t) =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.category && t.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalRevenue = allTransactions
    .filter((t) => t.type === 'REVENUE')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalExpense = allTransactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const netProfit = totalRevenue - totalExpense;

  return (
    <div className="space-y-6">
      
      {/* Header & Section Clarification */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-teal-600" />
            <h1 className="text-xl font-extrabold text-slate-900 font-['Tajawal',sans-serif]">
              الحسابات والمالية
            </h1>
            <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
              إجمالي المعاملات {allTransactions.length}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            سجل الإيرادات والمصروفات والتدفقات النقدية اليومية والشهرية لمختبر التحاليل
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-2 shadow-2xs"
        >
          <PlusCircle className="w-4 h-4" />
          <span>تسجيل حركة مالية</span>
        </button>
      </div>

      {/* Operational Finance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">إجمالي الإيرادات</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-900 mt-2">{totalRevenue.toLocaleString('ar-EG')} ج.م</p>
          <p className="text-[11px] text-slate-400 mt-0.5">من الفحوصات والخدمات</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">المصروفات التشغيلية</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-900 mt-2">{totalExpense.toLocaleString('ar-EG')} ج.م</p>
          <p className="text-[11px] text-slate-400 mt-0.5">مستلزمات، رواتب، وصيانة</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">صافي الأرباح</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className={`text-2xl font-black mt-2 ${netProfit >= 0 ? 'text-teal-900' : 'text-rose-900'}`}>
            {netProfit.toLocaleString('ar-EG')} ج.م
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">الرصيد الصافي المتبقي</p>
        </div>

      </div>

      {/* Transactions Table Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        
        {/* Search & Filters Bar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالحركة أو التصنيف..."
              className="w-full pl-3 pr-9 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Table View */}
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500 font-bold">
            جاري تحميل المعاملات المالية...
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            {searchQuery ? "لا توجد حركات مالية تطابق بحثك" : "لا توجد معاملات مالية مسجلة حتى الآن."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">نوع الحركة</th>
                  <th className="px-4 py-3">بيان المعاملة والتصنيف</th>
                  <th className="px-4 py-3">طريقة الدفع</th>
                  <th className="px-4 py-3">المبلغ</th>
                  <th className="px-4 py-3">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                {filteredTransactions.map((tx) => {
                  const isRevenue = tx.type === 'REVENUE';
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3">
                        {isRevenue ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md text-[11px] font-bold border border-emerald-200">
                            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                            <span>إيراد (+)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-rose-800 bg-rose-50 px-2.5 py-1 rounded-md text-[11px] font-bold border border-rose-200">
                            <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                            <span>مصروف (-)</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-extrabold text-slate-900">{tx.title}</p>
                          <p className="text-[11px] text-slate-400 font-normal">{tx.category || "عام"}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <div className="flex items-center gap-1">
                          <Banknote className="w-3.5 h-3.5 text-slate-400" />
                          <span>{tx.paymentMethod === 'CASH' ? 'نقداً (كاش)' : tx.paymentMethod === 'CARD' ? 'بطاقة ائتمان' : 'تحويل بنكي'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-black text-sm">
                        <span className={isRevenue ? 'text-emerald-700' : 'text-rose-700'}>
                          {isRevenue ? '+' : '-'}{tx.amount.toLocaleString('ar-EG')} ج.م
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 dir-ltr text-right">
                        {tx.date || new Date(tx.createdAt).toLocaleDateString('ar-EG')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Add Transaction Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-right space-y-4">
            <h2 className="text-base font-extrabold text-slate-900">تسجيل حركة مالية جديدة</h2>
            
            <form onSubmit={handleAddTransaction} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">نوع المعاملة *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setType('REVENUE')}
                    className={`py-2 px-3 rounded-lg font-bold border text-xs flex items-center justify-center gap-1.5 ${
                      type === 'REVENUE'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4" />
                    <span>إيراد (+)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setType('EXPENSE')}
                    className={`py-2 px-3 rounded-lg font-bold border text-xs flex items-center justify-center gap-1.5 ${
                      type === 'EXPENSE'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <TrendingDown className="w-4 h-4" />
                    <span>مصروف (-)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">بيان المعاملة *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: شراء محاليل كيمياء أو تحصيل فحص خاص"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">المبلغ (ج.م) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={amount || ''}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">التصنيف</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium focus:ring-2 focus:ring-teal-500"
                >
                  <option value="تحاليل طبية">تحاليل طبية وفحوصات</option>
                  <option value="مستلزمات معملية">مستلزمات ومحاليل معملية</option>
                  <option value="رواتب وأجور">رواتب وأجور الكادر</option>
                  <option value="صيانة وإيجار">صيانة أجهزة وإيجار</option>
                  <option value="مصاريف نثرية">مصاريف أخرى</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">طريقة الدفع</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium focus:ring-2 focus:ring-teal-500"
                >
                  <option value="CASH">نقداً (كاش)</option>
                  <option value="CARD">بطاقة ائتمانية / فيزا</option>
                  <option value="TRANSFER">تحويل بنكي / فودافون كاش</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold disabled:opacity-50"
                >
                  {submitting ? "جاري الحفظ..." : "تسجيل الحركة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
