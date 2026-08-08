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
  Sparkles,
  UserCheck,
  ShieldCheck,
  Info,
  Star
} from 'lucide-react';
import { DoctorProfile } from '../types';
import { getAllDoctors, formatPhoneNumberForUrl } from '../services/firebaseService';

interface DoctorsDirectoryProps {
  onSelectDoctorClinic: (doctorId: string) => void;
  onBookTurn: (doctorId: string) => void;
  onShowToast: (title: string, message?: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const DoctorsDirectory: React.FC<DoctorsDirectoryProps> = ({
  onSelectDoctorClinic,
  onBookTurn,
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      
      {/* Header Title Section */}
      <header className="text-center max-w-3xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-50 border border-sky-200/80 text-sky-700 font-bold text-xs mb-3">
          <Stethoscope className="w-4 h-4 text-sky-600" />
          <span>الدليل الطبي الذكي</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-slate-900 font-['Tajawal',sans-serif] tracking-tight">
          دوري — نظام إدارة العيادات وحجز المواعيد وتتبع أدوار المرضى
        </h1>
        <p className="text-slate-600 text-xs sm:text-sm mt-2 leading-relaxed">
          ابحث عن أفضل الأطباء والعيادات التخصصية، تواصل مباشرة وحجز دورك في الطابور الرقمي المباشر عبر منصة دوري لإدارة العيادات وتنظيم مواعيد الأطباء.
        </p>
      </header>

      {/* Search & Filter Bar */}
      <section aria-label="البحث والفلترة" className="bg-white rounded-3xl p-4 sm:p-6 shadow-xl border border-slate-200/80 mb-10">
        <div className="flex flex-col md:flex-row items-center gap-4">
          
          {/* Text Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-5 h-5 text-slate-400 absolute right-4 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم الطبيب، التخصص، أو العيادة..."
              className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-500 transition"
            />
          </div>

          {/* City Filter Pills */}
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setSelectedCity('all')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap ${
                selectedCity === 'all'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              جميع المدن ({doctors.length})
            </button>
            {cities.map((city) => (
              <button
                key={city}
                onClick={() => setSelectedCity(city)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap ${
                  selectedCity === city
                    ? 'bg-sky-600 text-white shadow-md'
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
          <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500 font-semibold text-xs">جاري تحميل دليل الأطباء والعيادات...</p>
        </div>
      ) : filteredDoctors.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 max-w-md mx-auto">
          <Stethoscope className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-base mb-1">لم نتمكن من العثور على أطباء مطابقتين</h3>
          <p className="text-xs text-slate-500 mb-4">جرب البحث بكلمة مختلفة أو اختر "جميع المدن"</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCity('all');
            }}
            className="px-5 py-2 bg-sky-600 text-white rounded-xl text-xs font-bold"
          >
            إعادة ضبط البحث
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group relative overflow-hidden"
              >
                <div>
                  
                  {/* Top Doctor Avatar & Specialty */}
                  <div className="flex items-start gap-4 mb-4">
                    {doc.photoUrl ? (
                      <img
                        src={doc.photoUrl}
                        alt={doc.name}
                        className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-100 shadow-sm shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-600 to-teal-600 text-white flex items-center justify-center font-black text-2xl shadow-md shrink-0">
                        {doc.name ? doc.name.replace("د.", "").trim().charAt(0) : "ط"}
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-block px-2.5 py-0.5 bg-sky-50 text-sky-700 font-bold text-[11px] rounded-full border border-sky-100">
                          {doc.specialty}
                        </span>

                        {doc.ratingAverage && doc.ratingAverage > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-900 font-extrabold text-[11px] rounded-full border border-amber-200">
                            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                            <span>{doc.ratingAverage}</span>
                            <span className="text-slate-400 font-normal">({doc.ratingCount})</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 text-slate-500 font-bold text-[10px] rounded-full border border-slate-200">
                            <Star className="w-3 h-3 text-slate-400" />
                            <span>جديد</span>
                          </span>
                        )}
                      </div>

                      <h3 className="font-extrabold text-slate-900 text-base font-['Tajawal',sans-serif] group-hover:text-sky-600 transition">
                        {doc.name}
                      </h3>
                      <p className="text-xs text-slate-600 font-medium flex items-center gap-1">
                        <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{doc.clinicName}</span>
                      </p>
                    </div>
                  </div>

                  {/* City / Address */}
                  <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mb-4 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                    <span className="truncate">{doc.city ? `${doc.city} - ${doc.address}` : doc.address}</span>
                  </div>

                  {/* Working Hours Badge */}
                  {doc.workHours && (
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mb-4 px-1">
                      <Calendar className="w-3.5 h-3.5 text-amber-500" />
                      <span>ساعات العمل: {doc.workHours.open} - {doc.workHours.close}</span>
                    </div>
                  )}

                </div>

                {/* Bottom Action Buttons */}
                <div className="pt-4 border-t border-slate-100 space-y-2">
                  
                  {/* Primary Row: View Clinic & Book Turn */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => onSelectDoctorClinic(doc.uid)}
                      className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-600" />
                      <span>عرض العيادة</span>
                    </button>

                    <button
                      onClick={() => onBookTurn(doc.uid)}
                      className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs rounded-xl transition shadow-md shadow-sky-600/20 flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>حجز دور</span>
                    </button>
                  </div>

                  {/* Direct Contact Buttons (Phone & WhatsApp) - Strictly displayed if doctor added them */}
                  {(hasPhone || hasWhatsapp) ? (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {hasPhone ? (
                        <a
                          href={`tel:${cleanPhone}`}
                          className="py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[11px] font-extrabold transition flex items-center justify-center gap-1 text-center"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>اتصل بالطبيب</span>
                        </a>
                      ) : (
                        <div className="py-2 bg-slate-50 text-slate-400 rounded-xl text-[11px] font-medium text-center border border-dashed border-slate-200">
                          الهاتف غير مضاف
                        </div>
                      )}

                      {hasWhatsapp ? (
                        <a
                          href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(`مرحبًا دكتور ${doc.name}، أريد الاستفسار عن المواعيد.`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[11px] font-extrabold transition flex items-center justify-center gap-1 text-center"
                        >
                          <MessageCircle className="w-3.5 h-3.5 fill-current" />
                          <span>واتساب</span>
                        </a>
                      ) : (
                        <div className="py-2 bg-slate-50 text-slate-400 rounded-xl text-[11px] font-medium text-center border border-dashed border-slate-200">
                          الواتساب غير مضاف
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 text-center pt-1">
                      * يضيف الطبيب رقم هاتف التواصل من لوحة تحكمه
                    </p>
                  )}

                </div>

              </div>
            );
          })}
        </div>
      )}
      </section>

      {/* Admin General Platform Phone Footer Banner */}
      <section aria-label="الانضمام لمنصة دوري" className="mt-12 p-6 bg-slate-900 text-white rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-800">
        <div className="text-right">
          <h2 className="font-bold text-sm text-sky-300 font-['Tajawal',sans-serif]">
            هل أنت طبيب وتريد الانضمام لدليل منصة دوري؟
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            سجل عيادتك مجاناً واستمتع بنظام حجز وإدارة طابور الانتظار المباشر.
          </p>
        </div>
        <a
          href="https://wa.me/201032120351?text=%D9%85%D8%B1%D8%AD%D8%A8%D9%8B%D8%A7%D9%8B%D8%8C%20%D8%A3%D8%B1%D9%8A%D8%AF%20%D8%A5%D8%B6%D8%A7%D9%81%D8%A9%20%D8%B9%D9%8A%D8%A7%D8%AF%D8%AA%D9%8A%20%D8%A5%D9%84%D9%89%20%D8%AF%D9%84%D9%8A%D9%84%20%D8%A3%D8%B0%D9%83%D9%8A%D8%A7%D8%A1%20%D8%AF%D9%88%D8%B1%D9%8A"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black transition shadow-lg shrink-0"
        >
          <MessageCircle className="w-4 h-4 fill-current" />
          <span>تواصل مع الإدارة (01032120351)</span>
        </a>
      </section>

    </div>
  );
};
