import React, { useState, useEffect } from 'react';
import { LabProfile, LabTestCatalogItem, LabOrder, LabOrderStatus, LabSample, LabTestResult, LabTestResultItem, LabStaffMember, LabTransaction, ExpenseCategory } from '../../types';
import {
  getLabProfile,
  updateLabProfile,
  getLabTests,
  addLabTest,
  updateLabTest,
  deleteLabTest,
  getLabOrders,
  updateLabOrderStatus,
  subscribeToLabOrders,
  getLabSamples,
  updateSampleStatus,
  saveTestResult,
  approveAndPublishResult,
  getLabResultsForOrder,
  getLabStaff,
  addLabStaffMember,
  getLabTransactions,
  addLabTransaction,
  generateAIPatientExplanation
} from '../../services/labService';
import { SampleScannerModal } from './SampleScannerModal';
import { LabPDFReportModal } from './LabPDFReportModal';
import {
  TestTube,
  ShoppingBag,
  FileText,
  Users,
  DollarSign,
  Home,
  QrCode,
  Sparkles,
  Settings,
  Plus,
  Search,
  CheckCircle,
  Clock,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  Printer,
  X,
  Edit2,
  Trash2,
  Check,
  Building,
  Phone,
  MapPin,
  Calendar,
  Tag
} from 'lucide-react';

interface LabDashboardProps {
  currentLab: LabProfile;
  onShowToast: (title: string, message?: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onSignOut: () => void;
}

export const LabDashboard: React.FC<LabDashboardProps> = ({
  currentLab,
  onShowToast,
  onSignOut
}) => {
  const [lab, setLab] = useState<LabProfile>(currentLab);
  const [activeTab, setActiveTab] = useState<'overview' | 'catalog' | 'orders' | 'samples' | 'results' | 'staff' | 'finances' | 'home_collections' | 'ai_assistant' | 'settings'>('overview');

  // Data State
  const [tests, setTests] = useState<LabTestCatalogItem[]>([]);
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [samples, setSamples] = useState<LabSample[]>([]);
  const [staffList, setStaffList] = useState<LabStaffMember[]>([]);
  const [transactions, setTransactions] = useState<LabTransaction[]>([]);

  const [loading, setLoading] = useState(true);

  // Modals & Active Selections
  const [showScanner, setShowScanner] = useState(false);
  const [selectedOrderForResults, setSelectedOrderForResults] = useState<LabOrder | null>(null);
  const [orderResults, setOrderResults] = useState<LabTestResult[]>([]);
  const [showPDFModalForOrder, setShowPDFModalForOrder] = useState<LabOrder | null>(null);

  // Test Catalog Form Modal State
  const [showAddTestModal, setShowAddTestModal] = useState(false);
  const [editingTest, setEditingTest] = useState<LabTestCatalogItem | null>(null);
  const [testForm, setTestForm] = useState({
    name: '',
    category: 'كيمياء الدم',
    price: 150,
    estimatedTurnaroundHours: 12,
    sampleType: 'دم وريدي',
    requiresFasting: false,
    fastingHours: 8,
    patientInstructions: '',
    description: ''
  });

  // Result Entry Form State
  const [resultForm, setResultForm] = useState({
    testName: '',
    parameters: [
      { parameterName: '', value: '', unit: '', referenceRange: '', flag: 'normal' as const }
    ],
    generalNotes: '',
    aiSummary: ''
  });

  // Finance Form Modal State
  const [showAddTxModal, setShowAddTxModal] = useState(false);
  const [txForm, setTxForm] = useState({
    type: 'REVENUE' as 'REVENUE' | 'EXPENSE',
    title: '',
    amount: 100,
    category: 'REAGENTS_SUPPLIES',
    notes: ''
  });

  // Lab Settings Form State
  const [settingsForm, setSettingsForm] = useState({
    name: lab.name,
    responsibleName: lab.responsibleName,
    phone: lab.phone,
    address: lab.address,
    offersHomeCollection: lab.offersHomeCollection,
    homeCollectionFee: lab.homeCollectionFee || 100
  });

  // Load Lab Data
  useEffect(() => {
    async function initLabData() {
      setLoading(true);
      try {
        const freshLab = await getLabProfile(currentLab.uid);
        if (freshLab) setLab(freshLab);

        const testItems = await getLabTests(currentLab.uid);
        setTests(testItems);

        const samplesList = await getLabSamples(currentLab.uid);
        setSamples(samplesList);

        const staffMembers = await getLabStaff(currentLab.uid);
        setStaffList(staffMembers);

        const txs = await getLabTransactions(currentLab.uid);
        setTransactions(txs);
      } catch (err) {
        console.error("Error loading lab dashboard:", err);
      } finally {
        setLoading(false);
      }
    }
    initLabData();

    // Subscribe to Realtime Orders
    const unsub = subscribeToLabOrders(currentLab.uid, (updatedOrders) => {
      setOrders(updatedOrders);
    });

    return () => unsub();
  }, [currentLab.uid]);

  // Derived Metrics
  const newOrdersCount = orders.filter((o) => o.status === 'NEW').length;
  const inProgressOrdersCount = orders.filter((o) => o.status === 'PROCESSING' || o.status === 'SAMPLE_RECEIVED' || o.status === 'UNDER_REVIEW').length;
  const readyOrdersCount = orders.filter((o) => o.status === 'READY' || o.status === 'COMPLETED').length;

  const todayStr = new Date().toISOString().split('T')[0];
  const todayRevenue = orders
    .filter((o) => o.createdAt.startsWith(todayStr))
    .reduce((sum, o) => sum + o.totalPrice, 0);

  const monthlyRevenue = orders.reduce((sum, o) => sum + o.totalPrice, 0);

  // Handle Save Test Form
  const handleSaveTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testForm.name.trim()) return;

    try {
      if (editingTest) {
        await updateLabTest(lab.uid, editingTest.id, {
          name: testForm.name.trim(),
          category: testForm.category,
          price: testForm.price,
          estimatedTurnaroundHours: testForm.estimatedTurnaroundHours,
          sampleType: testForm.sampleType,
          requiresFasting: testForm.requiresFasting,
          fastingHours: testForm.fastingHours,
          patientInstructions: testForm.patientInstructions,
          description: testForm.description
        });
        onShowToast("تم تعديل التحليل بنجاح", "", "success");
      } else {
        await addLabTest(lab.uid, {
          name: testForm.name.trim(),
          category: testForm.category,
          price: testForm.price,
          estimatedTurnaroundHours: testForm.estimatedTurnaroundHours,
          sampleType: testForm.sampleType,
          requiresFasting: testForm.requiresFasting,
          fastingHours: testForm.fastingHours,
          patientInstructions: testForm.patientInstructions,
          description: testForm.description,
          active: true
        });
        onShowToast("تمت إضافة التحليل للدليل بنجاح", "", "success");
      }

      setShowAddTestModal(false);
      setEditingTest(null);
      const updated = await getLabTests(lab.uid);
      setTests(updated);
    } catch (err) {
      onShowToast("خطأ في حفظ بيانات التحليل", "", "error");
    }
  };

  // Handle Order Status Toggle
  const handleOrderStatusChange = async (orderId: string, newStatus: LabOrderStatus) => {
    try {
      await updateLabOrderStatus(lab.uid, orderId, newStatus);
      onShowToast("تم تحديث حالة الطلب بنجاح", `الحالة: ${newStatus}`, "success");
    } catch (err) {
      onShowToast("فشل تحديث الحالة", "", "error");
    }
  };

  // Handle Result Entry Form Submission
  const handleSaveResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForResults) return;

    try {
      const autoSummary = generateAIPatientExplanation(resultForm.parameters);
      
      const savedResult = await saveTestResult(lab.uid, {
        labId: lab.uid,
        orderId: selectedOrderForResults.id,
        orderNumber: selectedOrderForResults.orderNumber,
        sampleId: "SAMP-001",
        patientName: selectedOrderForResults.patientName,
        patientPhone: selectedOrderForResults.patientPhone,
        testName: resultForm.testName || selectedOrderForResults.testNames[0] || "فحص شامل",
        items: resultForm.parameters,
        status: "approved",
        reviewerName: lab.responsibleName,
        generalNotes: resultForm.generalNotes,
        aiNotesSummary: resultForm.aiSummary || autoSummary
      });

      // Update Order Status to READY
      await updateLabOrderStatus(lab.uid, selectedOrderForResults.id, "READY");

      onShowToast("تم حفظ واكتمل اعتماد نتيجة التحليل بنجاح", "جاهزة لعرض وطباعة المريض", "success");
      setSelectedOrderForResults(null);
    } catch (err) {
      onShowToast("خطأ في حفظ نتائج التحليل", "", "error");
    }
  };

  // Handle Save Transaction
  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txForm.title.trim()) return;

    try {
      await addLabTransaction(lab.uid, {
        type: txForm.type,
        title: txForm.title.trim(),
        amount: txForm.amount,
        category: txForm.category,
        createdBy: lab.uid,
        createdByName: lab.responsibleName,
        date: todayStr
      });
      setShowAddTxModal(false);
      onShowToast("تم تسجيل المعاملة المالية بنجاح", "", "success");
      const updatedTxs = await getLabTransactions(lab.uid);
      setTransactions(updatedTxs);
    } catch (err) {
      onShowToast("خطأ في إضافة المعاملة المالية", "", "error");
    }
  };

  // Handle Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateLabProfile(lab.uid, {
        name: settingsForm.name,
        responsibleName: settingsForm.responsibleName,
        phone: settingsForm.phone,
        address: settingsForm.address,
        offersHomeCollection: settingsForm.offersHomeCollection,
        homeCollectionFee: settingsForm.homeCollectionFee
      });
      setLab({
        ...lab,
        ...settingsForm
      });
      onShowToast("تم حفظ إعدادات المعمل بنجاح", "", "success");
    } catch (err) {
      onShowToast("فشل حفظ الإعدادات", "", "error");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      
      {/* Top Banner & Header */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center font-black text-2xl">
            <TestTube className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 bg-teal-500 text-slate-950 font-black text-[10px] rounded-md">
                منصة DORY LABS
              </span>
              <span className="text-xs text-slate-400 font-medium">لوحة التحكم المتكاملة للمختبر</span>
            </div>
            <h1 className="text-2xl font-black text-white font-['Tajawal',sans-serif]">
              {lab.name}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">المسؤول: {lab.responsibleName} | هاتف: {lab.phone}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowScanner(true)}
            className="px-4 py-2.5 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs rounded-2xl flex items-center gap-2 transition shadow-md"
          >
            <QrCode className="w-4 h-4" />
            <span>ماسح أكواد العينات</span>
          </button>
          
          <button
            onClick={() => {
              if (window.confirm("هل أنت متأكد أنك تريد الخروج؟")) {
                onSignOut();
              }
            }}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-2xl transition"
          >
            تسجيل الخروج
          </button>
        </div>
      </div>

      {/* Metrics Row Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[10px] text-slate-500 font-bold block mb-1">طلبات جديدة</span>
          <span className="text-2xl font-black text-amber-600 font-mono">{newOrdersCount}</span>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[10px] text-slate-500 font-bold block mb-1">قيد التحليل</span>
          <span className="text-2xl font-black text-sky-600 font-mono">{inProgressOrdersCount}</span>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[10px] text-slate-500 font-bold block mb-1">النتائج الجاهزة</span>
          <span className="text-2xl font-black text-emerald-600 font-mono">{readyOrdersCount}</span>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[10px] text-slate-500 font-bold block mb-1">العينات المسجلة</span>
          <span className="text-2xl font-black text-slate-800 font-mono">{samples.length}</span>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[10px] text-slate-500 font-bold block mb-1">إيراد اليوم</span>
          <span className="text-xl font-black text-teal-700 font-mono">{todayRevenue} ج.م</span>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[10px] text-slate-500 font-bold block mb-1">إيراد الشهر</span>
          <span className="text-xl font-black text-slate-900 font-mono">{monthlyRevenue} ج.م</span>
        </div>
      </div>

      {/* Workspace Navigation Tabs Bar */}
      <div className="bg-white rounded-2xl p-2 border border-slate-200 flex items-center gap-1 overflow-x-auto scrollbar-none">
        {[
          { id: 'overview', label: 'الرئيسية والمؤشرات', icon: TrendingUp },
          { id: 'orders', label: 'إدارة الطلبات', icon: ShoppingBag, badge: newOrdersCount },
          { id: 'catalog', label: 'دليل التحاليل', icon: TestTube },
          { id: 'samples', label: 'العينات والأكواد', icon: QrCode },
          { id: 'results', label: 'إدخال ومراجعة النتائج', icon: FileText },
          { id: 'home_collections', label: 'سحب العينات بالمنزل', icon: Home },
          { id: 'finances', label: 'المالية والمصروفات', icon: DollarSign },
          { id: 'staff', label: 'فريق العمل والصلاحيات', icon: Users },
          { id: 'ai_assistant', label: 'مساعد المعمل الذكي', icon: Sparkles },
          { id: 'settings', label: 'إعدادات المعمل والبوستر', icon: Settings }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-2 ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-teal-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 font-black text-[10px] rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: 1. OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Quick Actions Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-extrabold text-sm text-slate-900 font-['Tajawal',sans-serif]">إجراءات سريعة</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setShowScanner(true)}
                  className="w-full py-3 bg-teal-50 text-teal-900 font-bold text-xs rounded-2xl border border-teal-200 flex items-center justify-between px-4 hover:bg-teal-100 transition"
                >
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-teal-600" />
                    <span>مسح باركود عينة جديدة</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-teal-600" />
                </button>

                <button
                  onClick={() => {
                    setEditingTest(null);
                    setTestForm({
                      name: '',
                      category: 'كيمياء الدم',
                      price: 150,
                      estimatedTurnaroundHours: 12,
                      sampleType: 'دم وريدي',
                      requiresFasting: false,
                      fastingHours: 8,
                      patientInstructions: '',
                      description: ''
                    });
                    setShowAddTestModal(true);
                  }}
                  className="w-full py-3 bg-slate-50 text-slate-800 font-bold text-xs rounded-2xl border border-slate-200 flex items-center justify-between px-4 hover:bg-slate-100 transition"
                >
                  <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4 text-slate-600" />
                    <span>إضافة تحليل جديد للدليل</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                <button
                  onClick={() => setActiveTab('settings')}
                  className="w-full py-3 bg-slate-50 text-slate-800 font-bold text-xs rounded-2xl border border-slate-200 flex items-center justify-between px-4 hover:bg-slate-100 transition"
                >
                  <div className="flex items-center gap-2">
                    <Printer className="w-4 h-4 text-slate-600" />
                    <span>طباعة بوستر المعمل المخصص للـ QR</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Latest Orders List */}
            <div className="md:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-slate-900 font-['Tajawal',sans-serif]">أحدث طلبات التحاليل الواردة</h3>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="text-xs font-bold text-teal-700 hover:text-teal-900"
                >
                  عرض الكل ({orders.length})
                </button>
              </div>

              {orders.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center">لا توجد طلبات جديدة حالياً.</p>
              ) : (
                <div className="space-y-2">
                  {orders.slice(0, 5).map((ord) => (
                    <div key={ord.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900 block">{ord.patientName}</span>
                        <span className="text-[11px] text-slate-500 font-mono">{ord.orderNumber} • {ord.testNames.join("، ")}</span>
                      </div>
                      <div className="text-left">
                        <span className="font-mono font-black text-teal-700 block">{ord.totalPrice} ج.م</span>
                        <span className="px-2 py-0.5 bg-slate-200 text-slate-800 rounded font-bold text-[10px]">
                          {ord.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* TAB CONTENT: 2. TEST CATALOG */}
      {activeTab === 'catalog' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900 font-['Tajawal',sans-serif]">دليل الفحوصات والأسعار</h2>
              <p className="text-xs text-slate-500">إدارة التحاليل وإمكانيات الصيام وأسعار الخدمات</p>
            </div>

            <button
              onClick={() => {
                setEditingTest(null);
                setTestForm({
                  name: '',
                  category: 'كيمياء الدم',
                  price: 150,
                  estimatedTurnaroundHours: 12,
                  sampleType: 'دم وريدي',
                  requiresFasting: false,
                  fastingHours: 8,
                  patientInstructions: '',
                  description: ''
                });
                setShowAddTestModal(true);
              }}
              className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-2xl flex items-center gap-2 transition"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة تحليل جديد</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <th className="p-3">اسم التحليل</th>
                  <th className="p-3">التصنيف</th>
                  <th className="p-3">السعر (ج.م)</th>
                  <th className="p-3">نوع العينة</th>
                  <th className="p-3">الصيام</th>
                  <th className="p-3">مدة النتيجة</th>
                  <th className="p-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                {tests.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="p-3 font-extrabold text-slate-900">{t.name}</td>
                    <td className="p-3 text-slate-500">{t.category || 'عام'}</td>
                    <td className="p-3 font-mono font-black text-teal-700">{t.price} ج.م</td>
                    <td className="p-3">{t.sampleType}</td>
                    <td className="p-3">
                      {t.requiresFasting ? (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded font-bold text-[10px]">
                          صيام {t.fastingHours || 8}h
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                          بدون صيام
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-mono">{t.estimatedTurnaroundHours} ساعة</td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => {
                          setEditingTest(t);
                          setTestForm({
                            name: t.name,
                            category: t.category || 'كيمياء الدم',
                            price: t.price,
                            estimatedTurnaroundHours: t.estimatedTurnaroundHours,
                            sampleType: t.sampleType,
                            requiresFasting: t.requiresFasting,
                            fastingHours: t.fastingHours || 8,
                            patientInstructions: t.patientInstructions || '',
                            description: t.description || ''
                          });
                          setShowAddTestModal(true);
                        }}
                        className="p-1.5 text-slate-600 hover:text-teal-700 rounded-lg hover:bg-slate-100 transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 3. ORDERS MANAGEMENT */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900 font-['Tajawal',sans-serif]">إدارة الطلبات والحالات</h2>
              <p className="text-xs text-slate-500">تتبع الطلبات وتحديث مراحل التحليل اعتماداً على المسار المعتمد</p>
            </div>
          </div>

          <div className="space-y-3">
            {orders.map((ord) => (
              <div key={ord.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-black text-slate-900 text-sm">{ord.orderNumber}</span>
                    <span className={`px-2.5 py-0.5 rounded font-extrabold text-[10px] ${
                      ord.collectionMethod === 'HOME_COLLECTION' ? 'bg-amber-100 text-amber-900' : 'bg-sky-100 text-sky-900'
                    }`}>
                      {ord.collectionMethod === 'HOME_COLLECTION' ? 'سحب منزل' : 'في المعمل'}
                    </span>
                  </div>
                  <p className="font-extrabold text-slate-900">{ord.patientName} ({ord.patientPhone})</p>
                  <p className="text-slate-500 mt-0.5">التحاليل: <span className="font-bold text-slate-800">{ord.testNames.join("، ")}</span></p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-200">
                  <span className="font-mono font-black text-teal-700 text-sm">{ord.totalPrice} ج.م</span>

                  <select
                    value={ord.status}
                    onChange={(e) => handleOrderStatusChange(ord.id, e.target.value as LabOrderStatus)}
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-bold text-xs focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="NEW">جديد (NEW)</option>
                    <option value="CONFIRMED">مؤكد (CONFIRMED)</option>
                    <option value="SAMPLE_RECEIVED">تم استلام العينة (SAMPLE_RECEIVED)</option>
                    <option value="PROCESSING">قيد التحليل (PROCESSING)</option>
                    <option value="READY">النتائج جاهزة (READY)</option>
                    <option value="COMPLETED">مكتمل (COMPLETED)</option>
                    <option value="CANCELLED">ملغى (CANCELLED)</option>
                  </select>

                  <button
                    onClick={() => {
                      setSelectedOrderForResults(ord);
                      setResultForm({
                        testName: ord.testNames[0] || "تحليل شامل",
                        parameters: [
                          { parameterName: 'Hemoglobin (Hb)', value: '13.5', unit: 'g/dL', referenceRange: '12.0 - 16.0', flag: 'normal' },
                          { parameterName: 'WBC Count', value: '7.2', unit: 'x10^3/uL', referenceRange: '4.0 - 11.0', flag: 'normal' }
                        ],
                        generalNotes: '',
                        aiSummary: ''
                      });
                      setActiveTab('results');
                    }}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl"
                  >
                    إدخال النتائج
                  </button>

                  <button
                    onClick={() => setShowPDFModalForOrder(ord)}
                    className="p-2 text-slate-600 hover:text-teal-700 rounded-xl hover:bg-slate-200"
                    title="طباعة التقرير"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: 4. SAMPLES & BARCODES */}
      {activeTab === 'samples' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900 font-['Tajawal',sans-serif]">إدارة العينات والباركود</h2>
              <p className="text-xs text-slate-500">سجل أكواد الأنابيب المسحوبة وإمكانية البحث بواسطة المسح الضوئي</p>
            </div>

            <button
              onClick={() => setShowScanner(true)}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-2xl flex items-center gap-2"
            >
              <QrCode className="w-4 h-4" />
              <span>فتح المكتشف الضوئي</span>
            </button>
          </div>

          <div className="space-y-2">
            {samples.map((s) => (
              <div key={s.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-200 rounded-xl text-slate-700 font-mono font-black">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-mono font-black text-slate-900 block">{s.sampleId}</span>
                    <span className="text-[11px] text-slate-500">{s.patientName} • طلب {s.orderNumber}</span>
                  </div>
                </div>

                <span className="px-3 py-1 bg-teal-100 text-teal-900 rounded-full font-bold text-[10px]">
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: 5. RESULT ENTRY & REVIEW WORKFLOW */}
      {activeTab === 'results' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-black text-slate-900 font-['Tajawal',sans-serif]">إدخال واعتمد النتائج الطبية</h2>
            <p className="text-xs text-slate-500">إدخال القيم والوحدات مع التدقيق التلقائي للحالات الحرجة</p>
          </div>

          {selectedOrderForResults ? (
            <form onSubmit={handleSaveResult} className="space-y-6 border-t border-slate-200 pt-6">
              <div className="bg-teal-50/60 p-4 rounded-2xl border border-teal-200 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-teal-900 block">المريض: {selectedOrderForResults.patientName}</span>
                  <span className="font-mono text-slate-600">رقم الطلب: {selectedOrderForResults.orderNumber}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedOrderForResults(null)}
                  className="text-xs text-rose-600 font-bold hover:underline"
                >
                  إلغاء التحديد
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم الفحص الرئيسي</label>
                <input
                  type="text"
                  value={resultForm.testName}
                  onChange={(e) => setResultForm({ ...resultForm, testName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  required
                />
              </div>

              {/* Dynamic Parameters List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">مؤشرات الفحص (Parameters):</span>
                  <button
                    type="button"
                    onClick={() => {
                      setResultForm({
                        ...resultForm,
                        parameters: [
                          ...resultForm.parameters,
                          { parameterName: '', value: '', unit: '', referenceRange: '', flag: 'normal' }
                        ]
                      });
                    }}
                    className="text-xs text-teal-700 font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة عنصر فحص جديد</span>
                  </button>
                </div>

                {resultForm.parameters.map((p, pIdx) => (
                  <div key={pIdx} className="grid grid-cols-1 sm:grid-cols-5 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs items-center">
                    <input
                      type="text"
                      placeholder="اسم المؤشر e.g. Hb"
                      value={p.parameterName}
                      onChange={(e) => {
                        const updated = [...resultForm.parameters];
                        updated[pIdx].parameterName = e.target.value;
                        setResultForm({ ...resultForm, parameters: updated });
                      }}
                      className="px-2.5 py-2 bg-white border border-slate-200 rounded-xl font-bold"
                      required
                    />
                    <input
                      type="text"
                      placeholder="النتيجة e.g. 13.5"
                      value={p.value}
                      onChange={(e) => {
                        const updated = [...resultForm.parameters];
                        updated[pIdx].value = e.target.value;
                        setResultForm({ ...resultForm, parameters: updated });
                      }}
                      className="px-2.5 py-2 bg-white border border-slate-200 rounded-xl font-extrabold font-mono"
                      required
                    />
                    <input
                      type="text"
                      placeholder="الوحدة e.g. g/dL"
                      value={p.unit}
                      onChange={(e) => {
                        const updated = [...resultForm.parameters];
                        updated[pIdx].unit = e.target.value;
                        setResultForm({ ...resultForm, parameters: updated });
                      }}
                      className="px-2.5 py-2 bg-white border border-slate-200 rounded-xl font-mono"
                    />
                    <input
                      type="text"
                      placeholder="المدى e.g. 12-16"
                      value={p.referenceRange}
                      onChange={(e) => {
                        const updated = [...resultForm.parameters];
                        updated[pIdx].referenceRange = e.target.value;
                        setResultForm({ ...resultForm, parameters: updated });
                      }}
                      className="px-2.5 py-2 bg-white border border-slate-200 rounded-xl font-mono"
                    />
                    <select
                      value={p.flag}
                      onChange={(e) => {
                        const updated = [...resultForm.parameters];
                        updated[pIdx].flag = e.target.value as any;
                        setResultForm({ ...resultForm, parameters: updated });
                      }}
                      className="px-2 py-2 bg-white border border-slate-200 rounded-xl font-bold"
                    >
                      <option value="normal">طبيعي (Normal)</option>
                      <option value="high">مرتفع (High ↑)</option>
                      <option value="low">منخفض (Low ↓)</option>
                      <option value="critical">حرج (Critical ⚠️)</option>
                    </select>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات الطبيب المراجع الرسمية</label>
                <textarea
                  value={resultForm.generalNotes}
                  onChange={(e) => setResultForm({ ...resultForm, generalNotes: e.target.value })}
                  placeholder="ملاحظات توضيحية للمريض أو الطبيب المعالج..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  rows={2}
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-teal-500 hover:bg-teal-600 text-slate-950 font-black text-sm rounded-2xl transition shadow-md"
              >
                اعتماد ونشر التقرير الطبي فوراً للمريض
              </button>
            </form>
          ) : (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-600">اختر طلب تحليل من قائمة الطلبات للانتقال فوراً لإدخال واعتمد النتائج.</p>
              <button
                onClick={() => setActiveTab('orders')}
                className="mt-3 px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl"
              >
                انتقال لقائمة الطلبات
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: 6. HOME COLLECTIONS */}
      {activeTab === 'home_collections' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-black text-slate-900 font-['Tajawal',sans-serif]">طلبات سحب العينات بالمنزل</h2>
            <p className="text-xs text-slate-500">إدارة المواعيد المحددة والعناوين وتعيين فنيي السحب</p>
          </div>

          <div className="space-y-3">
            {orders.filter((o) => o.collectionMethod === 'HOME_COLLECTION').map((ho) => (
              <div key={ho.id} className="p-4 bg-teal-50/50 rounded-2xl border border-teal-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-900 text-sm">{ho.patientName} ({ho.patientPhone})</span>
                  <span className="px-2.5 py-0.5 bg-teal-600 text-white font-mono font-bold rounded text-[10px]">
                    {ho.orderNumber}
                  </span>
                </div>
                <p className="text-slate-700">العنوان: <span className="font-bold">{ho.homeAddress || 'غير محدد'}</span></p>
                <p className="text-slate-600">الموعد المفضل: <span className="font-bold">{ho.homePreferredDate || 'اليوم'} في تمام الساعة {ho.homePreferredTime || '10:00'}</span></p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: 7. FINANCES */}
      {activeTab === 'finances' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900 font-['Tajawal',sans-serif]">إدارة المالية والمصروفات</h2>
              <p className="text-xs text-slate-500">متابعة إيرادات التحاليل وشراء المستلزمات والمحاليل</p>
            </div>

            <button
              onClick={() => setShowAddTxModal(true)}
              className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-2xl flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>تسجيل مصروف / إيراد</span>
            </button>
          </div>

          <div className="space-y-2">
            {transactions.map((tx) => (
              <div key={tx.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-900 block">{tx.title}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{tx.date}</span>
                </div>

                <span className={`font-mono font-black text-sm ${
                  tx.type === 'REVENUE' ? 'text-emerald-700' : 'text-rose-600'
                }`}>
                  {tx.type === 'REVENUE' ? '+' : '-'}{tx.amount} ج.م
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: 8. STAFF */}
      {activeTab === 'staff' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-black text-slate-900 font-['Tajawal',sans-serif]">فريق العمل والصلاحيات</h2>
            <p className="text-xs text-slate-500">أعضاء المعمل وأدوارهم المعتمدة (استقبال، فني، مراجع)</p>
          </div>

          <div className="space-y-2">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
              <div>
                <span className="font-extrabold text-slate-900 block">{lab.responsibleName}</span>
                <span className="text-[10px] text-slate-500">مالك المعمل (OWNER)</span>
              </div>
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded text-[10px]">نشط</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 9. AI LAB ASSISTANT */}
      {activeTab === 'ai_assistant' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 font-['Tajawal',sans-serif]">مساعد المعمل الذكي (AI Lab Assistant)</h2>
              <p className="text-xs text-slate-500">تسهيل صياغة تفسير النتائج بلغة مبسطة واكتشاف الحالات الحرجة</p>
            </div>
          </div>

          <div className="p-4 bg-teal-50 rounded-2xl border border-teal-200 text-xs text-teal-950 space-y-2">
            <span className="font-bold block text-teal-900">💡 كيف يساعدك الذكاء الاصطناعي في Dory Labs؟</span>
            <p className="leading-relaxed">
              يقوم نظام الذكاء الاصطناعي بتحليل قيم النتائج فور إدخالها واقتراح ملخص ميسر للمريض يوضح ما إذا كانت المؤشرات طبيعية أو تحتوي على قيم تحتاج استشارة طبيب، مما يوفر تجربة راقية واحترافية للعملاء.
            </p>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 10. SETTINGS & POSTER */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-black text-slate-900 font-['Tajawal',sans-serif]">إعدادات ملف المعمل والبوستر المطبوع</h2>
            <p className="text-xs text-slate-500">تحديث البيانات وطباعة ملصق الـ QR المخصص لمقر المعمل</p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">اسم المعمل</label>
              <input
                type="text"
                value={settingsForm.name}
                onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">اسم المسؤول</label>
              <input
                type="text"
                value={settingsForm.responsibleName}
                onChange={(e) => setSettingsForm({ ...settingsForm, responsibleName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف</label>
              <input
                type="text"
                value={settingsForm.phone}
                onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">العنوان التفصيلي</label>
              <input
                type="text"
                value={settingsForm.address}
                onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                required
              />
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-sm"
            >
              حفظ التعديلات
            </button>
          </form>
        </div>
      )}

      {/* SAMPLE SCANNER MODAL */}
      {showScanner && (
        <SampleScannerModal
          labId={lab.uid}
          onClose={() => setShowScanner(false)}
          onShowToast={onShowToast}
        />
      )}

      {/* ADD/EDIT TEST MODAL */}
      {showAddTestModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-extrabold text-sm">{editingTest ? 'تعديل بيانات فحص' : 'إضافة تحليل جديد للدليل'}</h3>
              <button onClick={() => setShowAddTestModal(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTest} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم التحليل *</label>
                <input
                  type="text"
                  value={testForm.name}
                  onChange={(e) => setTestForm({ ...testForm, name: e.target.value })}
                  placeholder="مثال: صورة دم كاملة (CBC)"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">السعر (ج.م) *</label>
                  <input
                    type="number"
                    value={testForm.price}
                    onChange={(e) => setTestForm({ ...testForm, price: parseInt(e.target.value) || 0 })}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نوع العينة</label>
                  <input
                    type="text"
                    value={testForm.sampleType}
                    onChange={(e) => setTestForm({ ...testForm, sampleType: e.target.value })}
                    placeholder="دم وريدي / بول"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">تعليمات المريض وقواعد الصيام</label>
                <textarea
                  value={testForm.patientInstructions}
                  onChange={(e) => setTestForm({ ...testForm, patientInstructions: e.target.value })}
                  placeholder="تعليمات خاصة قبل إجراء التحليل..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  rows={2}
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-sm"
              >
                حفظ التحليل
              </button>
            </form>
          </div>
        </div>
      )}

      {/* FINANCE TRANSACTION MODAL */}
      {showAddTxModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-extrabold text-sm">تسجيل معاملة مالية جديدة</h3>
              <button onClick={() => setShowAddTxModal(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">نوع المعاملة</label>
                <select
                  value={txForm.type}
                  onChange={(e) => setTxForm({ ...txForm, type: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  <option value="EXPENSE">مصروفات (Expense)</option>
                  <option value="REVENUE">إيرادات إضافية (Revenue)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">عنوان المعاملة *</label>
                <input
                  type="text"
                  value={txForm.title}
                  onChange={(e) => setTxForm({ ...txForm, title: e.target.value })}
                  placeholder="شراء أنابيب واختبارات معملية"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">المبلغ (ج.م) *</label>
                <input
                  type="number"
                  value={txForm.amount}
                  onChange={(e) => setTxForm({ ...txForm, amount: parseFloat(e.target.value) || 0 })}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-sm"
              >
                تسجيل المعاملة
              </button>
            </form>
          </div>
        </div>
      )}

      {/* REPORT PDF MODAL */}
      {showPDFModalForOrder && (
        <LabPDFReportModal
          lab={lab}
          order={showPDFModalForOrder}
          results={orderResults}
          onClose={() => setShowPDFModalForOrder(null)}
        />
      )}

    </div>
  );
};
