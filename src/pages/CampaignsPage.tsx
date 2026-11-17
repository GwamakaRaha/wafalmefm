import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  Plus,
  Search,
  Calendar,
  Layers,
  Building2,
  DollarSign,
  CheckCircle2,
  Clock,
  Play,
  Pause,
  CheckCircle,
  FileText,
  Volume2,
  ShieldCheck,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { collection, getDocs, addDoc, updateDoc, doc, runTransaction } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Campaign, Client, AdvertisingPackage, BroadcastLog, PageId, CampaignStatus } from '../types';
import { formatDate, formatTZS, formatDateTimeEAT } from '../lib/formatters';
import { logAuditEvent } from '../services/audit-service';
import {
  INITIAL_DEMO_CAMPAIGNS,
  INITIAL_DEMO_CLIENTS,
  INITIAL_DEMO_PACKAGES,
  INITIAL_DEMO_LOGS,
} from '../lib/demo-data';

interface CampaignsPageProps {
  onNavigate: (page: PageId) => void;
}

export const CampaignsPage: React.FC<CampaignsPageProps> = ({ onNavigate }) => {
  const { user, staff, permissions } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>(INITIAL_DEMO_CAMPAIGNS);
  const [clients, setClients] = useState<Client[]>(INITIAL_DEMO_CLIENTS);
  const [packages, setPackages] = useState<AdvertisingPackage[]>(INITIAL_DEMO_PACKAGES);
  const [broadcastLogs, setBroadcastLogs] = useState<BroadcastLog[]>(INITIAL_DEMO_LOGS);

  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(INITIAL_DEMO_CAMPAIGNS[0] || null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showAudioModal, setShowAudioModal] = useState(false);

  // Form states for Campaign Creation
  const [clientId, setClientId] = useState(INITIAL_DEMO_CLIENTS[0]?.id || '');
  const [title, setTitle] = useState('');
  const [packageId, setPackageId] = useState(INITIAL_DEMO_PACKAGES[0]?.id || '');
  const [totalSpotsBooked, setTotalSpotsBooked] = useState(30);
  const [totalAmountTZS, setTotalAmountTZS] = useState(3600000);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );
  const [scriptNotes, setScriptNotes] = useState('');
  const [audioCreativeUrl, setAudioCreativeUrl] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = async () => {
    if (!auth.currentUser) return;
    try {
      setLoading(true);
      const [campSnap, cSnap, pkgSnap, logSnap] = await Promise.all([
        getDocs(collection(db, 'campaigns')),
        getDocs(collection(db, 'clients')),
        getDocs(collection(db, 'packages')),
        getDocs(collection(db, 'broadcastLogs')),
      ]);

      if (!campSnap.empty) {
        const list = campSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Campaign[];
        setCampaigns(list);
        if (list.length > 0 && (!selectedCampaign || !list.some(c => c.id === selectedCampaign.id))) {
          setSelectedCampaign(list[0]);
        }
      }
      if (!cSnap.empty) setClients(cSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Client[]);
      if (!pkgSnap.empty) setPackages(pkgSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as AdvertisingPackage[]);
      if (!logSnap.empty) setBroadcastLogs(logSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as BroadcastLog[]);
    } catch (e) {
      console.warn('Error loading campaigns:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Handle package selection to auto-calculate price
  const handlePackageChange = (pId: string) => {
    setPackageId(pId);
    const pkg = packages.find((p) => p.id === pId);
    if (pkg) {
      setTotalSpotsBooked(pkg.spotCount);
      setTotalAmountTZS(pkg.priceTZS * pkg.spotCount);
    }
  };

  // Create Campaign with unique campaign ID and client reference
  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !clientId) {
      setFormError('Please provide a campaign title and select an advertiser client.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const client = clients.find((c) => c.id === clientId);
    const selectedPkg = packages.find((p) => p.id === packageId);
    const campaignCode = `WFM-2026-${Math.floor(Math.random() * 9000) + 1000}`;
    const quotationNumber = `WFM-QTE-${Math.floor(Math.random() * 90000) + 10000}`;

    const newCampaign: Campaign = {
      id: `camp_${Date.now()}`,
      campaignCode,
      clientId,
      clientName: client?.companyName || 'Corporate Client',
      title,
      packageId,
      packageName: selectedPkg?.name || 'Commercial Spot Rotation',
      salesAgentId: user?.uid || 'agent_1',
      salesAgentName: staff?.fullName || 'Juma Mwamburi',
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      totalSpotsBooked: Number(totalSpotsBooked),
      totalSpotsAired: 0, // derived strictly from confirmed broadcast logs
      totalAmountTZS: Number(totalAmountTZS),
      paidAmountTZS: 0,
      status: 'active',
      audioCreativeUrl: audioCreativeUrl || 'https://wafalmefm.co.tz/audio/default_spot.mp3',
      scriptNotes: scriptNotes || 'Standard 30-sec commercial spot with station call-out.',
      quotationNumber,
      createdAt: new Date().toISOString(),
    };

    if (!auth.currentUser) {
      setCampaigns([newCampaign, ...campaigns]);
      setSelectedCampaign(newCampaign);
      setShowAddModal(false);
      resetForm();
      setSubmitting(false);
      return;
    }

    try {
      await updateDoc(doc(db, 'campaigns', newCampaign.id), {}).catch(() => {
        // create via setDoc or addDoc
      });
      await addDoc(collection(db, 'campaigns'), newCampaign);

      await logAuditEvent({
        performedByUid: user?.uid || '',
        performedByEmail: user?.email || '',
        action: 'CREATE_CAMPAIGN',
        targetCollection: 'campaigns',
        targetDocumentId: newCampaign.id,
        details: `Created campaign ${title} (${campaignCode}) for client ${newCampaign.clientName} worth ${formatTZS(newCampaign.totalAmountTZS)}`,
      });

      setShowAddModal(false);
      resetForm();
      await loadData();
      setSelectedCampaign(newCampaign);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Campaign Lifecycle Action (Activate, Pause, Complete, Cancel) using Transactions
  const handleUpdateStatus = async (campId: string, newStatus: CampaignStatus) => {
    const target = campaigns.find((c) => c.id === campId);
    if (!target) return;

    if (!auth.currentUser) {
      const updated = { ...target, status: newStatus, updatedAt: new Date().toISOString() };
      setCampaigns(campaigns.map((c) => (c.id === campId ? updated : c)));
      if (selectedCampaign?.id === campId) setSelectedCampaign(updated);
      return;
    }

    try {
      await runTransaction(db, async (transaction) => {
        const campRef = doc(db, 'campaigns', campId);
        transaction.update(campRef, {
          status: newStatus,
          updatedAt: new Date().toISOString(),
        });
      });

      await logAuditEvent({
        performedByUid: user?.uid || '',
        performedByEmail: user?.email || '',
        action: `CAMPAIGN_STATUS_${newStatus.toUpperCase()}`,
        targetCollection: 'campaigns',
        targetDocumentId: campId,
        details: `Changed campaign status to ${newStatus}`,
      });

      await loadData();
      if (selectedCampaign?.id === campId) {
        setSelectedCampaign({ ...selectedCampaign, status: newStatus });
      }
    } catch (err) {
      console.error('Transaction failed for campaign status update:', err);
    }
  };

  const resetForm = () => {
    setTitle('');
    setScriptNotes('');
    setAudioCreativeUrl('');
  };

  // Filter campaigns
  const filteredCampaigns = campaigns.filter((c) => {
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesSearch =
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.campaignCode.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#F58220] uppercase tracking-wide">
            <Megaphone className="w-4 h-4" />
            <span>Commercial Contracts & Broadcast Engine</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[#07182B]">
            Campaign Management & Airtime Engine
          </h2>
          <p className="text-xs text-slate-500">
            Unlimited campaigns per client with package assignment, custom TZS pricing, quotation generation, and isolated broadcast log progress.
          </p>
        </div>

        {permissions.canCreateCampaigns && (
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="px-4 py-2 bg-[#F58220] hover:bg-[#e07316] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Book New Campaign</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search campaign title, code, or client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#07182B]"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto p-1 bg-slate-100 rounded-lg">
          {['all', 'active', 'completed', 'pending_approval', 'paused', 'cancelled'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-[11px] font-medium rounded transition-colors whitespace-nowrap capitalize cursor-pointer ${
                statusFilter === st
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Campaigns List */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-3.5 border-b border-slate-100 bg-[#F5F7FA] flex items-center justify-between text-xs font-bold text-[#07182B]">
              <span>Active & Queued Campaigns</span>
              <span className="font-mono-numbers text-slate-500">{filteredCampaigns.length} Total</span>
            </div>

            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-xs text-slate-400">Loading campaigns...</div>
              ) : filteredCampaigns.length > 0 ? (
                filteredCampaigns.map((camp) => {
                  // Strictly compute progress from broadcastLogs matching camp.id
                  const actualAired = broadcastLogs.filter(
                    (l) => l.campaignId === camp.id && l.verified
                  ).length;
                  const percent =
                    camp.totalSpotsBooked > 0
                      ? Math.min(100, Math.round((actualAired / camp.totalSpotsBooked) * 100))
                      : 0;
                  const isSelected = selectedCampaign?.id === camp.id;

                  return (
                    <div
                      key={camp.id}
                      onClick={() => setSelectedCampaign(camp)}
                      className={`p-4 cursor-pointer transition-colors text-xs ${
                        isSelected
                          ? 'bg-[#07182B] text-white shadow-xs'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-sm tracking-tight">{camp.title}</div>
                          <div
                            className={`text-[11px] font-mono-numbers ${
                              isSelected ? 'text-[#F58220]' : 'text-slate-500'
                            }`}
                          >
                            {camp.campaignCode} · {camp.clientName}
                          </div>
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${
                            camp.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : camp.status === 'paused'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {camp.status}
                        </span>
                      </div>

                      <div className="mt-2.5 space-y-1">
                        <div
                          className={`flex justify-between text-[11px] font-mono-numbers ${
                            isSelected ? 'text-slate-300' : 'text-slate-500'
                          }`}
                        >
                          <span>Progress: {actualAired} / {camp.totalSpotsBooked} spots</span>
                          <span>{percent}%</span>
                        </div>
                        <div className={`w-full h-1.5 rounded-full overflow-hidden ${isSelected ? 'bg-slate-700' : 'bg-slate-200'}`}>
                          <div
                            className="bg-[#F58220] h-full rounded-full"
                            style={{ width: `${percent}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-xs text-slate-400">
                  No campaigns found matching filter.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (2 cols): Selected Campaign Detailed Engine */}
        <div className="lg:col-span-2 space-y-6">
          {selectedCampaign ? (
            <>
              {/* Campaign Details & Lifecycle Header Card */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-[#07182B]">{selectedCampaign.title}</h3>
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono-numbers bg-slate-100 text-slate-700 font-semibold">
                        {selectedCampaign.campaignCode}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Advertiser Client: <strong className="text-slate-700">{selectedCampaign.clientName}</strong> · Package: <strong className="text-slate-700">{selectedCampaign.packageName || 'Standard Spot'}</strong>
                    </p>
                  </div>

                  {/* Lifecycle Buttons */}
                  <div className="flex items-center gap-1.5">
                    {selectedCampaign.status !== 'active' && (
                      <button
                        onClick={() => handleUpdateStatus(selectedCampaign.id, 'active')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Activate</span>
                      </button>
                    )}
                    {selectedCampaign.status === 'active' && (
                      <button
                        onClick={() => handleUpdateStatus(selectedCampaign.id, 'paused')}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Pause className="w-3.5 h-3.5 fill-current" />
                        <span>Suspend</span>
                      </button>
                    )}
                    {selectedCampaign.status !== 'completed' && (
                      <button
                        onClick={() => handleUpdateStatus(selectedCampaign.id, 'completed')}
                        className="px-3 py-1.5 bg-[#07182B] hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Complete</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Financial & Airtime Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono-numbers">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[11px]">Contract Value (TZS)</span>
                    <span className="font-bold text-[#07182B] text-sm">
                      {formatTZS(selectedCampaign.totalAmountTZS)}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[11px]">Paid Amount (TZS)</span>
                    <span className="font-bold text-emerald-700 text-sm">
                      {formatTZS(selectedCampaign.paidAmountTZS || 0)}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[11px]">Spots Fulfillment</span>
                    <span className="font-bold text-[#07182B] text-sm">
                      {broadcastLogs.filter((l) => l.campaignId === selectedCampaign.id && l.verified).length} / {selectedCampaign.totalSpotsBooked}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[11px]">Flight Duration</span>
                    <span className="font-bold text-slate-700 text-xs">
                      {formatDate(selectedCampaign.startDate)} — {formatDate(selectedCampaign.endDate)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quotation & Invoice Card */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="font-bold text-sm text-[#07182B] flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#F58220]" />
                    Official Quotation & Pro-Forma Invoice
                  </h4>
                  <span className="font-mono-numbers text-xs text-slate-500 font-semibold">
                    {selectedCampaign.quotationNumber || 'Wafalme-QTE-89104'}
                  </span>
                </div>

                <div className="p-4 bg-[#07182B] text-white rounded-xl space-y-3 text-xs">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <span>Station: Wafalme FM Radio Operations</span>
                    <span className="text-[#F58220] font-semibold">TZS Currency</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-slate-300">
                    <div>
                      <span className="text-slate-400 block">Client:</span>
                      <strong className="text-white">{selectedCampaign.clientName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Sales Agent:</span>
                      <strong className="text-white">{selectedCampaign.salesAgentName || 'Juma Mwamburi'}</strong>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-sm font-bold font-mono-numbers">
                    <span>Total Billable (Incl. 18% VAT):</span>
                    <span className="text-[#F58220]">{formatTZS(selectedCampaign.totalAmountTZS)}</span>
                  </div>
                </div>
              </div>

              {/* Audio Creative & Script Directions */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="font-bold text-sm text-[#07182B] flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-[#F58220]" />
                    Audio Creative & Swahili Script Notes
                  </h4>
                  <span className="text-xs text-emerald-700 font-medium">Studio Master Approved</span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                    <span className="text-slate-400 font-mono-numbers block text-[11px]">Audio File Reference:</span>
                    <a
                      href={selectedCampaign.audioCreativeUrl || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline font-mono-numbers truncate block"
                    >
                      {selectedCampaign.audioCreativeUrl || 'https://wafalmefm.co.tz/audio/default_spot.mp3'}
                    </a>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                    <span className="text-slate-400 font-mono-numbers block text-[11px]">Commercial Script Directions:</span>
                    <p className="text-slate-800 italic font-medium">
                      "{selectedCampaign.scriptNotes || 'Standard 30-sec commercial spot with station call-out.'}"
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-xs text-slate-400">
              Select a campaign from the list to view specifications and broadcast fulfillment.
            </div>
          )}
        </div>
      </div>

      {/* Book New Campaign Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-[#07182B]">Book Independent Advertising Campaign</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-700 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateCampaign} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Advertiser Client *</label>
                <select
                  required
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#07182B] focus:outline-none bg-white"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName} ({c.contactPerson})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-500">
                  Clients support unlimited independent concurrent campaigns.
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Campaign Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Serengeti Lite Weekend Derby Live"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#07182B] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Rate Card Package</label>
                <select
                  value={packageId}
                  onChange={(e) => handlePackageChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#07182B] focus:outline-none bg-white"
                >
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} ({pkg.spotCount} spots · {formatTZS(pkg.priceTZS * pkg.spotCount)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Spots Booked</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={totalSpotsBooked}
                    onChange={(e) => setTotalSpotsBooked(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#07182B] focus:outline-none font-mono-numbers"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Custom Price (TZS)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={totalAmountTZS}
                    onChange={(e) => setTotalAmountTZS(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#07182B] focus:outline-none font-mono-numbers"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Start Flight Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#07182B] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">End Flight Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#07182B] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Commercial Script Notes</label>
                <textarea
                  rows={2}
                  placeholder="Swahili/English script directions..."
                  value={scriptNotes}
                  onChange={(e) => setScriptNotes(e.target.value)}
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
                  className="px-4 py-1.5 bg-[#F58220] hover:bg-[#e07316] text-white font-semibold rounded disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Booking...' : 'Book Campaign & Generate Quote'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
