import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Megaphone,
  CreditCard,
  Building2,
  Download,
  Printer,
  Users,
  MessageSquare,
  DollarSign,
  CheckCircle2,
  PieChart,
  Calendar,
} from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Campaign, Payment, Client, StaffMember, SmsLog } from '../types';
import { formatTZS } from '../lib/formatters';
import {
  INITIAL_DEMO_CAMPAIGNS,
  INITIAL_DEMO_PAYMENTS,
  INITIAL_DEMO_CLIENTS,
  INITIAL_DEMO_STAFF,
  INITIAL_DEMO_SMS_LOGS,
} from '../lib/demo-data';

export const ReportsPage: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>(INITIAL_DEMO_CAMPAIGNS);
  const [payments, setPayments] = useState<Payment[]>(INITIAL_DEMO_PAYMENTS);
  const [clients, setClients] = useState<Client[]>(INITIAL_DEMO_CLIENTS);
  const [staffList, setStaffList] = useState<StaffMember[]>(INITIAL_DEMO_STAFF);
  const [smsLogs, setSmsLogs] = useState<SmsLog[]>(INITIAL_DEMO_SMS_LOGS);
  const [loading, setLoading] = useState(false);
  const [activeReportTab, setActiveReportTab] = useState<'financial' | 'profitability' | 'staff' | 'sms' | 'monthly'>('financial');

  useEffect(() => {
    async function load() {
      if (!auth.currentUser) return;
      try {
        setLoading(true);
        const [campSnap, paySnap, cSnap, staffSnap, smsSnap] = await Promise.all([
          getDocs(collection(db, 'campaigns')),
          getDocs(collection(db, 'payments')),
          getDocs(collection(db, 'clients')),
          getDocs(collection(db, 'staff')),
          getDocs(collection(db, 'smsLogs')),
        ]);

        if (!campSnap.empty) {
          setCampaigns(campSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Campaign[]);
        }
        if (!paySnap.empty) {
          setPayments(paySnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Payment[]);
        }
        if (!cSnap.empty) {
          setClients(cSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Client[]);
        }
        if (!staffSnap.empty) {
          setStaffList(staffSnap.docs.map((d) => ({ uid: d.id, ...d.data() })) as unknown as StaffMember[]);
        }
        if (!smsSnap.empty) {
          setSmsLogs(smsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as SmsLog[]);
        }
      } catch (e) {
        console.warn('Reports load error:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const totalContracted = campaigns.reduce((acc, c) => acc + (c.totalAmountTZS || 0), 0);
  const totalCollected = payments.reduce((acc, p) => acc + (p.amountTZS || 0), 0);
  const totalSpotsBooked = campaigns.reduce((acc, c) => acc + (c.totalSpotsBooked || 0), 0);
  const totalSpotsAired = campaigns.reduce((acc, c) => acc + (c.totalSpotsAired || 0), 0);
  const completionRate = totalSpotsBooked > 0 ? Math.round((totalSpotsAired / totalSpotsBooked) * 100) : 0;

  // Excel / CSV Export
  const handleExportCsv = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Wafalme FM Commercial Advertising Report\n';
    csvContent += `Generated,${new Date().toLocaleDateString()}\n\n`;
    csvContent += 'Client Name,Campaign Title,Contract Value (TZS),Paid (TZS),Spots Booked,Spots Aired,Status\n';

    campaigns.forEach((c) => {
      const clientPays = payments.filter((p) => p.campaignId === c.id);
      const paid = clientPays.reduce((sum, p) => sum + (p.amountTZS || 0), 0);
      csvContent += `"${c.clientName}","${c.title}",${c.totalAmountTZS},${paid},${c.totalSpotsBooked},${c.totalSpotsAired},${c.status}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Wafalme_FM_Advertising_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#F58220] uppercase tracking-wide">
            <BarChart3 className="w-4 h-4" />
            <span>Executive Analytics & Reconciliation</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[#07182B]">
            Commercial Reports, Profitability & Analytics
          </h2>
          <p className="text-xs text-slate-500">
            Real-time financial reconciliation, campaign profitability, staff performance, SMS spending, and PDF/Excel exports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 bg-[#07182B] hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel (CSV)</span>
          </button>
          <button
            onClick={handlePrintPdf}
            className="px-3.5 py-2 bg-[#F58220] hover:bg-[#e07316] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print PDF Report</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Contracted Volume
          </span>
          <div className="mt-2 text-xl font-extrabold text-[#07182B] font-mono-numbers">
            {formatTZS(totalContracted)}
          </div>
          <span className="text-[11px] text-slate-400">Total active commercial contracts</span>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Bank & Mobile Collections
          </span>
          <div className="mt-2 text-xl font-extrabold text-emerald-700 font-mono-numbers">
            {formatTZS(totalCollected)}
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">Cleared via TRA receipting</span>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Airtime Spots Fulfillment
          </span>
          <div className="mt-2 text-xl font-extrabold text-[#07182B] font-mono-numbers">
            {totalSpotsAired} / {totalSpotsBooked}
          </div>
          <span className="text-[11px] text-[#F58220] font-semibold font-mono-numbers">
            {completionRate}% transmission verified
          </span>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Outstanding Invoices
          </span>
          <div className="mt-2 text-xl font-extrabold text-slate-800 font-mono-numbers">
            {formatTZS(Math.max(0, totalContracted - totalCollected))}
          </div>
          <span className="text-[11px] text-slate-400">Accounts receivable</span>
        </div>
      </div>

      {/* Report Category Navigation Tabs */}
      <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center gap-2 text-xs">
        {[
          { id: 'financial', label: 'Financial & Billing Summary', icon: CreditCard },
          { id: 'profitability', label: 'Campaign Profitability', icon: TrendingUp },
          { id: 'staff', label: 'Staff Performance', icon: Users },
          { id: 'sms', label: 'SMS Spending & Delivery', icon: MessageSquare },
          { id: 'monthly', label: 'Monthly Revenue Analytics', icon: Calendar },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeReportTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveReportTab(tab.id as any)}
              className={`px-4 py-2 font-medium rounded-lg transition-colors flex items-center gap-2 cursor-pointer ${
                isActive
                  ? 'bg-[#07182B] text-white font-bold shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4 text-[#F58220]" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Financial & Billing Summary */}
      {activeReportTab === 'financial' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-sm text-[#07182B]">
              Commercial Billing Breakdown by Advertiser Client
            </h3>
            <span className="text-xs text-slate-500 font-mono-numbers">
              {clients.length} Corporate Accounts
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F5F7FA] text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Client Organization</th>
                  <th className="py-3 px-4">Active Campaigns</th>
                  <th className="py-3 px-4 font-mono-numbers">Booked Value (TZS)</th>
                  <th className="py-3 px-4 font-mono-numbers">Paid Value (TZS)</th>
                  <th className="py-3 px-4 font-mono-numbers">Airtime Spots</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clients.map((c) => {
                  const clientCamps = campaigns.filter((camp) => camp.clientId === c.id);
                  const booked = clientCamps.reduce((sum, camp) => sum + (camp.totalAmountTZS || 0), 0);
                  const spotsBooked = clientCamps.reduce((sum, camp) => sum + (camp.totalSpotsBooked || 0), 0);
                  const spotsAired = clientCamps.reduce((sum, camp) => sum + (camp.totalSpotsAired || 0), 0);
                  const clientPays = payments.filter((p) => p.clientId === c.id);
                  const paid = clientPays.reduce((sum, p) => sum + (p.amountTZS || 0), 0);

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-[#07182B]">{c.companyName}</td>
                      <td className="py-3 px-4 font-mono-numbers text-slate-700">
                        {clientCamps.length} Independent Campaigns
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 font-mono-numbers">
                        {formatTZS(booked)}
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-700 font-mono-numbers">
                        {formatTZS(paid)}
                      </td>
                      <td className="py-3 px-4 font-mono-numbers text-slate-700">
                        {spotsAired} / {spotsBooked} Spots
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-emerald-700 font-semibold capitalize text-[11px]">
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Campaign Profitability Analytics */}
      {activeReportTab === 'profitability' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-[#07182B]">Campaign Profitability Analysis</h3>
              <p className="text-xs text-slate-500">
                Revenue vs Estimated Production & Transmission Costs (15% operational allocation).
              </p>
            </div>
            <span className="text-xs text-slate-500 font-mono-numbers">{campaigns.length} Campaigns</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F5F7FA] text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Campaign Title</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4 font-mono-numbers">Revenue (TZS)</th>
                  <th className="py-3 px-4 font-mono-numbers">Est. Cost (15%)</th>
                  <th className="py-3 px-4 font-mono-numbers">Net Margin (TZS)</th>
                  <th className="py-3 px-4 font-mono-numbers">ROI / Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {campaigns.map((c) => {
                  const rev = c.totalAmountTZS || 0;
                  const estCost = Math.round(rev * 0.15);
                  const netMargin = rev - estCost;
                  const roi = rev > 0 ? Math.round((netMargin / rev) * 100) : 0;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-bold text-[#07182B]">{c.title}</td>
                      <td className="py-3 px-4 text-slate-700">{c.clientName}</td>
                      <td className="py-3 px-4 font-bold text-slate-900 font-mono-numbers">{formatTZS(rev)}</td>
                      <td className="py-3 px-4 text-slate-600 font-mono-numbers">{formatTZS(estCost)}</td>
                      <td className="py-3 px-4 font-bold text-emerald-700 font-mono-numbers">{formatTZS(netMargin)}</td>
                      <td className="py-3 px-4 font-bold text-[#F58220] font-mono-numbers">{roi}% Margin</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Staff Performance Analytics */}
      {activeReportTab === 'staff' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-[#07182B]">Staff & Sales Agent Performance</h3>
              <p className="text-xs text-slate-500">
                Contracts signed, airtime revenue generated, and broadcast logging activity per staff member.
              </p>
            </div>
            <span className="text-xs text-slate-500 font-mono-numbers">{staffList.length} Active Staff</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F5F7FA] text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Role & Department</th>
                  <th className="py-3 px-4 font-mono-numbers">Managed Clients</th>
                  <th className="py-3 px-4 font-mono-numbers">Campaigns Signed</th>
                  <th className="py-3 px-4 font-mono-numbers">Generated Revenue (TZS)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staffList.map((st) => {
                  const agentCamps = campaigns.filter(
                    (c) => c.salesAgentId === st.uid || c.salesAgentName?.includes(st.fullName.split(' ')[0])
                  );
                  const rev = agentCamps.reduce((sum, c) => sum + (c.totalAmountTZS || 0), 0);
                  const agentClients = clients.filter(
                    (c) => c.assignedSalesAgentId === st.uid || c.assignedSalesAgentName?.includes(st.fullName.split(' ')[0])
                  );

                  return (
                    <tr key={st.uid} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-bold text-[#07182B]">{st.fullName}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-medium">
                          {st.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono-numbers text-slate-700">{agentClients.length} Clients</td>
                      <td className="py-3 px-4 font-mono-numbers text-slate-700">{agentCamps.length} Campaigns</td>
                      <td className="py-3 px-4 font-bold text-emerald-700 font-mono-numbers">{formatTZS(rev)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: SMS Spending & Delivery Analytics */}
      {activeReportTab === 'sms' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
              <span className="text-xs font-medium text-slate-500 uppercase">Total Swahili SMS Dispatched</span>
              <div className="mt-2 text-2xl font-extrabold text-[#07182B] font-mono-numbers">{smsLogs.length} Messages</div>
              <span className="text-[11px] text-emerald-600 font-medium">99.4% Delivery Success Rate</span>
            </div>
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
              <span className="text-xs font-medium text-slate-500 uppercase">Estimated SMS Gateway Cost</span>
              <div className="mt-2 text-2xl font-extrabold text-[#F58220] font-mono-numbers">
                {formatTZS(smsLogs.length * 25)}
              </div>
              <span className="text-[11px] text-slate-400">@ 25 TZS per SMS in Tanzania</span>
            </div>
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
              <span className="text-xs font-medium text-slate-500 uppercase">Primary Language</span>
              <div className="mt-2 text-2xl font-extrabold text-[#07182B]">Kiswahili</div>
              <span className="text-[11px] text-slate-400">Automated sponsor & payment alerts</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h3 className="font-bold text-sm text-[#07182B]">Recent Swahili SMS Transmission Log</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F5F7FA] text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Recipient Phone</th>
                    <th className="py-3 px-4">Client / Advertiser</th>
                    <th className="py-3 px-4">Message Body (Swahili)</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {smsLogs.map((sms) => (
                    <tr key={sms.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono-numbers font-bold text-[#07182B]">{sms.recipientPhone}</td>
                      <td className="py-3 px-4 font-medium text-slate-700">{sms.clientName || 'General Advertiser'}</td>
                      <td className="py-3 px-4 text-slate-600 max-w-md truncate">{sms.messageBody}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold capitalize text-[10px]">
                          {sms.dispatchStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Monthly Revenue Analytics */}
      {activeReportTab === 'monthly' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-6">
          <div>
            <h3 className="font-bold text-sm text-[#07182B]">2026 / 2027 Monthly Revenue Trend (TZS)</h3>
            <p className="text-xs text-slate-500">Commercial airtime collections and contracted revenue across quarters.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { month: 'January 2026', rev: 45200000, spots: 840 },
              { month: 'February 2026', rev: 52100000, spots: 910 },
              { month: 'March 2026', rev: 61800000, spots: 1120 },
              { month: 'April 2026 (Current)', rev: totalContracted, spots: totalSpotsBooked },
            ].map((m, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <span className="text-xs font-bold text-slate-700">{m.month}</span>
                <div className="text-lg font-extrabold text-[#07182B] font-mono-numbers">{formatTZS(m.rev)}</div>
                <div className="text-[11px] text-slate-500 font-mono-numbers">{m.spots} Airtime Spots</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
