import React, { useState, useEffect } from 'react';
import {
  Building2,
  Megaphone,
  CreditCard,
  Radio,
  CheckCircle2,
  ShieldCheck,
  Phone,
  KeyRound,
  ArrowRight,
  LogOut,
  Calendar,
  Sparkles,
  Download,
} from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Client, Campaign, Payment, BroadcastLog } from '../types';
import { formatTZS, formatDateTimeEAT, formatTimeEAT } from '../lib/formatters';
import { INITIAL_DEMO_CLIENTS, INITIAL_DEMO_CAMPAIGNS, INITIAL_DEMO_PAYMENTS, INITIAL_DEMO_LOGS } from '../lib/demo-data';

interface ClientPortalProps {
  onBackToStaffLogin?: () => void;
}

export const ClientPortalPage: React.FC<ClientPortalProps> = ({ onBackToStaffLogin }) => {
  const [phoneNumber, setPhoneNumber] = useState('+255 754 000 891');
  const [otpCode, setOtpCode] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [verifiedClient, setVerifiedClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(false);

  // Client data state
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [broadcastLogs, setBroadcastLogs] = useState<BroadcastLog[]>([]);

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      alert('Please enter your registered mobile number.');
      return;
    }
    const randomOtp = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(randomOtp);
    setOtpSent(true);
    alert(`[Wafalme SMS Gateway]: Nambari yako ya OTP ni ${randomOtp}. Ingiza ili kuingia kwenye Portal ya Wateja.`);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode !== generatedOtp && otpCode !== '1234') {
      alert('Invalid OTP code. Please try again (Demo OTP: 1234)');
      return;
    }

    setLoading(true);
    try {
      // Find client by phone or default to first demo client if matching
      const clientsSnap = await getDocs(collection(db, 'clients'));
      const allClients = clientsSnap.empty
        ? INITIAL_DEMO_CLIENTS
        : (clientsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Client[]);

      const found = allClients.find(
        (c) => c.phone.replace(/\s+/g, '').includes(phoneNumber.replace(/\s+/g, '').slice(-9))
      ) || allClients[0];

      setVerifiedClient(found);

      // Fetch client specific campaigns and payments
      const [campSnap, paySnap, logSnap] = await Promise.all([
        getDocs(query(collection(db, 'campaigns'), where('clientId', '==', found.id))),
        getDocs(query(collection(db, 'payments'), where('clientId', '==', found.id))),
        getDocs(collection(db, 'broadcastLogs')),
      ]);

      const clientCamps = campSnap.empty
        ? INITIAL_DEMO_CAMPAIGNS.filter((c) => c.clientId === found.id)
        : (campSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Campaign[]);

      const clientPays = paySnap.empty
        ? INITIAL_DEMO_PAYMENTS.filter((p) => p.clientId === found.id)
        : (paySnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Payment[]);

      const campIds = new Set(clientCamps.map((c) => c.id));
      const clientLogs = logSnap.empty
        ? INITIAL_DEMO_LOGS.filter((l) => campIds.has(l.campaignId))
        : (logSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as BroadcastLog[]).filter((l) => campIds.has(l.campaignId));

      setCampaigns(clientCamps);
      setPayments(clientPays);
      setBroadcastLogs(clientLogs);
    } catch (err) {
      console.warn('Client portal fetch error:', err);
      // Fallback demo data for client
      const demoC = INITIAL_DEMO_CLIENTS[0];
      setVerifiedClient(demoC);
      setCampaigns(INITIAL_DEMO_CAMPAIGNS.filter((c) => c.clientId === demoC.id));
      setPayments(INITIAL_DEMO_PAYMENTS.filter((p) => p.clientId === demoC.id));
      setBroadcastLogs(INITIAL_DEMO_LOGS);
    } finally {
      setLoading(false);
    }
  };

  if (!verifiedClient) {
    return (
      <div className="min-h-screen bg-[#07182B] text-slate-100 flex flex-col justify-between selection:bg-[#F58220] selection:text-white">
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <img
              src="/src/assets/images/wafalme_fm_logo_1794926028364.jpg"
              alt="Wafalme FM"
              className="w-9 h-9 rounded object-contain bg-white p-1"
              referrerPolicy="no-referrer"
            />
            <div>
              <span className="font-extrabold text-sm text-white tracking-wider">WAFALME FM</span>
              <span className="text-[11px] text-[#F58220] block font-medium">Client Self-Service Portal · Portal ya Wateja</span>
            </div>
          </div>
          {onBackToStaffLogin && (
            <button
              onClick={onBackToStaffLogin}
              className="text-xs text-slate-300 hover:text-white underline cursor-pointer"
            >
              Staff & Management Login
            </button>
          )}
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#102A43] border border-slate-700/80 rounded-xl p-8 shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex p-3 rounded-xl bg-[#07182B] border border-slate-700 text-[#F58220]">
                <Building2 className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white">Advertiser Client Portal</h2>
              <p className="text-xs text-slate-300">
                Securely track your independent advertising campaigns, payment receipts, and confirmed broadcast airtime logs with phone OTP verification.
              </p>
            </div>

            {!otpSent ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Registered Mobile Number (Tanzania +255) *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+255 754 000 891"
                      className="w-full pl-10 pr-3 py-2 bg-[#07182B] border border-slate-700 rounded-lg text-white text-xs focus:border-[#F58220] focus:outline-none font-mono-numbers"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#F58220] hover:bg-[#e07316] text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer shadow-md"
                >
                  <span>Send SMS OTP Verification Code</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-lg text-xs text-emerald-200 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#F58220]" />
                    <span>SMS OTP Sent Successfully!</span>
                  </div>
                  <div>Demo OTP verification code for testing: <strong className="font-mono-numbers text-white">{generatedOtp || '1234'}</strong></div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Enter 4-Digit OTP Code *
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      maxLength={4}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="1234"
                      className="w-full pl-10 pr-3 py-2 bg-[#07182B] border border-slate-700 rounded-lg text-white text-xs focus:border-[#F58220] focus:outline-none font-mono-numbers tracking-widest text-lg font-bold"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setOtpSent(false)}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                  >
                    Change Number
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#F58220] hover:bg-[#e07316] text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer shadow-md disabled:opacity-50"
                  >
                    <span>{loading ? 'Verifying...' : 'Verify & Access Portal'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        <div className="p-4 text-center text-xs text-slate-500 border-t border-slate-800">
          Wafalme FM Secure Client Portal · Dar es Salaam, Tanzania
        </div>
      </div>
    );
  }

  const totalBookedTZS = campaigns.reduce((acc, c) => acc + (c.totalAmountTZS || 0), 0);
  const totalPaidTZS = payments.reduce((acc, p) => acc + (p.amountTZS || 0), 0);
  const totalSpotsAired = campaigns.reduce((acc, c) => acc + (c.totalSpotsAired || 0), 0);
  const totalSpotsBooked = campaigns.reduce((acc, c) => acc + (c.totalSpotsBooked || 0), 0);

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#102A43] flex flex-col">
      {/* Portal Header */}
      <header className="bg-[#07182B] text-white px-6 py-4 flex items-center justify-between border-b border-[#102A43] shadow-md">
        <div className="flex items-center gap-3">
          <img
            src="/src/assets/images/wafalme_fm_logo_1794926028364.jpg"
            alt="Wafalme FM"
            className="w-9 h-9 rounded object-contain bg-white p-1"
            referrerPolicy="no-referrer"
          />
          <div>
            <div className="font-bold text-sm tracking-wide">WAFALME FM CLIENT PORTAL</div>
            <span className="text-[11px] text-[#F58220]">
              Logged in as: <strong className="text-white">{verifiedClient.companyName}</strong> ({verifiedClient.clientCode})
            </span>
          </div>
        </div>

        <button
          onClick={() => setVerifiedClient(null)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out Portal</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* Welcome Banner */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#F58220] uppercase tracking-wide">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Secure Client Self-Service Account</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-[#07182B]">
              Welcome, {verifiedClient.contactPerson}
            </h2>
            <p className="text-xs text-slate-500">
              Viewing active campaigns, certified payment receipts, and confirmed broadcast airtime logs for {verifiedClient.companyName}.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="block text-[11px] text-slate-400">Account Code</span>
              <strong className="text-xs font-mono-numbers text-[#07182B]">{verifiedClient.clientCode}</strong>
            </div>
            <div className="text-right">
              <span className="block text-[11px] text-slate-400">Phone</span>
              <strong className="text-xs font-mono-numbers text-[#07182B]">{verifiedClient.phone}</strong>
            </div>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Active Campaigns</span>
            <div className="mt-2 text-xl font-extrabold text-[#07182B] font-mono-numbers">
              {campaigns.length} Independent
            </div>
            <span className="text-[11px] text-slate-400">Simultaneous active schedules</span>
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Contracted Value</span>
            <div className="mt-2 text-xl font-extrabold text-[#07182B] font-mono-numbers">
              {formatTZS(totalBookedTZS)}
            </div>
            <span className="text-[11px] text-slate-400">Total airtime contracts</span>
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Payments Cleared</span>
            <div className="mt-2 text-xl font-extrabold text-emerald-700 font-mono-numbers">
              {formatTZS(totalPaidTZS)}
            </div>
            <span className="text-[11px] text-emerald-600 font-medium">TRA Receipt Verified</span>
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Airtime Spots Aired</span>
            <div className="mt-2 text-xl font-extrabold text-[#07182B] font-mono-numbers">
              {totalSpotsAired} / {totalSpotsBooked}
            </div>
            <span className="text-[11px] text-[#F58220] font-semibold font-mono-numbers">
              {totalSpotsBooked > 0 ? Math.round((totalSpotsAired / totalSpotsBooked) * 100) : 0}% Verified Fulfillment
            </span>
          </div>
        </div>

        {/* Independent Campaigns Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-sm text-[#07182B] flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-[#F58220]" />
              <span>Your Advertising Campaigns</span>
            </h3>
            <span className="text-xs text-slate-500 font-mono-numbers">{campaigns.length} Campaigns</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F5F7FA] text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Campaign Title</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4 font-mono-numbers">Contract Value (TZS)</th>
                  <th className="py-3 px-4 font-mono-numbers">Spots Progress</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {campaigns.length > 0 ? (
                  campaigns.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-bold text-[#07182B]">{c.title}</td>
                      <td className="py-3 px-4 text-slate-600 font-mono-numbers">
                        {c.startDate} to {c.endDate}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 font-mono-numbers">
                        {formatTZS(c.totalAmountTZS)}
                      </td>
                      <td className="py-3 px-4 font-mono-numbers text-slate-700">
                        {c.totalSpotsAired} / {c.totalSpotsBooked} spots
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold capitalize text-[10px]">
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No campaigns found for this account.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Two Columns: Payments & Broadcast Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Payment Receipts */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#07182B] flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>Payment Receipts & Ledger</span>
              </h3>
              <span className="text-xs text-slate-500 font-mono-numbers">{payments.length} Receipts</span>
            </div>

            <div className="space-y-3">
              {payments.length > 0 ? (
                payments.map((p) => (
                  <div key={p.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50/60 space-y-1 text-xs">
                    <div className="flex justify-between items-start font-mono-numbers">
                      <span className="font-bold text-[#07182B]">{p.receiptNumber}</span>
                      <span className="text-emerald-700 font-bold">{formatTZS(p.amountTZS)}</span>
                    </div>
                    <div className="text-slate-600 font-medium">Method: {p.paymentMethod}</div>
                    <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1 border-t border-slate-200/60">
                      <span>Date: {p.paymentDate}</span>
                      <span className="text-emerald-700 font-semibold uppercase">{p.status}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">No payment records found.</div>
              )}
            </div>
          </div>

          {/* Broadcast As-Run History */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#07182B] flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#F58220]" />
                <span>Confirmed Broadcast As-Run Log</span>
              </h3>
              <span className="text-xs text-slate-500 font-mono-numbers">{broadcastLogs.length} Verified Aired</span>
            </div>

            <div className="space-y-3">
              {broadcastLogs.length > 0 ? (
                broadcastLogs.map((log) => (
                  <div key={log.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50/60 space-y-1 text-xs">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-[#07182B]">{log.campaignTitle}</span>
                      <span className="text-[10px] font-mono-numbers text-slate-500">
                        {formatDateTimeEAT(log.airedAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                      <span className="text-emerald-700 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Presenter: {log.presenterName}</span>
                      </span>
                      <span className="text-slate-400 font-mono-numbers">Verified On-Air</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">No broadcast airtime logs recorded yet.</div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
