import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Printer, Download, Copy, Check, QrCode, Smartphone } from 'lucide-react';
import { DoctorProfile } from '../types';

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctor: DoctorProfile;
  onCopyLink: () => void;
}

export const QRModal: React.FC<QRModalProps> = ({
  isOpen,
  onClose,
  doctor,
  onCopyLink
}) => {
  const [copied, setCopied] = React.useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const bookingUrl = `${window.location.origin}/clinic/${doctor.uid}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(bookingUrl);
    setCopied(true);
    onCopyLink();
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPNG = () => {
    const svgElement = qrRef.current?.querySelector('svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = 1000;
      canvas.height = 1000;
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 100, 100, 800, 800);
        
        const pngUrl = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        downloadLink.download = `QR-Dawry-${doctor.name.replace(/\s+/g, '-')}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 text-center animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex justify-center mb-3">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <QrCode className="w-6 h-6" />
          </div>
        </div>

        <h3 className="text-xl font-bold text-slate-900 font-['Tajawal',sans-serif]">
          رمز QR الخاص بالعيادة
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          اطبع هذا الرمز وضعه في صالة الانتظار ليتمكن المرضى من مسحه وحجز دورهم فورًا
        </p>

        {/* Printable Poster Container */}
        <div className="mt-6 p-6 bg-gradient-to-b from-slate-50 to-sky-50/50 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col items-center" id="printable-qr-poster">
          
          <div className="text-xs font-bold text-sky-600 uppercase tracking-widest mb-1">
            نظام دوري لحجز الأدوار
          </div>
          <div className="font-extrabold text-lg text-slate-900 font-['Tajawal',sans-serif]">
            {doctor.clinicName}
          </div>
          <div className="text-xs font-semibold text-slate-600 mb-4">
            {doctor.name} - {doctor.specialty}
          </div>

          {/* QR Code Graphic */}
          <div ref={qrRef} className="p-4 bg-white rounded-2xl shadow-md border border-slate-100">
            <QRCodeSVG
              value={bookingUrl}
              size={220}
              level="H"
              includeMargin={true}
            />
          </div>

          <div className="mt-4 text-xs font-bold text-slate-800 bg-white px-4 py-1.5 rounded-full border border-slate-200 shadow-2xs flex items-center gap-1.5 justify-center">
            <Smartphone className="w-4 h-4 text-sky-600" />
            <span>امسح الرمز بموبايلك لحجز دورك مباشرة</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm rounded-xl transition shadow-xs"
            >
              <Printer className="w-4 h-4 text-sky-400" />
              <span>طباعة الرمز</span>
            </button>

            <button
              onClick={handleDownloadPNG}
              className="flex items-center justify-center gap-2 py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs sm:text-sm rounded-xl transition shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>تحميل صورة PNG</span>
            </button>
          </div>

          {/* Copy Direct Link */}
          <button
            onClick={handleCopy}
            className="w-full flex items-center justify-between py-2.5 px-4 bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-medium text-xs rounded-xl transition"
          >
            <span className="truncate max-w-[240px] dir-ltr text-slate-500 font-mono text-[11px]">
              {bookingUrl}
            </span>
            <div className="flex items-center gap-1.5 shrink-0 text-sky-700 font-semibold">
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'تم النسخ' : 'نسخ الرابط'}</span>
            </div>
          </button>
        </div>

      </div>
    </div>
  );
};
