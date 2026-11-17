import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Megaphone,
  Layers,
  CreditCard,
  CalendarDays,
  Radio,
  MessageSquare,
  Receipt,
  BarChart3,
  UserCheck,
  ShieldAlert,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronRight,
  Database,
  Building2,
  Clock,
  Sparkles,
  Shield,
} from 'lucide-react';
import { PageId, StaffRole } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { ALL_ROLES } from '../lib/permissions';

interface DashboardLayoutProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  children: React.ReactNode;
}

interface NavItem {
  id: PageId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  section: 'Operations' | 'Commercial' | 'Finance' | 'Communication' | 'Admin';
  requiredPermissionKey?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard, section: 'Operations' },
  { id: 'broadcast_calendar', label: 'Broadcast Calendar', icon: CalendarDays, section: 'Operations' },
  { id: 'broadcast_management', label: 'Studio & Airing Logs', icon: Radio, section: 'Operations' },

  { id: 'clients', label: 'Advertiser Accounts', icon: Building2, section: 'Commercial' },
  { id: 'campaigns', label: 'Ad Campaigns', icon: Megaphone, section: 'Commercial' },
  { id: 'packages', label: 'Rate Card Packages', icon: Layers, section: 'Commercial' },

  { id: 'payments', label: 'Payments & Ledger', icon: CreditCard, section: 'Finance' },
  { id: 'expenses', label: 'Station Expenses', icon: Receipt, section: 'Finance' },
  { id: 'reports', label: 'Reports & Revenue', icon: BarChart3, section: 'Finance' },

  { id: 'sms_management', label: 'Swahili SMS Alerts', icon: MessageSquare, section: 'Communication' },

  { id: 'staff_management', label: 'Staff & Roles', icon: UserCheck, section: 'Admin' },
  { id: 'audit_logs', label: 'Security Audit Logs', icon: ShieldAlert, section: 'Admin' },
  { id: 'system_settings', label: 'Station Settings', icon: Settings, section: 'Admin' },
];

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  currentPage,
  onNavigate,
  children,
}) => {
  const {
    user,
    staff,
    activeRole,
    permissions,
    previewRoleOverride,
    setPreviewRoleOverride,
    logout,
    firestoreStatus,
    seedInitialDataIfEmpty,
  } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentDarTime, setCurrentDarTime] = useState('');
  const [isSeeding, setIsSeeding] = useState(false);

  // EAT Clock ticker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Format in Africa/Dar_es_Salaam
      const timeStr = now.toLocaleTimeString('en-GB', {
        timeZone: 'Africa/Dar_es_Salaam',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setCurrentDarTime(`${timeStr} EAT`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      await seedInitialDataIfEmpty();
    } finally {
      setIsSeeding(false);
    }
  };

  const sections: Array<NavItem['section']> = [
    'Operations',
    'Commercial',
    'Finance',
    'Communication',
    'Admin',
  ];

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#102A43] flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-[#07182B] text-white border-b border-[#102A43]">
        <div className="flex items-center gap-2">
          <img
            src="/src/assets/images/wafalme_fm_logo_1794926028364.jpg"
            alt="Wafalme FM Logo"
            className="w-8 h-8 rounded object-contain bg-white p-0.5"
            referrerPolicy="no-referrer"
          />
          <div>
            <span className="font-bold text-sm tracking-wide">WAFALME FM</span>
            <span className="block text-[10px] text-slate-400">89.1 · 92.5 · 104.3 FM</span>
          </div>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 text-slate-300 hover:text-white rounded-lg focus:outline-none"
          aria-label="Toggle Navigation"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Desktop Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#07182B] text-white flex flex-col transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-3">
          <img
            src="/src/assets/images/wafalme_fm_logo_1794926028364.jpg"
            alt="Wafalme FM Logo"
            className="w-10 h-10 rounded-lg object-contain bg-white p-1 shrink-0"
            referrerPolicy="no-referrer"
          />
          <div className="overflow-hidden">
            <h1 className="font-extrabold text-base tracking-tight text-white leading-tight">
              WAFALME FM
            </h1>
            <p className="text-[11px] text-[#F58220] font-medium tracking-wide">
              ADVERTISING SYSTEM
            </p>
            <p className="text-[10px] text-slate-400 truncate">Manage · Broadcast · Track</p>
          </div>
        </div>

        {/* Live Frequency Bar */}
        <div className="px-4 py-2 bg-[#102A43]/60 border-b border-slate-800 text-[11px] text-slate-300 flex items-center justify-between">
          <span className="text-slate-400">Dar es Salaam</span>
          <span className="font-mono-numbers text-[#F58220] font-semibold">89.1 FM</span>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {sections.map((section) => {
            const sectionItems = NAV_ITEMS.filter((item) => item.section === section);
            return (
              <div key={section}>
                <div className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {section}
                </div>
                <div className="space-y-0.5">
                  {sectionItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentPage === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          onNavigate(item.id);
                          setSidebarOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-md transition-colors text-left ${
                          isActive
                            ? 'bg-[#F58220] text-white shadow-sm font-semibold'
                            : 'text-slate-300 hover:bg-[#102A43] hover:text-white'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Database & System Status Card */}
        <div className="p-3 border-t border-slate-800 bg-[#061220] text-[11px] space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1.5">
              <Database className="w-3 h-3 text-[#F58220]" />
              Firestore
            </span>
            <span
              className={`font-medium ${
                firestoreStatus.success ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {firestoreStatus.success ? 'Connected' : 'Syncing'}
            </span>
          </div>

          <button
            onClick={handleSeed}
            disabled={isSeeding}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 bg-[#102A43] hover:bg-[#193a5c] text-slate-200 hover:text-white text-[11px] rounded transition-colors"
          >
            <Sparkles className="w-3 h-3 text-[#F58220]" />
            <span>{isSeeding ? 'Seeding Demo Data...' : 'Seed Station Data'}</span>
          </button>
        </div>

        {/* User Profile Footer */}
        <div className="p-3 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <img
              src="/src/assets/images/station_manager_avatar_1794926028801.jpg"
              alt="Manager Avatar"
              className="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="overflow-hidden">
              <div className="text-xs font-semibold text-white truncate">
                {staff?.fullName || user?.displayName || 'Station Manager'}
              </div>
              <div className="text-[10px] text-[#F58220] truncate font-medium">
                {activeRole}
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign Out"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar strictly conforming to the Top Bar Contract */}
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between gap-8 sticky top-0 z-30 shadow-xs">
          {/* Zone 1: Breadcrumb + Clock */}
          <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
            <span className="font-bold text-sm text-[#07182B] tracking-tight">
              Wafalme FM
            </span>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-medium text-slate-600 capitalize">
              {currentPage.replace(/_/g, ' ')}
            </span>
            <span className="text-slate-300 hidden sm:inline">·</span>
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 font-mono-numbers">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{currentDarTime}</span>
            </div>
          </div>

          {/* Zone 2: Role Switcher / Inspector (Critical for testing role-based security) */}
          <div className="hidden lg:flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium whitespace-nowrap">Testing Role:</span>
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              {ALL_ROLES.map((role) => (
                <button
                  key={role}
                  onClick={() =>
                    setPreviewRoleOverride(role === activeRole && previewRoleOverride ? null : role)
                  }
                  className={`px-2 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap ${
                    activeRole === role
                      ? 'bg-[#07182B] text-white shadow-xs'
                      : 'text-slate-600 hover:text-[#07182B]'
                  }`}
                  title={`Inspect system as ${role}`}
                >
                  {role === 'Traffic / Programming Manager'
                    ? 'Traffic'
                    : role === 'Presenter / Operator'
                    ? 'Presenter'
                    : role}
                </button>
              ))}
            </div>
          </div>

          {/* Zone 3: 1 Primary Action & Staff Identity */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-semibold text-[#07182B]">
                {staff?.fullName || user?.displayName || 'Executive'}
              </span>
              <span className="text-[11px] text-slate-500">
                {activeRole}
              </span>
            </div>
            <button
              onClick={() => onNavigate('broadcast_management')}
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-[#F58220] hover:bg-[#e07316] rounded-md transition-colors whitespace-nowrap shadow-xs flex items-center gap-1.5"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Studio On-Air</span>
            </button>
          </div>
        </header>

        {/* Role Override Alert Banner (if testing non-default role) */}
        {previewRoleOverride && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center justify-between text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Role Testing Mode Active:</strong> You are currently previewing permissions and views as{' '}
                <strong>{previewRoleOverride}</strong>.
              </span>
            </div>
            <button
              onClick={() => setPreviewRoleOverride(null)}
              className="text-xs font-semibold text-amber-800 hover:underline cursor-pointer"
            >
              Reset to Account Role
            </button>
          </div>
        )}

        {/* Viewport Content */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">{children}</main>

        {/* Station Footer */}
        <footer className="mt-auto px-6 py-3 border-t border-slate-200 bg-white text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            © {new Date().getFullYear()} Wafalme FM Radio Operations. All rights reserved. Dar es Salaam, Tanzania.
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>TZS Currency</span>
            <span>·</span>
            <span>Africa/Dar_es_Salaam (EAT)</span>
            <span>·</span>
            <span>Cloud Firestore Verified</span>
          </div>
        </footer>
      </div>
    </div>
  );
};
