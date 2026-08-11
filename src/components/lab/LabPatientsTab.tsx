import React, { useState } from 'react';
import { LabOrder } from '../../types';
import { Search, Users, Phone, Calendar, ShoppingBag, FileText, ChevronLeft } from 'lucide-react';

interface LabPatientsTabProps {
  orders: LabOrder[];
  onViewOrder: (order: LabOrder) => void;
}

export const LabPatientsTab: React.FC<LabPatientsTabProps> = ({ orders, onViewOrder }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Group orders by patient phone/name
  const patientsMap = new Map<string, { name: string; phone: string; orders: LabOrder[] }>();

  orders.forEach((o) => {
    const key = o.patientPhone || o.patientName;
    if (!patientsMap.has(key)) {
      patientsMap.set(key, { name: o.patientName, phone: o.patientPhone, orders: [] });
    }
    patientsMap.get(key)!.orders.push(o);
  });

  const patientList = Array.from(patientsMap.values()).filter(
    (p) =>
      !searchTerm.trim() ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-5">
      
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900 font-['Tajawal',sans-serif]">سجل المرضى وتاريخ التحاليل</h1>
          <p className="text-xs text-slate-500">إجمالي المرضى المسجلين بالمعمل: {patientList.length} مريض</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ابحث باسم المريض أو رقم الهاتف..."
            className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {patientList.map((patient, idx) => (
          <div key={idx} className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs">
                  <Users className="w-4 h-4 text-teal-600" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 font-['Tajawal',sans-serif]">{patient.name}</h3>
                  <p className="text-[11px] text-slate-500 font-mono">{patient.phone}</p>
                </div>
              </div>
              <span className="bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
                {patient.orders.length} طلبات
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <p className="font-bold text-slate-700 text-[11px]">أحدث الفحوصات:</p>
              {patient.orders.slice(0, 3).map((ord) => (
                <div key={ord.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-slate-800">
                  <span className="font-mono font-bold text-[11px] text-teal-800">{ord.orderNumber}</span>
                  <span className="truncate max-w-[150px] text-slate-600">{ord.testNames.join('، ')}</span>
                  <button
                    onClick={() => onViewOrder(ord)}
                    className="text-[10px] font-bold text-teal-700 hover:text-teal-900"
                  >
                    عرض
                  </button>
                </div>
              ))}
            </div>

          </div>
        ))}

        {patientList.length === 0 && (
          <div className="col-span-full bg-white rounded-xl p-12 text-center text-slate-400 font-semibold border border-slate-200">
            لا يوجد مرضى مطبقين للبحث
          </div>
        )}
      </div>

    </div>
  );
};
