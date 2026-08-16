import React, { useState, useEffect } from 'react';
import { LabProfile, LabTestCatalogItem } from '../../types';
import { getLabProfile, getLabTests } from '../../services/labService';
import { setPageSeo, getLabSeoData, DEFAULT_HOMEPAGE_SEO } from '../../utils/seo';
import { LabOrderModal } from './LabOrderModal';
import { TestTube, Search, ShoppingBag, Clock, Home, Building2, MapPin, Phone, ShieldCheck, CheckCircle2, ChevronDown, ChevronUp, QrCode, ArrowRight } from 'lucide-react';

interface PublicLabPageProps {
  labId: string;
  onNavigateToResult?: (orderId: string) => void;
  onShowToast: (title: string, message?: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const PublicLabPage: React.FC<PublicLabPageProps> = ({
  labId,
  onNavigateToResult,
  onShowToast
}) => {
  const [lab, setLab] = useState<LabProfile | null>(null);
  const [tests, setTests] = useState<LabTestCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Test selection cart state
  const [selectedTests, setSelectedTests] = useState<LabTestCatalogItem[]>([]);
  const [showOrderModal, setShowOrderModal] = useState(false);

  // Accordion for instructions
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const labData = await getLabProfile(labId);
        if (isMounted) {
          setLab(labData);
          if (labData) {
            setPageSeo(getLabSeoData(labData));
          } else {
            setPageSeo({
              title: 'المعمل غير موجود | دوري',
              description: 'لم يتم العثور على معمل التحاليل المطلوب عبر منصة دوري.',
              canonicalUrl: `https://dory-system.vercel.app/lab/${labId}`,
              robots: 'noindex, nofollow'
            });
          }
        }

        const testList = await getLabTests(labId, true);
        if (isMounted) {
          setTests(testList);
        }
      } catch (err) {
        console.error("Error loading lab public page:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    loadData();

    return () => {
      isMounted = false;
      setPageSeo(DEFAULT_HOMEPAGE_SEO);
    };
  }, [labId]);

  const categories = Array.from(new Set(tests.map((t) => t.category).filter(Boolean))) as string[];

  const filteredTests = tests.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = selectedCategory === 'all' || t.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const toggleTestSelection = (testItem: LabTestCatalogItem) => {
    if (selectedTests.some((t) => t.id === testItem.id)) {
      setSelectedTests(selectedTests.filter((t) => t.id !== testItem.id));
    } else {
      setSelectedTests([...selectedTests, testItem]);
    }
  };

  const handleOrderSuccess = (orderId: string, orderNum: string) => {
    setShowOrderModal(false);
    setSelectedTests([]);
    if (onNavigateToResult) {
      onNavigateToResult(orderId);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="animate-spin w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-xs font-bold text-slate-600">جاري تحميل دليل تحاليل المعمل...</p>
      </div>
    );
  }

  if (!lab) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center bg-white rounded-3xl border border-slate-200 my-8 shadow-sm">
        <TestTube className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <h2 className="text-lg font-black text-slate-900 mb-1">المعمل غير موجود</h2>
        <p className="text-xs text-slate-500 mb-4">تأكد من الرابط أو الكود الذي قمت بفتحه.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      
      {/* Lab Hero Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {lab.logoUrl ? (
              <img src={lab.logoUrl} alt={lab.name} className="w-20 h-20 object-cover rounded-2xl border-2 border-teal-500 shadow-md" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center font-black text-3xl shadow-inner">
                {lab.name.slice(0, 2)}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 bg-teal-500/20 text-teal-300 font-bold text-[11px] rounded-md border border-teal-500/30">
                  معمل تحاليل معتمد
                </span>
                {lab.offersHomeCollection && (
                  <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 font-bold text-[11px] rounded-md border border-amber-500/30 flex items-center gap-1">
                    <Home className="w-3 h-3" />
                    <span>سحب من المنزل</span>
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white font-['Tajawal',sans-serif]">
                {lab.name}
              </h1>
              <p className="text-xs text-slate-300 mt-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span>{lab.address}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="bg-slate-800/80 px-4 py-2.5 rounded-2xl border border-slate-700/80 text-xs">
              <span className="text-slate-400 block text-[10px]">مواعيد العمل اليومية:</span>
              <span className="font-bold text-white font-mono">{lab.workHours.open} - {lab.workHours.close}</span>
            </div>
            <a
              href={`tel:${lab.phone}`}
              className="px-4 py-2.5 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs rounded-2xl flex items-center gap-2 transition shadow-md"
            >
              <Phone className="w-4 h-4" />
              <span className="font-mono">{lab.phone}</span>
            </a>
          </div>
        </div>
      </div>

      {/* Catalog & Search Section */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6">
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 font-['Tajawal',sans-serif]">
              دليل الفحوصات والتحاليل المتاحة
            </h2>
            <p className="text-xs text-slate-500">اختر التحاليل المطلوبة واطلبها مباشرة أونلاين</p>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم التحليل..."
              className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Category Tabs */}
        {categories.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              جميع التحاليل ({tests.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Test List Cards */}
        {filteredTests.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
            <TestTube className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-500">لا توجد تحاليل تطابق البحث.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTests.map((test) => {
              const isSelected = selectedTests.some((t) => t.id === test.id);
              const isExpanded = expandedTestId === test.id;

              return (
                <div
                  key={test.id}
                  className={`rounded-2xl p-4 border transition ${
                    isSelected
                      ? 'bg-teal-50/50 border-teal-500 shadow-md ring-1 ring-teal-500'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleTestSelection(test)}
                        className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition ${
                          isSelected
                            ? 'bg-teal-600 border-teal-600 text-white'
                            : 'bg-white border-slate-300 text-transparent hover:border-teal-500'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <div>
                        <h3 className="font-extrabold text-sm text-slate-900">{test.name}</h3>
                        {test.category && (
                          <span className="text-[10px] text-slate-500 font-bold block">{test.category}</span>
                        )}
                      </div>
                    </div>

                    <div className="text-left shrink-0">
                      <span className="font-mono font-black text-base text-teal-700">{test.price} ج.م</span>
                    </div>
                  </div>

                  {/* Badges Info */}
                  <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100 text-[11px]">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-bold">
                      نوع العينة: {test.sampleType}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md font-bold ${
                      test.requiresFasting ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'
                    }`}>
                      {test.requiresFasting ? `يتطلب صيام ${test.fastingHours || 8}h` : 'بدون صيام'}
                    </span>
                    <span className="px-2 py-0.5 bg-sky-50 text-sky-800 rounded-md font-bold">
                      تسليم النتيجة: {test.estimatedTurnaroundHours} ساعة
                    </span>
                  </div>

                  {/* Accordion Patient Instructions */}
                  {test.patientInstructions && (
                    <div className="mt-2">
                      <button
                        onClick={() => setExpandedTestId(isExpanded ? null : test.id)}
                        className="text-[11px] font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 transition"
                      >
                        <span>تعليمات الفحص للمريض</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                      {isExpanded && (
                        <p className="text-[11px] text-slate-600 mt-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
                          {test.patientInstructions}
                        </p>
                      )}
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Floating Bottom Cart Bar */}
      {selectedTests.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 max-w-2xl mx-auto z-40 bg-slate-900 text-white rounded-3xl p-4 shadow-2xl border border-slate-800 flex items-center justify-between gap-4 animate-bounce-subtle">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-teal-500 text-slate-950 font-black text-xs flex items-center justify-center">
                {selectedTests.length}
              </span>
              <span className="font-bold text-xs text-slate-200">فحوصات مختارة</span>
            </div>
            <span className="font-mono font-black text-lg text-teal-400">
              {selectedTests.reduce((s, i) => s + i.price, 0)} ج.م
            </span>
          </div>

          <button
            onClick={() => setShowOrderModal(true)}
            className="px-6 py-3 bg-teal-500 hover:bg-teal-600 text-slate-950 font-black text-xs rounded-2xl flex items-center gap-2 transition shadow-lg"
          >
            <span>اطلب التحاليل الآن</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Order Modal */}
      {showOrderModal && (
        <LabOrderModal
          lab={lab}
          selectedTests={selectedTests}
          onClose={() => setShowOrderModal(false)}
          onOrderSuccess={handleOrderSuccess}
          onShowToast={onShowToast}
        />
      )}

    </div>
  );
};
