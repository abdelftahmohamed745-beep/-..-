import React, { useState, useEffect } from 'react';
import { LabProfile, LabOrder, LabSample, LabTestCatalogItem, LabStaffMember, LabTransaction } from '../../types';
import {
  getLabProfile,
  subscribeToLabOrders,
  getLabSamples,
  getLabTests,
  getLabStaff,
  getLabTransactions
} from '../../services/labService';

import { LabHeader } from './LabHeader';
import { LabSidebar, LabTabType } from './LabSidebar';
import { LabOverviewTab } from './LabOverviewTab';
import { LabOrdersTab } from './LabOrdersTab';
import { LabSamplesTab } from './LabSamplesTab';
import { LabResultsTab } from './LabResultsTab';
import { LabPatientsTab } from './LabPatientsTab';
import { LabReportsTab } from './LabReportsTab';
import { LabCatalogTab } from './LabCatalogTab';
import { LabStaffTab } from './LabStaffTab';
import { LabFinancesTab } from './LabFinancesTab';
import { LabSettingsTab } from './LabSettingsTab';

import { LabOrderModal } from './LabOrderModal';
import { SampleScannerModal } from './SampleScannerModal';
import { LabPDFReportModal } from './LabPDFReportModal';

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
  const [activeTab, setActiveTab] = useState<LabTabType>('overview');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Essential Realtime Orders & Samples State
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [samples, setSamples] = useState<LabSample[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Lazy Loaded Collections State
  const [tests, setTests] = useState<LabTestCatalogItem[]>([]);
  const [testsLoaded, setTestsLoaded] = useState(false);

  const [staffList, setStaffList] = useState<LabStaffMember[]>([]);
  const [transactions, setTransactions] = useState<LabTransaction[]>([]);

  // Search & Modals State
  const [globalSearch, setGlobalSearch] = useState('');
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [selectedOrderForResults, setSelectedOrderForResults] = useState<LabOrder | null>(null);
  const [pdfReportOrder, setPdfReportOrder] = useState<LabOrder | null>(null);

  // 1. Realtime listener for Orders (limit 100)
  useEffect(() => {
    setLoadingOrders(true);
    const unsubscribe = subscribeToLabOrders(lab.uid, (data) => {
      setOrders(data);
      setLoadingOrders(false);
    });

    // Also fetch initial samples for quick dashboard counts
    getLabSamples(lab.uid)
      .then((s) => setSamples(s))
      .catch((err) => console.error("Error loading samples:", err));

    return () => unsubscribe();
  }, [lab.uid]);

  // 2. Lazy load Test Catalog when catalog or order modal opens
  useEffect(() => {
    if ((activeTab === 'catalog' || showNewOrderModal) && !testsLoaded) {
      getLabTests(lab.uid)
        .then((tList) => {
          setTests(tList);
          setTestsLoaded(true);
        })
        .catch(console.error);
    }
  }, [activeTab, showNewOrderModal, lab.uid, testsLoaded]);

  // Handler to refresh samples on demand
  const handleRefreshSamples = async () => {
    try {
      const freshSamples = await getLabSamples(lab.uid);
      setSamples(freshSamples);
    } catch (err) {
      console.error("Error refreshing samples:", err);
    }
  };

  // Badges counts
  const newOrdersCount = orders.filter((o) => o.status === 'NEW').length;
  const pendingSamplesCount = samples.filter((s) => s.status === 'pending').length;
  const pendingResultsCount = orders.filter((o) => o.status === 'IN_PROGRESS' || o.status === 'SAMPLE_COLLECTED').length;

  return (
    <div className="min-h-screen bg-slate-50 font-['Tajawal',sans-serif] text-slate-900 dir-rtl">
      
      {/* Header Bar */}
      <LabHeader
        lab={lab}
        onSignOut={onSignOut}
        onOpenMobileNav={() => setIsMobileNavOpen(true)}
        onNewOrderClick={() => setShowNewOrderModal(true)}
        onScanClick={() => setShowScannerModal(true)}
        globalSearchQuery={globalSearch}
        setGlobalSearchQuery={setGlobalSearch}
        pendingReviewsCount={pendingResultsCount}
      />

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex gap-6">
        
        {/* Navigation Sidebar */}
        <LabSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isMobileOpen={isMobileNavOpen}
          setIsMobileOpen={setIsMobileNavOpen}
          newOrdersCount={newOrdersCount}
          pendingSamplesCount={pendingSamplesCount}
          pendingResultsCount={pendingResultsCount}
        />

        {/* Tab Content Stage */}
        <main className="flex-1 min-w-0">
          
          {loadingOrders ? (
            <div className="py-20 text-center">
              <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs font-bold text-slate-500">جاري تحميل بيانات المختبر...</p>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <LabOverviewTab
                  lab={lab}
                  orders={orders}
                  samples={samples}
                  results={[]}
                  onNewOrder={() => setShowNewOrderModal(true)}
                  onScanSample={() => setShowScannerModal(true)}
                  onEnterResult={(ord) => {
                    setSelectedOrderForResults(ord);
                    setActiveTab('results');
                  }}
                  onSelectTab={(tab) => setActiveTab(tab)}
                  onViewOrderDetails={(ord) => setPdfReportOrder(ord)}
                />
              )}

              {activeTab === 'orders' && (
                <LabOrdersTab
                  labId={lab.uid}
                  orders={orders}
                  onRefreshOrders={() => {}}
                  onNewOrder={() => setShowNewOrderModal(true)}
                  onEnterResult={(ord) => {
                    setSelectedOrderForResults(ord);
                    setActiveTab('results');
                  }}
                  onViewPDF={(ord) => setPdfReportOrder(ord)}
                  onShowToast={onShowToast}
                />
              )}

              {activeTab === 'samples' && (
                <LabSamplesTab
                  labId={lab.uid}
                  samples={samples}
                  onRefreshSamples={handleRefreshSamples}
                  onOpenScanner={() => setShowScannerModal(true)}
                  onShowToast={onShowToast}
                />
              )}

              {activeTab === 'results' && (
                <LabResultsTab
                  labId={lab.uid}
                  orders={orders}
                  selectedOrderForResults={selectedOrderForResults}
                  setSelectedOrderForResults={setSelectedOrderForResults}
                  onViewPDF={(ord) => setPdfReportOrder(ord)}
                  onShowToast={onShowToast}
                />
              )}

              {activeTab === 'patients' && (
                <LabPatientsTab
                  orders={orders}
                  onViewOrder={(ord) => setPdfReportOrder(ord)}
                />
              )}

              {activeTab === 'reports' && (
                <LabReportsTab
                  orders={orders}
                  transactions={transactions}
                />
              )}

              {activeTab === 'catalog' && (
                <LabCatalogTab
                  labId={lab.uid}
                  tests={tests}
                  onRefreshTests={() => {
                    setTestsLoaded(false);
                    getLabTests(lab.uid).then((t) => { setTests(t); setTestsLoaded(true); });
                  }}
                  onShowToast={onShowToast}
                />
              )}

              {activeTab === 'staff' && (
                <LabStaffTab
                  labId={lab.uid}
                  onShowToast={onShowToast}
                />
              )}

              {activeTab === 'finances' && (
                <LabFinancesTab
                  labId={lab.uid}
                  orders={orders}
                  onShowToast={onShowToast}
                />
              )}

              {activeTab === 'settings' && (
                <LabSettingsTab
                  lab={lab}
                  onProfileUpdated={(updated) => setLab(updated)}
                  onShowToast={onShowToast}
                />
              )}
            </>
          )}

        </main>

      </div>

      {/* Modals */}
      {showNewOrderModal && (
        <LabOrderModal
          lab={lab}
          selectedTests={tests}
          onClose={() => setShowNewOrderModal(false)}
          onOrderSuccess={() => {
            setShowNewOrderModal(false);
            handleRefreshSamples();
          }}
          onShowToast={onShowToast}
        />
      )}

      {showScannerModal && (
        <SampleScannerModal
          labId={lab.uid}
          onClose={() => setShowScannerModal(false)}
          onSampleFound={() => {
            setShowScannerModal(false);
            handleRefreshSamples();
            setActiveTab('samples');
          }}
          onShowToast={onShowToast}
        />
      )}

      {pdfReportOrder && (
        <LabPDFReportModal
          lab={lab}
          order={pdfReportOrder}
          results={[]}
          onClose={() => setPdfReportOrder(null)}
        />
      )}

    </div>
  );
};
