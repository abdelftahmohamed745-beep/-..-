import React, { useState, useEffect } from 'react';
import {
  Search,
  Stethoscope,
  Building,
  MapPin,
  Phone,
  MessageCircle,
  Eye,
  Calendar,
  ShieldCheck,
  Star,
  TestTube,
  ArrowLeft,
  Users,
  CheckCircle2,
  Clock,
  UserPlus,
  X
} from 'lucide-react';
import { DoctorProfile } from '../types';
import { getAllDoctors, formatPhoneNumberForUrl } from '../services/firebaseService';
import { CustomWebsiteSection } from './CustomWebsiteSection';

interface DoctorsDirectoryProps {
  onSelectDoctorClinic: (doctorId: string) => void;
  onBookTurn: (doctorId: string) => void;
  onNavigateAuth: (accountType?: 'doctor' | 'laboratory') => void;
  onShowToast: (title: string, message?: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const DoctorsDirectory: React.FC<DoctorsDirectoryProps> = ({
  onSelectDoctorClinic,
  onBookTurn,
  onNavigateAuth,
  onShowToast
}) => {
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadDirectory() {
      setLoading(true);
      const list = await getAllDoctors();

      if (isMounted) {
        setDoctors(list);
        setLoading(false);
      }
    }
    loadDirectory();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter doctors by search query and city
  const filteredDoctors = doctors.filter((doc) => {
    const query = searchQuery.trim().toLowerCase();
    const nameMatch = doc.name?.toLowerCase().includes(query);
    const specMatch = doc.specialty?.toLowerCase().includes(query);
    const clinicMatch = doc.clinicName?.toLowerCase().includes(query);
    const cityMatch = doc.city?.toLowerCase().includes(query) || doc.address?.toLowerCase().includes(query);

    const matchesSearch = !query || nameMatch || specMatch || clinicMatch || cityMatch;
    const matchesCity = selectedCity === 'all' || doc.city === selectedCity || doc.address?.includes(selectedCity);

    return matchesSearch && matchesCity;
  });

  // Extract unique cities
  const cities = Array.from(
    new Set(doctors.map((d) => d.city || d.address?.split('،')[0] || 'بغداد').filter(Boolean))
  );

  const handleScrollToSearch = () => {
    const el = document.getElementById('directory');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
    setTimeout(() => {
      const input = document.getElementById('search-input');
      if (input) {
        input.focus();
      }
    }, 300);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10 font-['Tajawal',sans-serif]">
      
      {/* Hero Header Section */}
      <header className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-teal-50 border border-teal-200/80 text-teal-800 font-bold text-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-700" />
          <span>المنصة الطبية لتنظيم العيادات والمعامل الطبية</span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-snug">
          دوري — النظام الذكي للعيادات والمختبرات الطبية
        </h1>

        <p className="text-slate-600 text-xs sm:text-sm leading-relaxed max-w-2xl mx-auto font-medium">
          نظام متكامل لتنظيم طابور الانتظار المباشر، إدارة حجز المواعيد، وسجلات الفحوصات والنتائج الطبية بكل دقة وأمان.
        </p>

        {/* Hero Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={() => onNavigateAuth('doctor')}
            className="px-5 py-3 bg-teal-800 hover:bg-teal-900 active:scale-[0.98] text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-2xs flex items-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>تسجيل عيادة أو معمل مجاناً</span>
          </button>

          <button
            onClick={handleScrollToSearch}
            className="px-5 py-3 bg-white hover:bg-slate-100 active:scale-[0.98] text-slate-800 font-bold text-xs sm:text-sm rounded-xl transition-all border border-slate-200/90 shadow-2xs flex items-center gap-2 cursor-pointer"
          >
            <Search className="w-4 h-4 text-slate-500" />
            <span>البحث عن العيادات والمختبرات</span>
          </button>
        </div>
      </header>

      {/* Account Type Portals */}
      <section aria-label="بوابات الدخول والتسجيل" className="grid md:grid-cols-2 gap-5">
        
        {/* Doctor Portal Card */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs hover:border-teal-500/40 hover:shadow-xs transition duration-150 flex flex-col justify-between group">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center font-bold border border-teal-100/80">
                <Stethoscope className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-100">
                للأطباء والعيادات
              </span>
            </div>

            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-teal-800 transition">
                إدارة العيادة وطابور الانتظار
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed mt-1">
                تتبع حركة المرضى في الوقت الفعلي، إرسال إشعارات الدور التلقائية، وعرض الشاشة التفاعلية للتلفزيون.
              </p>
            </div>

            <ul className="text-xs text-slate-600 space-y-1.5 pt-1">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                <span>طابور رقمي مباشر مع تنبيهات صويتة</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                <span>حجز المواعيد المسبقة والكشوفات اليومية</span>
              </li>
            </ul>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100">
            <button
              onClick={() => onNavigateAuth('doctor')}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
            >
              <span>دخول / إنشاء حساب عيادة</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Laboratory Portal Card */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs hover:border-emerald-500/40 hover:shadow-xs transition duration-150 flex flex-col justify-between group">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold border border-emerald-100/80">
                <TestTube className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                لمعامل التحاليل (Dory Labs)
              </span>
            </div>

            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-emerald-800 transition">
                إدارة الفحوصات والتقارير المخبرية
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed mt-1">
                إدارة الفحوصات والطلبات، طباعة الباركود، إدخال النتائج، وإصدار تقارير PDF موثقة بشفرة QR.
              </p>
            </div>

            <ul className="text-xs text-slate-600 space-y-1.5 pt-1">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>تتبع حالة العينة ومراحل التحليل</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>تقارير PDF طبية موثقة مع مشاركة سريعة</span>
              </li>
            </ul>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100">
            <button
              onClick={() => onNavigateAuth('laboratory')}
              className="w-full py-2.5 bg-teal-800 hover:bg-teal-900 active:scale-[0.98] text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
            >
              <span>دخول / إنشاء حساب معمل</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </section>

      {/* Directory Section Anchor */}
      <div id="directory" className="pt-4">
        
        {/* Search & Filter Bar */}
        <section aria-label="البحث والفلترة" className="bg-white rounded-2xl p-4 shadow-2xs border border-slate-200/80 mb-6">
          <div className="flex flex-col md:flex-row items-center gap-3">
            
            {/* Text Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
              <input
                id="search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث باسم الطبيب، التخصص، العيادة، أو المدينة..."
                className="w-full pl-8 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-700 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-3 text-slate-400 hover:text-slate-600 transition"
                  title="مسح البحث"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* City Filter Pills */}
            <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              <button
                onClick={() => setSelectedCity('all')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer active:scale-95 ${
                  selectedCity === 'all'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                جميع المدن ({doctors.length})
              </button>
              {cities.map((city) => (
                <button
                  key={city}
                  onClick={() => setSelectedCity(city)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer active:scale-95 ${
                    selectedCity === city
                      ? 'bg-teal-800 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>

          </div>
        </section>

        {/* Doctor Cards Grid */}
        <section aria-label="قائمة الأطباء والعيادات">
          {loading ? (
            <div className="py-16 text-center">
              <div className="w-8 h-8 border-3 border-teal-700 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-slate-500 font-semibold text-xs">جاري تحميل دليل الأطباء والعيادات...</p>
            </div>
          ) : filteredDoctors.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200/90 max-w-md mx-auto shadow-2xs">
              <Stethoscope className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-slate-800 text-sm mb-1">لم نتمكن من العثور على نتائج مطابقة</h3>
              <p className="text-xs text-slate-500 mb-4">جرب البحث بكلمة أخرى أو اختيار جميع المدن</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCity('all');
                }}
                className="px-4 py-2 bg-teal-800 text-white rounded-xl text-xs font-bold cursor-pointer active:scale-95 transition"
              >
                إعادة ضبط البحث
              </button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredDoctors.map((doc) => {
                const rawPhone = doc.phone ? doc.phone.trim() : "";
                const rawWhatsapp = doc.whatsappNumber ? doc.whatsappNumber.trim() : rawPhone;

                const cleanPhone = formatPhoneNumberForUrl(rawPhone);
                const cleanWhatsapp = formatPhoneNumberForUrl(rawWhatsapp);

                const hasPhone = Boolean(cleanPhone && cleanPhone.length > 5);
                const hasWhatsapp = Boolean(cleanWhatsapp && cleanWhatsapp.length > 5);

                return (
                  <div
                    key={doc.uid}
                    className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs hover:shadow-xs hover:border-slate-300 transition duration-150 flex flex-col justify-between group relative"
                  >
                    <div>
                      
                      {/* Top Doctor Avatar & Specialty */}
                      <div className="flex items-start gap-3 mb-3.5">
                        {doc.photoUrl ? (
                          <img
                            src={doc.photoUrl}
                            alt={doc.name}
                            className="w-14 h-14 rounded-xl object-cover border border-slate-200 shadow-2xs shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-teal-800 text-white flex items-center justify-center font-bold text-xl shadow-2xs shrink-0">
                            {doc.name ? doc.name.replace("د.", "").trim().charAt(0) : "ط"}
                          </div>
                        )}

                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-block px-2 py-0.5 bg-teal-50 text-teal-800 font-bold text-[11px] rounded-full border border-teal-100">
                              {doc.specialty}
                            </span>

                            {doc.ratingAverage && doc.ratingAverage > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-900 font-bold text-[11px] rounded-full border border-amber-200">
                                <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                                <span>{doc.ratingAverage}</span>
                                <span className="text-slate-400 font-normal">({doc.ratingCount})</span>
                              </span>
                            ) : null}
                          </div>

                          <h3 className="font-bold text-slate-900 text-sm sm:text-base font-['Tajawal',sans-serif] group-hover:text-teal-800 transition truncate">
                            {doc.name}
                          </h3>
                          <p className="text-xs text-slate-600 font-medium flex items-center gap-1">
                            <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{doc.clinicName}</span>
                          </p>
                        </div>
                      </div>

                      {/* City / Address */}
                      <div className="text-xs text-slate-600 font-medium flex items-center gap-1.5 mb-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{doc.city ? `${doc.city} - ${doc.address}` : doc.address}</span>
                      </div>

                      {/* Working Hours Badge */}
                      {doc.workHours && (
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mb-3 px-0.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>ساعات العمل: {doc.workHours.open} - {doc.workHours.close}</span>
                        </div>
                      )}

                    </div>

                    {/* Bottom Action Buttons */}
                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      
                      {/* Primary Row: View Clinic & Book Turn */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => onSelectDoctorClinic(doc.uid)}
                          className="w-full py-2 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-800 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-600" />
                          <span>عرض العيادة</span>
                        </button>

                        <button
                          onClick={() => onBookTurn(doc.uid)}
                          className="w-full py-2 bg-teal-800 hover:bg-teal-900 active:scale-[0.98] text-white font-bold text-xs rounded-xl transition shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>حجز دور</span>
                        </button>
                      </div>

                      {/* Direct Contact Buttons (Phone & WhatsApp) */}
                      {(hasPhone || hasWhatsapp) ? (
                        <div className="grid grid-cols-2 gap-2 pt-0.5">
                          {hasPhone ? (
                            <a
                              href={`tel:${cleanPhone}`}
                              className="py-1.5 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 text-center"
                            >
                              <Phone className="w-3 h-3" />
                              <span>اتصال</span>
                            </a>
                          ) : (
                            <div className="py-1.5 bg-slate-50 text-slate-400 rounded-xl text-[11px] font-medium text-center border border-dashed border-slate-200">
                              الهاتف غير مضاف
                            </div>
                          )}

                          {hasWhatsapp ? (
                            <a
                              href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(`مرحبًا دكتور ${doc.name}، أريد الاستفسار عن المواعيد.`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="py-1.5 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 text-center"
                            >
                              <MessageCircle className="w-3 h-3 fill-current" />
                              <span>واتساب</span>
                            </a>
                          ) : (
                            <div className="py-1.5 bg-slate-50 text-slate-400 rounded-xl text-[11px] font-medium text-center border border-dashed border-slate-200">
                              الواتساب غير مضاف
                            </div>
                          )}
                        </div>
                      ) : null}

                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>

      {/* Standalone Section: Custom Website Offer */}
      <CustomWebsiteSection />

    </div>
  );
};
