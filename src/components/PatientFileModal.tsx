import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  User,
  Phone,
  Calendar,
  Clock,
  DollarSign,
  FileText,
  CheckCircle2,
  AlertCircle,
  Tag,
  Stethoscope,
  ChevronLeft,
  Search,
  Activity
} from 'lucide-react';
import { PatientMedicalFile, ClinicTransaction, PatientVisitEntry } from '../types';
import { getPatientMedicalFile, subscribeToClinicTransactions } from '../services/firebaseService';

interface PatientFileModalProps {
  doctorId: string;
  patientPhone: string;
  patientName: string;
  isOpen: boolean;
  onClose: () => void;
}

export const PatientFileModal: React.FC<PatientFileModalProps> = ({
  doctorId,
  patientPhone,
  patientName,
  isOpen,
  onClose
}) => {
  const [medicalFile, setMedicalFile] = useState<PatientMedicalFile | null>(null);
  const [transactions, setTransactions] = useState<ClinicTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !doctorId || !patientPhone) return;

    let isMounted = true;
    setLoading(true);

    async function loadData() {
      const file = await getPatientMedicalFile(doctorId, patientPhone);
      if (isMounted) {
        setMedicalFile(file);
        setLoading(false);
      }
    }

    loadData();

    const unsubTx = subscribeToClinicTransactions(doctorId, (txList) => {
      if (!isMounted) return;
      const cleanPhone = patientPhone.replace(/\D/g, '');
      const filtered = txList.filter(tx => tx.patientPhone?.replace(/\D/g, '') === cleanPhone);
      setTransactions(filtered);
    });

    return () => {
      isMounted = false;
      unsubTx();
    };
  }, [doctorId, patientPhone, isOpen]);

  if (!isOpen) return null;

  const visits: PatientVisitEntry[] = medicalFile?.visits || [];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs font-[#Tajawal] font-['Tajawal',sans-serif]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
        >
          {/* Header */}
          <div className="bg-[#143d30] text-white p-6 relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/10 text-emerald-300 flex items-center justify-center font-bold text-lg border border-white/20">
                <User className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-extrabold text-white">
                    {medicalFile?.patientName || patientName}
                  </h2>
                  {medicalFile?.patientId && (
                    <span className="px-2 py-0.5 bg-emerald-950/80 text-emerald-300 text-[10px] font-mono font-bold rounded-md border border-emerald-500/30">
                      {medicalFile.patientId}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-emerald-200 mt-0.5 dir-ltr">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{patientPhone}</span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            
            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200/80 text-center">
                <span className="text-[11px] text-emerald-800 font-bold block">إجمالي الزيارات</span>
                <span className="text-2xl font-black text-emerald-950 font-mono mt-1 block">
                  {visits.length || 1}
                </span>
              </div>

              <div className="bg-sky-50 p-4 rounded-2xl border border-sky-200/80 text-center">
                <span className="text-[11px] text-sky-800 font-bold block">آخر زيارة</span>
                <span className="text-xs font-bold text-sky-950 mt-1 block">
                  {medicalFile?.lastVisitDate || 'اليوم'}
                </span>
              </div>

              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200/80 text-center">
                <span className="text-[11px] text-amber-800 font-bold block">المستحقات المعلقة</span>
                <span className="text-xs font-black text-amber-950 font-mono mt-1 block">
                  {transactions.reduce((acc, t) => acc + (t.remainingAmount || 0), 0)} جنيه
                </span>
              </div>
            </div>

            {/* Visit Timeline Section */}
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-700" />
                <span>سجل الزيارات والحجوزات (Timeline)</span>
              </h3>

              {loading ? (
                <div className="py-8 text-center text-xs text-slate-400 space-y-2">
                  <div className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin mx-auto" />
                  <p>جاري تحميل السجل الطبي والمالي...</p>
                </div>
              ) : visits.length === 0 && transactions.length === 0 ? (
                <div className="bg-slate-50 border border-dashed border-slate-200 p-8 rounded-2xl text-center text-xs text-slate-500">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p>لا توجد زيارات سابقة مسجلة بهذا الهاتف حتى الآن.</p>
                </div>
              ) : (
                <div className="space-y-3 relative before:absolute before:right-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 pr-8">
                  {visits.map((visit, index) => {
                    const matchTx = transactions.find(t => t.createdAt?.startsWith(visit.date));
                    const price = visit.price || matchTx?.totalAmount || 200;
                    const paid = visit.paidAmount ?? matchTx?.paidAmount ?? price;
                    const remaining = visit.remainingAmount ?? matchTx?.remainingAmount ?? (price - paid);

                    return (
                      <div key={visit.id || index} className="relative bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-2">
                        {/* Timeline Node Icon */}
                        <div className="absolute -right-[33px] top-4 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] ring-4 ring-white font-bold">
                          {index + 1}
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="font-extrabold text-[#143d30]">
                            {visit.visitType || visit.serviceName || matchTx?.serviceName || 'كشف جديد'}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {visit.date}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500">القيمة:</span>
                            <span className="font-bold text-slate-900 font-mono">{price} جنيه</span>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-emerald-700 font-bold">المدفوع: {paid} ج</span>
                            {remaining > 0 ? (
                              <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-full">
                                متبقي: {remaining} ج
                              </span>
                            ) : (
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                مسدد بالكامل
                              </span>
                            )}
                          </div>
                        </div>

                        {visit.notes && (
                          <p className="text-xs text-slate-600 bg-white p-2 rounded-xl border border-slate-200/60 mt-1">
                            ملاحظات: {visit.notes}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 text-left">
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition cursor-pointer"
            >
              إغلاق الملف
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
