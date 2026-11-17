import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PageId } from './types';
import { LoginPage } from './pages/LoginPage';
import { ClientPortalPage } from './pages/ClientPortalPage';
import { DashboardLayout } from './layouts/DashboardLayout';
import { DashboardPage } from './pages/DashboardPage';
import { StaffManagementPage } from './pages/StaffManagementPage';
import { SystemSettingsPage } from './pages/SystemSettingsPage';
import { ClientsPage } from './pages/ClientsPage';
import { CampaignsPage } from './pages/CampaignsPage';
import { PackagesPage } from './pages/PackagesPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { BroadcastCalendarPage } from './pages/BroadcastCalendarPage';
import { BroadcastManagementPage } from './pages/BroadcastManagementPage';
import { SmsManagementPage } from './pages/SmsManagementPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { ReportsPage } from './pages/ReportsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';

function MainApp() {
  const { user, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const [showClientPortal, setShowClientPortal] = useState(false);

  React.useEffect(() => {
    const handleSwitch = () => setShowClientPortal(true);
    window.addEventListener('SWITCH_TO_CLIENT_PORTAL', handleSwitch as EventListener);
    return () => window.removeEventListener('SWITCH_TO_CLIENT_PORTAL', handleSwitch as EventListener);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#07182B] flex flex-col items-center justify-center text-white space-y-4">
        <img
          src="/src/assets/images/wafalme_fm_logo_1794926028364.jpg"
          alt="Wafalme FM"
          className="w-16 h-16 rounded-xl object-contain bg-white p-2 shadow-lg animate-pulse"
          referrerPolicy="no-referrer"
        />
        <div className="text-center space-y-1">
          <h1 className="font-extrabold text-base tracking-wider text-white">WAFALME FM</h1>
          <p className="text-xs text-[#F58220]">Advertising Management System</p>
          <p className="text-[11px] text-slate-400">Connecting to Cloud Firestore...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (showClientPortal) {
      return <ClientPortalPage onBackToStaffLogin={() => setShowClientPortal(false)} />;
    }
    return <LoginPage />;
  }

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage onNavigate={setCurrentPage} />;
      case 'clients':
      case 'client_details':
        return <ClientsPage onNavigate={setCurrentPage} />;
      case 'campaigns':
      case 'campaign_details':
        return <CampaignsPage onNavigate={setCurrentPage} />;
      case 'packages':
        return <PackagesPage />;
      case 'payments':
        return <PaymentsPage />;
      case 'broadcast_calendar':
        return <BroadcastCalendarPage onNavigate={setCurrentPage} />;
      case 'broadcast_management':
        return <BroadcastManagementPage onNavigate={setCurrentPage} />;
      case 'sms_management':
        return <SmsManagementPage />;
      case 'expenses':
        return <ExpensesPage />;
      case 'reports':
        return <ReportsPage />;
      case 'staff_management':
        return <StaffManagementPage />;
      case 'audit_logs':
        return <AuditLogsPage />;
      case 'system_settings':
        return <SystemSettingsPage />;
      default:
        return <DashboardPage onNavigate={setCurrentPage} />;
    }
  };

  return (
    <DashboardLayout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderCurrentPage()}
    </DashboardLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
