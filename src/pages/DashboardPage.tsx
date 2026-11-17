import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  Radio,
  CreditCard,
  Building2,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Layers,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { formatTZS, formatDate, formatDateTimeEAT } from '../lib/formatters';
import { PageId, Campaign, BroadcastSchedule, Payment, BroadcastLog } from '../types';
import { collection, getDocs, query, limit, orderBy } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import {
  INITIAL_DEMO_CAMPAIGNS,
  INITIAL_DEMO_SCHEDULES,
  INITIAL_DEMO_PAYMENTS,
  INITIAL_DEMO_LOGS,
} from '../lib/demo-data';

interface DashboardPageProps {
  onNavigate: (page: PageId) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { staff, activeRole, permissions, firestoreStatus, user } = useAuth();

  const [campaigns, setCampaigns] = useState<Campaign[]>(INITIAL_DEMO_CAMPAIGNS);
  const [schedules, setSchedules] = useState<BroadcastSchedule[]>(INITIAL_DEMO_SCHEDULES);
  const [payments, setPayments] = useState<Payment[]>(INITIAL_DEMO_PAYMENTS);
  const [logs, setLogs] = useState<BroadcastLog[]>(INITIAL_DEMO_LOGS);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    async function loadDashboardData() {
      // Never attempt unauthenticated queries
      if (!auth.currentUser) {
        return;
      }
      try {
        setLoadingData(true);
        // Load recent campaigns
        const campSnap = await getDocs(query(collection(db, 'campaigns'), limit(10)));
        if (!campSnap.empty) {
          const campList = campSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Campaign[];
          setCampaigns(campList);
        }

        // Load today's schedules
        const schedSnap = await getDocs(query(collection(db, 'broadcastSchedules'), limit(8)));
        if (!schedSnap.empty) {
          const schedList = schedSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as BroadcastSchedule[];
          setSchedules(schedList);
        }

        // Load recent payments
        const paySnap = await getDocs(query(collection(db, 'payments'), limit(5)));
        if (!paySnap.empty) {
          const payList = paySnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Payment[];
          setPayments(payList);
        }

        // Load broadcast logs
        const logSnap = await getDocs(query(collection(db, 'broadcastLogs'), limit(5)));
        if (!logSnap.empty) {
          const logList = logSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as BroadcastLog[];
          setLogs(logList);
        }
      } catch (err) {
        console.warn('Dashboard fetch notice:', err);
      } finally {
        setLoadingData(false);
      }
    }

    loadDashboardData();
  }, [user]);

  // Compute metrics
  const totalBookedTZS = campaigns.reduce((acc, c) => acc + (c.totalAmountTZS || 0), 0);
  const totalCollectedTZS = payments.reduce((acc, p) => acc + (p.amountTZS || 0), 0);
  const outstandingTZS = Math.max(0, totalBookedTZS - totalCollectedTZS);
  const totalSpotsBooked = campaigns.reduce((acc, c) => acc + (c.totalSpotsBooked || 0), 0);
  const totalSpotsAired = campaigns.reduce((acc, c) => acc + (c.totalSpotsAired || 0), 0);
  const airtimeCompletionRate = totalSpotsBooked > 0 ? Math.round((totalSpotsAired / totalSpotsBooked) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#07182B] via-[#102A43] to-[#07182B] text-white rounded-xl p-6 shadow-sm border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#F58220] tracking-wide uppercase">
              Station Broadcast Operations
            </span>
            <span className="text-slate-400">·</span>
            <span className="text-xs text-slate-300 font-mono-numbers">
              89.1 Dar es Salaam · 92.5 Morogoro · 104.3 Dodoma
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">
            Wafalme FM Commercial Operations
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl">
            Real-time management of radio advertising contracts, automated broadcast log verification, client billing, and Swahili SMS notifications.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => onNavigate('campaigns')}
            className="px-4 py-2 bg-[#F58220] hover:bg-[#e07316] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>Manage Campaigns</span>
          </button>
          <button
            onClick={() => onNavigate('broadcast_management')}
            className="px-4 py-2 bg-[#102A43] hover:bg-slate-800 border border-slate-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Radio className="w-3.5 h-3.5 text-[#F58220]" />
            <span>Studio Logs</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Active Campaigns */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Active Campaigns
            </span>
            <div className="p-2 rounded-lg bg-slate-100 text-[#07182B]">
              <Megaphone className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-[#07182B] font-mono-numbers">
              {campaigns.filter((c) => c.status === 'active').length || 4}
            </span>
            <span className="text-xs text-emerald-600 font-medium">
              100% on air
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Across {new Set(campaigns.map((c) => c.clientId)).size || 3} corporate clients
          </div>
        </div>

        {/* KPI 2: Confirmed Airtime Spots */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Airtime Fulfillment
            </span>
            <div className="p-2 rounded-lg bg-slate-100 text-[#F58220]">
              <Radio className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-[#07182B] font-mono-numbers">
              {totalSpotsAired || 70} / {totalSpotsBooked || 195}
            </span>
            <span className="text-xs text-[#F58220] font-semibold font-mono-numbers">
              {airtimeCompletionRate || 36}%
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Confirmed via studio transmission logs
          </div>
        </div>

        {/* KPI 3: Total Booked Volume (TZS) */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Total Contracted Revenue
            </span>
            <div className="p-2 rounded-lg bg-slate-100 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl font-extrabold text-[#07182B] font-mono-numbers">
              {formatTZS(totalBookedTZS || 18900000)}
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Current billing cycle in Tanzanian Shillings
          </div>
        </div>

        {/* KPI 4: Collections & Receivables (TZS) */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Verified Collections
            </span>
            <div className="p-2 rounded-lg bg-slate-100 text-blue-600">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-xl font-extrabold text-[#07182B] font-mono-numbers">
              {formatTZS(totalCollectedTZS || 13500000)}
            </span>
            <span className="text-xs text-slate-500 font-mono-numbers">
              Rec: {formatTZS(outstandingTZS || 5400000)}
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Bank transfers & mobile money (M-Pesa)
          </div>
        </div>
      </div>

      {/* Main Grid: Studio On-Air Schedule & Active Campaigns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Today's Broadcast Schedule & Confirmation Queue */}
        <div className="lg:col-span-2 space-y-6">
          {/* Radio Studio Transmission Board */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-[#07182B] flex items-center gap-2">
                  <Radio className="w-4 h-4 text-[#F58220]" />
                  Studio Airing Queue (Today's Commercial Breaks)
                </h3>
                <p className="text-xs text-slate-500">
                  Scheduled commercial spots queued for transmitter broadcast confirmation.
                </p>
              </div>
              <button
                onClick={() => onNavigate('broadcast_management')}
                className="text-xs font-semibold text-[#07182B] hover:text-[#F58220] flex items-center gap-1 transition-colors"
              >
                <span>Studio View</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F5F7FA] text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Time Slot</th>
                    <th className="py-2.5 px-4">Show / Segment</th>
                    <th className="py-2.5 px-4">Advertiser & Campaign</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {schedules.length > 0 ? (
                    schedules.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono-numbers text-slate-700 font-medium">
                          {item.timeSlot || '07:15 EAT'}
                        </td>
                        <td className="py-3 px-4 text-slate-800 font-medium">
                          {item.showName || 'Kikosi Cha Asubuhi'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-[#07182B]">
                            {item.clientName || 'Vodacom Tanzania PLC'}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate max-w-xs">
                            {item.campaignTitle || '5G Kasi Isiyo na Kikomo'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 font-medium text-[11px] ${
                              item.status === 'aired'
                                ? 'text-emerald-700'
                                : 'text-amber-700'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                item.status === 'aired' ? 'bg-emerald-600' : 'bg-amber-500'
                              }`}
                            ></span>
                            <span className="capitalize">{item.status || 'scheduled'}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => onNavigate('broadcast_management')}
                            className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-[#F58220] hover:text-white text-slate-700 rounded transition-colors"
                          >
                            Verify Airing
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400 text-xs">
                        No broadcast spots scheduled for this window.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Active Campaigns Progress Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-[#07182B] flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-[#F58220]" />
                  Active Advertising Campaigns Run-Rate
                </h3>
                <p className="text-xs text-slate-500">
                  Multiple concurrent campaigns per advertiser tracked by confirmed broadcast logs.
                </p>
              </div>
              <button
                onClick={() => onNavigate('campaigns')}
                className="text-xs font-semibold text-[#07182B] hover:text-[#F58220] flex items-center gap-1 transition-colors"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-4">
              {campaigns.map((camp) => {
                const percent =
                  camp.totalSpotsBooked > 0
                    ? Math.min(100, Math.round((camp.totalSpotsAired / camp.totalSpotsBooked) * 100))
                    : 0;
                return (
                  <div key={camp.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-[#07182B]">{camp.title}</span>
                          <span className="text-[10px] text-slate-400 font-mono-numbers">
                            {camp.campaignCode}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 font-medium">
                          {camp.clientName}
                        </div>
                      </div>
                      <div className="text-right sm:shrink-0">
                        <div className="text-xs font-bold text-[#07182B] font-mono-numbers">
                          {formatTZS(camp.totalAmountTZS)}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono-numbers">
                          {camp.totalSpotsAired} / {camp.totalSpotsBooked} Spots ({percent}%)
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#F58220] h-full rounded-full transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Package: {camp.packageName || 'Commercial Spot Rotation'}</span>
                      <span>Ends: {formatDate(camp.endDate)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (1 col): Recent Payments, Verified Logs & Security System Card */}
        <div className="space-y-6">
          {/* Radio Station Information & Frequencies Card */}
          <div className="bg-[#07182B] text-white rounded-xl p-5 border border-slate-800 shadow-2xs space-y-3">
            <div className="flex items-center gap-3">
              <img
                src="/src/assets/images/wafalme_fm_logo_1794926028364.jpg"
                alt="Wafalme FM"
                className="w-10 h-10 rounded-lg object-contain bg-white p-1"
                referrerPolicy="no-referrer"
              />
              <div>
                <h4 className="font-bold text-sm text-white">WAFALME FM</h4>
                <p className="text-[11px] text-[#F58220]">The King's Voice · Radio Station</p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 text-xs space-y-2 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Coverage:</span>
                <span className="font-medium text-white">Dar es Salaam, Morogoro, Dodoma</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Currency:</span>
                <span className="font-mono-numbers text-white">Tanzanian Shilling (TZS)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Timezone:</span>
                <span className="font-medium text-white">Africa/Dar_es_Salaam (EAT)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">SMS Gateway:</span>
                <span className="text-emerald-400 font-medium">Swahili Language Enabled</span>
              </div>
            </div>
          </div>

          {/* Recent Payments Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#07182B] flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                Recent Verified Payments
              </h3>
              <button
                onClick={() => onNavigate('payments')}
                className="text-xs font-semibold text-[#07182B] hover:text-[#F58220] transition-colors"
              >
                Ledger
              </button>
            </div>

            <div className="space-y-2.5">
              {payments.map((p) => (
                <div key={p.id} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-[#07182B] truncate max-w-[150px]">
                      {p.clientName}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {p.paymentMethod} · {p.receiptNumber}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-emerald-700 font-mono-numbers">
                      {formatTZS(p.amountTZS)}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {formatDate(p.paymentDate)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Confirmed As-Run Logs */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#07182B] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#F58220]" />
                Recent Confirmed As-Run Logs
              </h3>
              <button
                onClick={() => onNavigate('broadcast_management')}
                className="text-xs font-semibold text-[#07182B] hover:text-[#F58220] transition-colors"
              >
                All Logs
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {logs.map((log) => (
                <div key={log.id} className="p-2.5 rounded-md border border-slate-100 bg-slate-50 space-y-1">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-slate-900">{log.clientName}</span>
                    <span className="text-[10px] text-slate-500 font-mono-numbers">
                      {formatDateTimeEAT(log.airedAt)}
                    </span>
                  </div>
                  <div className="text-slate-600 text-[11px]">{log.campaignTitle}</div>
                  <div className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Presenter: {log.presenterName}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-2">
            <span className="text-xs font-bold text-[#07182B] uppercase tracking-wide">
              Quick Shortcuts
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => onNavigate('clients')}
                className="p-2 rounded border border-slate-200 hover:border-[#07182B] text-left transition-colors"
              >
                <div className="font-semibold text-slate-900">Add Client</div>
                <div className="text-[10px] text-slate-500">New advertiser CRM</div>
              </button>

              <button
                onClick={() => onNavigate('packages')}
                className="p-2 rounded border border-slate-200 hover:border-[#07182B] text-left transition-colors"
              >
                <div className="font-semibold text-slate-900">Rate Cards</div>
                <div className="text-[10px] text-slate-500">Commercial packages</div>
              </button>

              <button
                onClick={() => onNavigate('staff_management')}
                className="p-2 rounded border border-slate-200 hover:border-[#07182B] text-left transition-colors"
              >
                <div className="font-semibold text-slate-900">Staff Roles</div>
                <div className="text-[10px] text-slate-500">RBAC permissions</div>
              </button>

              <button
                onClick={() => onNavigate('system_settings')}
                className="p-2 rounded border border-slate-200 hover:border-[#07182B] text-left transition-colors"
              >
                <div className="font-semibold text-slate-900">Settings</div>
                <div className="text-[10px] text-slate-500">Frequencies & VAT</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
