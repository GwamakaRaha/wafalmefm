import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Building2,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { collection, getDocs, addDoc, updateDoc, doc, increment } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Payment, Campaign, PaymentMethod } from '../types';
import { formatDate, formatTZS } from '../lib/formatters';
import { logAuditEvent } from '../services/audit-service';
import { INITIAL_DEMO_PAYMENTS, INITIAL_DEMO_CAMPAIGNS } from '../lib/demo-data';

export const PaymentsPage: React.FC = () => {
  const { user, staff, permissions } = useAuth();
  const [payments, setPayments] = useState<Payment[]>(INITIAL_DEMO_PAYMENTS);
  const [campaigns, setCampaigns] = useState<Campaign[]>(INITIAL_DEMO_CAMPAIGNS);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [campaignId, setCampaignId] = useState(INITIAL_DEMO_CAMPAIGNS[0]?.id || '');
  const [amountTZS, setAmountTZS] = useState(1500000);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Bank Transfer');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    if (!auth.currentUser) {
      return;
    }
    try {
      setLoading(true);
      const [paySnap, campSnap] = await Promise.all([
        getDocs(collection(db, 'payments')),
        getDocs(collection(db, 'campaigns')),
      ]);

      if (!paySnap.empty) {
        setPayments(paySnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Payment[]);
      }
      if (!campSnap.empty) {
        const campList = campSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Campaign[];
        setCampaigns(campList);
        if (campList.length > 0 && !campaignId) {
          setCampaignId(campList[0].id);
        }
      }
    } catch (e) {
      console.warn('Load payments error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignId || !amountTZS || !user) return;
    setSubmitting(true);

    const selectedCamp = campaigns.find((c) => c.id === campaignId);
    const receipt = `WFM-RCT-${Math.floor(Math.random() * 9000) + 1000}`;
    const nowIso = new Date().toISOString();

    try {
      const paymentData = {
        receiptNumber: receipt,
        campaignId,
        campaignTitle: selectedCamp?.title || 'Advertising Campaign',
        clientId: selectedCamp?.clientId || '',
        clientName: selectedCamp?.clientName || 'Advertiser',
        amountTZS: Number(amountTZS),
        paymentMethod,
        referenceNumber: referenceNumber || `REF-${Date.now().toString().slice(-6)}`,
        recordedByUid: user.uid,
        recordedByName: staff?.fullName || 'Finance Office',
        paymentDate: nowIso,
        status: 'verified' as const,
        notes,
        createdAt: nowIso,
      };

      if (!auth.currentUser) {
        const localPay: Payment = {
          id: `pay_${Date.now()}`,
          ...paymentData,
        };
        setPayments([localPay, ...payments]);
        setShowAddModal(false);
        setReferenceNumber('');
        setNotes('');
        return;
      }

      const docRef = await addDoc(collection(db, 'payments'), paymentData);

      // Increment campaign's paidAmountTZS
      await updateDoc(doc(db, 'campaigns', campaignId), {
        paidAmountTZS: increment(Number(amountTZS)),
        updatedAt: nowIso,
      });

      // Log Swahili SMS receipt notification
      await addDoc(collection(db, 'smsLogs'), {
        clientId: selectedCamp?.clientId || '',
        clientName: selectedCamp?.clientName || '',
        recipientPhone: '+255 754 000 891',
        messageBody: `Wafalme FM: Tumepokea malipo yako ya ${formatTZS(
          Number(amountTZS)
        )} kwa Kampeni '${selectedCamp?.title}'. Risiti Namba: ${receipt}. Ahsante sana.`,
        templateType: 'payment_receipt',
        dispatchStatus: 'delivered',
        dispatchedAt: nowIso,
        createdAt: nowIso,
      });

      await logAuditEvent({
        performedByUid: user.uid,
        performedByEmail: user.email || '',
        action: 'RECORD_PAYMENT',
        targetCollection: 'payments',
        targetDocumentId: docRef.id,
        details: `Recorded verified payment of ${formatTZS(Number(amountTZS))} via ${paymentMethod} for ${selectedCamp?.clientName}`,
      });

      setShowAddModal(false);
      setReferenceNumber('');
      setNotes('');
      await loadData();
    } catch (err) {
      console.error('Record payment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const totalCollected = payments.reduce((acc, p) => acc + (p.amountTZS || 0), 0);

  const filteredPayments = payments.filter(
    (p) =>
      p.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.referenceNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#F58220] uppercase tracking-wide">
            <CreditCard className="w-4 h-4" />
            <span>Commercial Finance & Accounts Receivable</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[#07182B]">
            Payments & Collections Ledger
          </h2>
          <p className="text-xs text-slate-500">
            Official Tanzanian Shillings financial transactions, M-Pesa receipts, and bank deposit reconciliations.
          </p>
        </div>

        {permissions.canRecordPayments && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-[#F58220] hover:bg-[#e07316] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record Payment</span>
          </button>
        )}
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Total Collections (All-Time)
          </span>
          <div className="mt-2 text-xl font-extrabold text-[#07182B] font-mono-numbers">
            {formatTZS(totalCollected)}
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">100% verified ledger</span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Receipts Issued
          </span>
          <div className="mt-2 text-xl font-extrabold text-[#07182B] font-mono-numbers">
            {payments.length} Official Receipts
          </div>
          <span className="text-[11px] text-slate-400">Electronic TRA compliant numbering</span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Primary Payment Channels
          </span>
          <div className="mt-2 text-xs text-slate-700 font-medium space-y-0.5">
            <div>Bank Transfer (RTGS / TISS)</div>
            <div>Vodacom M-Pesa & Tigo Pesa</div>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between text-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search receipt, client, or reference..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-[#07182B]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F5F7FA] text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Receipt #</th>
                <th className="py-3 px-4">Advertiser Client</th>
                <th className="py-3 px-4">Payment Method & Ref</th>
                <th className="py-3 px-4">Amount (TZS)</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Recorded By</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading payments...
                  </td>
                </tr>
              ) : filteredPayments.length > 0 ? (
                filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-[#07182B] font-mono-numbers">
                      {p.receiptNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{p.clientName}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs">
                        {p.campaignTitle}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{p.paymentMethod}</div>
                      <div className="text-[11px] text-slate-400 font-mono-numbers">
                        {p.referenceNumber}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-700 font-mono-numbers">
                      {formatTZS(p.amountTZS)}
                    </td>
                    <td className="py-3 px-4 font-mono-numbers text-slate-600">
                      {formatDate(p.paymentDate)}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {p.recordedByName || 'Finance'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 font-semibold text-[11px] text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Verified</span>
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No payment records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-[#07182B]">Record Commercial Payment</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Campaign Contract *
                </label>
                <select
                  required
                  value={campaignId}
                  onChange={(e) => setCampaignId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#07182B] focus:outline-none bg-white"
                >
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.clientName} — {c.title} ({formatTZS(c.totalAmountTZS)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Amount Received (TZS) *
                </label>
                <input
                  type="number"
                  required
                  min={1000}
                  value={amountTZS}
                  onChange={(e) => setAmountTZS(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#07182B] focus:outline-none font-mono-numbers"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#07182B] focus:outline-none bg-white"
                >
                  <option value="Bank Transfer">Bank Transfer (TISS / RTGS)</option>
                  <option value="M-Pesa">Vodacom M-Pesa</option>
                  <option value="Tigo Pesa">Tigo Pesa</option>
                  <option value="Airtel Money">Airtel Money</option>
                  <option value="Cheque">Bank Cheque</option>
                  <option value="Cash">Cash at Station Counter</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Transaction / Bank Ref Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. CRDB-TXN-998811 or MP-772911"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#07182B] focus:outline-none font-mono-numbers"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Internal Notes</label>
                <textarea
                  rows={2}
                  placeholder="Cleared via commercial finance account..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#07182B] focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-[#F58220] hover:bg-[#e07316] text-white font-semibold rounded disabled:opacity-50"
                >
                  {submitting ? 'Recording...' : 'Record Payment & Issue Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
