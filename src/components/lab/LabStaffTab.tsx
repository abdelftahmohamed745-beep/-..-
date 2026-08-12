import React, { useState, useEffect } from 'react';
import { LabStaffMember, LabRole } from '../../types';
import { getLabStaff, addLabStaffMember } from '../../services/labService';
import {
  Users,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Phone,
  Mail,
  Search,
  UserCheck
} from 'lucide-react';

interface LabStaffTabProps {
  labId: string;
  onShowToast: (title: string, message?: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

const ROLE_LABELS: Record<LabRole, { label: string; badge: string }> = {
  OWNER: { label: 'مالك المختبر', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
  MANAGER: { label: 'مدير المختبر', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  REVIEWER: { label: 'طبيب معتمد / استشاري', badge: 'bg-teal-50 text-teal-700 border-teal-200' },
  TECHNICIAN: { label: 'أخصائي / فني مختبر', badge: 'bg-sky-50 text-sky-700 border-sky-200' },
  RECEPTION: { label: 'موظف استقبال وتجميع', badge: 'bg-amber-50 text-amber-700 border-amber-200' }
};

export const LabStaffTab: React.FC<LabStaffTabProps> = ({ labId, onShowToast }) => {
  const [staffList, setStaffList] = useState<LabStaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<LabRole>('TECHNICIAN');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchStaff();
  }, [labId]);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const list = await getLabStaff(labId);
      setStaffList(list);
    } catch (err) {
      console.error("Error fetching staff:", err);
      onShowToast("خطأ", "تعذر تحميل قائمة الموظفين", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !email.trim()) {
      onShowToast("تنبيه", "يرجى إدخال اسم الموظف والبريد الإلكتروني", "warning");
      return;
    }

    setSubmitting(true);
    try {
      await addLabStaffMember(labId, {
        uid: `staff_${Date.now()}`,
        displayName: displayName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        role,
        status: 'active'
      });
      onShowToast("نجاح", "تم إضافة عضو الفريق بنجاح", "success");
      setShowAddModal(false);
      setDisplayName('');
      setEmail('');
      setPhone('');
      setRole('TECHNICIAN');
      fetchStaff();
    } catch (err) {
      console.error("Error adding staff:", err);
      onShowToast("خطأ", "فشل إضافة عضو الفريق", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredStaff = staffList.filter((s) =>
    s.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.phone && s.phone.includes(searchQuery))
  );

  const activeCount = staffList.filter((s) => s.status === 'active').length;
  const reviewersCount = staffList.filter((s) => s.role === 'REVIEWER' || s.role === 'OWNER').length;
  const techniciansCount = staffList.filter((s) => s.role === 'TECHNICIAN').length;

  return (
    <div className="space-y-6">
      
      {/* Header & Section Clarification */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-600" />
            <h1 className="text-xl font-extrabold text-slate-900 font-['Tajawal',sans-serif]">
              إدارة الكادر والموظفين
            </h1>
            <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {staffList.length} موظف
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            إدارة أفراد الفريق الطبي والفني في المختبر وتوزيع الصلاحيات (المدير الطبي، الأخصائيين، وفني السحب)
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-2 shadow-2xs"
        >
          <UserPlus className="w-4 h-4" />
          <span>إضافة موظف جديد</span>
        </button>
      </div>

      {/* Operational Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">الكادر النشط</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{activeCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">موظف يعملون حالياً</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">الأطباء والاستشاريون</span>
            <ShieldCheck className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{reviewersCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">معتمدو نتائج التحاليل</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">فنيو المختبر والسحب</span>
            <Users className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{techniciansCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">معالجة العينات والفحوصات</p>
        </div>
      </div>

      {/* Staff List Table Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        
        {/* Search Bar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالاسم، البريد، أو الهاتف..."
              className="w-full pl-3 pr-9 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Table View */}
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500 font-bold">
            جاري تحميل قائمة الموظفين...
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            {searchQuery ? "لا توجد نتائج تطابق بحثك" : "لا يوجد موظفون مسجلون حالياً. انقر على 'إضافة موظف جديد' للبدء."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">اسم الموظف</th>
                  <th className="px-4 py-3">المسمى الوظيفي والدور</th>
                  <th className="px-4 py-3">معلومات الاتصال</th>
                  <th className="px-4 py-3">الحالة التشغيلية</th>
                  <th className="px-4 py-3">تاريخ الإضافة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                {filteredStaff.map((member) => {
                  const roleConfig = ROLE_LABELS[member.role] || { label: member.role, badge: 'bg-slate-100 text-slate-700' };
                  return (
                    <tr key={member.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs">
                            {member.displayName.charAt(0)}
                          </div>
                          <span className="font-extrabold text-slate-900">{member.displayName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-bold border ${roleConfig.badge}`}>
                          {roleConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span>{member.email}</span>
                          </div>
                          {member.phone && (
                            <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              <span>{member.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {member.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[11px] font-bold border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>نشط</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full text-[11px] font-bold border border-rose-200">
                            <XCircle className="w-3 h-3" />
                            <span>غير نشط</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500 dir-ltr text-right">
                        {new Date(member.createdAt).toLocaleDateString('ar-EG')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-right space-y-4">
            <h2 className="text-base font-extrabold text-slate-900">إضافة عضو فريق جديد</h2>
            
            <form onSubmit={handleAddStaff} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">الاسم الكامل *</label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="د. محمد علي"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">البريد الإلكتروني *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="doctor@dory.app"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">رقم الهاتف</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01012345678"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">الدور والصلاحية *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as LabRole)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium focus:ring-2 focus:ring-teal-500"
                >
                  <option value="REVIEWER">طبيب معتمد / استشاري (مراجعة واعتتماد النتائج)</option>
                  <option value="TECHNICIAN">أخصائي / فني مختبر (معالجة وإدخال نتائج)</option>
                  <option value="RECEPTION">موظف استقبال وتجميع عينات</option>
                  <option value="MANAGER">مدير تشغيلي للمختبر</option>
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
                  {submitting ? "جاري الحفظ..." : "حفظ الموظف"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
