import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Search,
  Phone,
  Mail,
  FileText,
  Megaphone,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Clock,
  User,
  Edit3,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Shield,
  Briefcase,
} from 'lucide-react';
import { collection, getDocs, addDoc, updateDoc, doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Client, Campaign, ClientContactLog, PageId } from '../types';
import { formatDate, formatDateTimeEAT, formatTZS } from '../lib/formatters';
import { logAuditEvent } from '../services/audit-service';
import { INITIAL_DEMO_CLIENTS, INITIAL_DEMO_CAMPAIGNS } from '../lib/demo-data';

interface ClientsPageProps {
  onNavigate: (page: PageId) => void;
}

export const ClientsPage: React.FC<ClientsPageProps> = ({ onNavigate }) => {
  const { user, staff, permissions } = useAuth();
  const [clients, setClients] = useState<Client[]>(INITIAL_DEMO_CLIENTS);
  const [campaigns, setCampaigns] = useState<Campaign[]>(INITIAL_DEMO_CAMPAIGNS);
  const [selectedClient, setSelectedClient] = useState<Client | null>(INITIAL_DEMO_CLIENTS[0] || null);
  
  // Search, Filters & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [industryFilter, setIndustryFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  // Form states for Registration / Editing
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+255 ');
  const [industry, setIndustry] = useState('Telecommunications');
  const [tinNumber, setTinNumber] = useState('');
  const [vrnNumber, setVrnNumber] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive' | 'prospect'>('active');
  const [notes, setNotes] = useState('');

  // Contact history form state
  const [contactType, setContactType] = useState<ClientContactLog['type']>('Phone Call');
  const [contactSummary, setContactSummary] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = async () => {
    if (!auth.currentUser) {
      return;
    }
    try {
      setLoading(true);
      const [cSnap, campSnap] = await Promise.all([
        getDocs(collection(db, 'clients')),
        getDocs(collection(db, 'campaigns')),
      ]);

      if (!cSnap.empty) {
        const clientList = cSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Client[];
        setClients(clientList);
        if (clientList.length > 0 && (!selectedClient || !clientList.some(c => c.id === selectedClient.id))) {
          setSelectedClient(clientList[0]);
        }
      }
      if (!campSnap.empty) {
        const campList = campSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Campaign[];
        setCampaigns(campList);
      }
    } catch (e) {
      console.warn('Error loading clients from Firestore:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Open edit modal with client data
  const handleOpenEdit = (client: Client) => {
    setSelectedClient(client);
    setCompanyName(client.companyName);
    setContactPerson(client.contactPerson);
    setEmail(client.email || '');
    setPhone(client.phone || '+255 ');
    setIndustry(client.industry || 'Telecommunications');
    setTinNumber(client.tinNumber || '');
    setVrnNumber(client.vrnNumber || '');
    setStatus(client.status || 'active');
    setNotes(client.notes || '');
    setShowEditModal(true);
  };

  // Unique Client ID generator
  const generateClientCode = () => {
    const randomNum = Math.floor(Math.random() * 9000) + 1000;
    return `WFM-CLI-${randomNum}`;
  };

  // Register Client CRUD
  const handleRegisterClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !contactPerson || !phone) {
      setErrorMsg('Please complete company name, contact person, and phone.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const clientCode = generateClientCode();
    const newClient: Client = {
      id: `client_${Date.now()}`,
      clientCode,
      companyName,
      contactPerson,
      email,
      phone,
      industry,
      tinNumber,
      vrnNumber,
      assignedSalesAgentId: user?.uid || '',
      assignedSalesAgentName: staff?.fullName || 'Juma Mwamburi',
      status,
      notes,
      contactHistory: [
        {
          id: `log_${Date.now()}`,
          date: new Date().toISOString(),
          type: 'Proposal Sent',
          summary: 'Client onboarded into Wafalme FM CRM system.',
          staffName: staff?.fullName || 'Sales Team',
        },
      ],
      createdAt: new Date().toISOString(),
    };

    if (!auth.currentUser) {
      setClients([newClient, ...clients]);
      setSelectedClient(newClient);
      setShowAddModal(false);
      resetForm();
      setSubmitting(false);
      return;
    }

    try {
      await setDoc(doc(db, 'clients', newClient.id), newClient);

      await logAuditEvent({
        performedByUid: user?.uid || '',
        performedByEmail: user?.email || '',
        action: 'CREATE_CLIENT',
        targetCollection: 'clients',
        targetDocumentId: newClient.id,
        details: `Registered advertiser client ${companyName} (${clientCode})`,
      });

      setShowAddModal(false);
      resetForm();
      await loadData();
      setSelectedClient(newClient);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Update Client CRUD
  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;

    setSubmitting(true);
    setErrorMsg(null);

    const updatedData: Partial<Client> = {
      companyName,
      contactPerson,
      email,
      phone,
      industry,
      tinNumber,
      vrnNumber,
      status,
      notes,
      updatedAt: new Date().toISOString(),
    };

    if (!auth.currentUser) {
      const updated = { ...selectedClient, ...updatedData };
      setClients(clients.map((c) => (c.id === selectedClient.id ? updated : c)));
      setSelectedClient(updated);
      setShowEditModal(false);
      setSubmitting(false);
      return;
    }

    try {
      await updateDoc(doc(db, 'clients', selectedClient.id), updatedData);

      await logAuditEvent({
        performedByUid: user?.uid || '',
        performedByEmail: user?.email || '',
        action: 'UPDATE_CLIENT',
        targetCollection: 'clients',
        targetDocumentId: selectedClient.id,
        details: `Updated advertiser client profile for ${companyName}`,
      });

      setShowEditModal(false);
      await loadData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Add Contact Log Entry
  const handleAddContactLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !contactSummary) return;

    setSubmitting(true);
    const newLog: ClientContactLog = {
      id: `log_${Date.now()}`,
      date: new Date().toISOString(),
      type: contactType,
      summary: contactSummary,
      staffName: staff?.fullName || user?.displayName || 'Station Agent',
    };

    const updatedHistory = [newLog, ...(selectedClient.contactHistory || [])];

    if (!auth.currentUser) {
      const updated = { ...selectedClient, contactHistory: updatedHistory };
      setClients(clients.map((c) => (c.id === selectedClient.id ? updated : c)));
      setSelectedClient(updated);
      setShowContactModal(false);
      setContactSummary('');
      setSubmitting(false);
      return;
    }

    try {
      await updateDoc(doc(db, 'clients', selectedClient.id), {
        contactHistory: updatedHistory,
      });

      const updated = { ...selectedClient, contactHistory: updatedHistory };
      setSelectedClient(updated);
      setClients(clients.map((c) => (c.id === selectedClient.id ? updated : c)));
      setShowContactModal(false);
      setContactSummary('');
    } catch (err) {
      console.error('Failed to log contact history:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setCompanyName('');
    setContactPerson('');
    setEmail('');
    setPhone('+255 ');
    setIndustry('Telecommunications');
    setTinNumber('');
    setVrnNumber('');
    setNotes('');
  };

  // Filter and Pagination Logic
  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      c.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.clientCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm);

    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesIndustry = industryFilter === 'all' || c.industry === industryFilter;

    return matchesSearch && matchesStatus && matchesIndustry;
  });

  const totalPages = Math.ceil(filteredClients.length / pageSize) || 1;
  const paginatedClients = filteredClients.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const industries = Array.from(new Set(clients.map((c) => c.industry).filter(Boolean))) as string[];
  const clientCampaigns = selectedClient
    ? campaigns.filter((camp) => camp.clientId === selectedClient.id)
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#F58220] uppercase tracking-wide">
            <Building2 className="w-4 h-4" />
            <span>Commercial CRM & Advertiser Database</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[#07182B]">
            Client Management & Campaign Portfolios
          </h2>
          <p className="text-xs text-slate-500">
            Manage advertiser profiles, track contact logs, and monitor unlimited simultaneous independent campaigns per client.
          </p>
        </div>

        {permissions.canManageClients && (
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="px-4 py-2 bg-[#F58220] hover:bg-[#e07316] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Advertiser</span>
          </button>
        )}
      </div>

      {/* Search, Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by company, contact, code, or phone..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#07182B]"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="prospect">Prospect</option>
          </select>

          {/* Industry Filter */}
          <select
            value={industryFilter}
            onChange={(e) => {
              setIndustryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none"
          >
            <option value="all">All Industries</option>
            {industries.map((ind) => (
              <option key={ind} value={ind}>
                {ind}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Client List with Pagination */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-3.5 border-b border-slate-100 bg-[#F5F7FA] flex items-center justify-between text-xs font-bold text-[#07182B]">
              <span>Advertiser Directory</span>
              <span className="font-mono-numbers text-slate-500">
                {filteredClients.length} Total
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {loading ? (
                <div className="p-8 text-center text-xs text-slate-400">Loading clients...</div>
              ) : paginatedClients.length > 0 ? (
                paginatedClients.map((client) => {
                  const campCount = campaigns.filter((c) => c.clientId === client.id).length;
                  const isSelected = selectedClient?.id === client.id;
                  return (
                    <div
                      key={client.id}
                      onClick={() => setSelectedClient(client)}
                      className={`p-4 cursor-pointer transition-colors text-xs ${
                        isSelected
                          ? 'bg-[#07182B] text-white shadow-xs'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold tracking-tight text-sm">
                            {client.companyName}
                          </div>
                          <div
                            className={`text-[11px] font-mono-numbers ${
                              isSelected ? 'text-[#F58220]' : 'text-slate-500'
                            }`}
                          >
                            {client.clientCode || 'WFM-CLI-XXXX'}
                          </div>
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${
                            client.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {client.status}
                        </span>
                      </div>

                      <div
                        className={`mt-2 flex items-center justify-between text-[11px] ${
                          isSelected ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        <span>{client.contactPerson}</span>
                        <span className="font-mono-numbers font-medium">
                          {campCount} {campCount === 1 ? 'Campaign' : 'Campaigns'}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-xs text-slate-400">
                  No advertisers found matching criteria.
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded border border-slate-200 bg-white disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-mono-numbers text-slate-600">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded border border-slate-200 bg-white disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (2 cols): Detailed Client Profile, Contact History & Unlimited Independent Campaigns */}
        <div className="lg:col-span-2 space-y-6">
          {selectedClient ? (
            <>
              {/* Profile Card */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-[#07182B]">
                        {selectedClient.companyName}
                      </h3>
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono-numbers bg-slate-100 text-slate-700 font-semibold">
                        {selectedClient.clientCode || 'WFM-CLI-1001'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Industry: <strong className="text-slate-700">{selectedClient.industry || 'General'}</strong> · Assigned Sales Agent: <strong className="text-slate-700">{selectedClient.assignedSalesAgentName || 'Juma Mwamburi'}</strong>
                    </p>
                  </div>

                  {permissions.canManageClients && (
                    <button
                      onClick={() => handleOpenEdit(selectedClient)}
                      className="px-3.5 py-1.5 bg-[#07182B] hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Profile</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-700">
                  <div className="flex items-center gap-2.5">
                    <User className="w-4 h-4 text-[#F58220]" />
                    <span>Contact Person: <strong>{selectedClient.contactPerson}</strong></span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Phone className="w-4 h-4 text-[#F58220]" />
                    <span>Phone: <strong className="font-mono-numbers">{selectedClient.phone}</strong></span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Mail className="w-4 h-4 text-[#F58220]" />
                    <span>Email: <strong>{selectedClient.email || '—'}</strong></span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <span>TIN / VRN: <strong className="font-mono-numbers">{selectedClient.tinNumber || '—'} / {selectedClient.vrnNumber || '—'}</strong></span>
                  </div>
                </div>

                {selectedClient.notes && (
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-600">
                    <strong className="text-[#07182B] block mb-0.5">Account Notes:</strong>
                    {selectedClient.notes}
                  </div>
                )}
              </div>

              {/* Independent Campaigns Section (Unlimited Multiple Concurrent Campaigns) */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="font-bold text-sm text-[#07182B] flex items-center gap-2">
                      <Megaphone className="w-4 h-4 text-[#F58220]" />
                      Independent Campaigns ({clientCampaigns.length})
                    </h4>
                    <p className="text-xs text-slate-500">
                      Advertisers can run multiple simultaneous independent campaigns.
                    </p>
                  </div>
                  <button
                    onClick={() => onNavigate('campaigns')}
                    className="text-xs font-semibold text-[#F58220] hover:underline"
                  >
                    + Book Campaign
                  </button>
                </div>

                <div className="space-y-3">
                  {clientCampaigns.length > 0 ? (
                    clientCampaigns.map((camp) => {
                      const percent =
                        camp.totalSpotsBooked > 0
                          ? Math.min(100, Math.round((camp.totalSpotsAired / camp.totalSpotsBooked) * 100))
                          : 0;
                      return (
                        <div
                          key={camp.id}
                          className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2 text-xs"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-bold text-sm text-[#07182B]">{camp.title}</span>
                              <span className="text-[11px] text-slate-500 font-mono-numbers block">
                                Code: {camp.campaignCode} · {camp.packageName}
                              </span>
                            </div>
                            <span className="px-2.5 py-1 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 capitalize">
                              {camp.status}
                            </span>
                          </div>

                          {/* Progress Bar */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] text-slate-600 font-mono-numbers">
                              <span>Spots Aired: {camp.totalSpotsAired} / {camp.totalSpotsBooked}</span>
                              <span className="font-bold text-[#07182B]">{percent}% Complete</span>
                            </div>
                            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-[#F58220] h-full rounded-full"
                                style={{ width: `${percent}%` }}
                              ></div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[11px] text-slate-500 font-mono-numbers">
                            <span>Contract Value: <strong className="text-[#07182B]">{formatTZS(camp.totalAmountTZS)}</strong></span>
                            <span>Flight: {formatDate(camp.startDate)} — {formatDate(camp.endDate)}</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-8 text-center text-xs text-slate-400">
                      No independent campaigns currently registered for this client.
                    </div>
                  )}
                </div>
              </div>

              {/* Contact History & Interaction Log */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="font-bold text-sm text-[#07182B] flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-[#F58220]" />
                      Client Contact & Interaction History
                    </h4>
                    <p className="text-xs text-slate-500">
                      Log of phone calls, meetings, WhatsApp chats, and proposal dispatches.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowContactModal(true)}
                    className="px-3.5 py-1.5 bg-[#F58220] hover:bg-[#e07316] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Log Contact</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {selectedClient.contactHistory && selectedClient.contactHistory.length > 0 ? (
                    selectedClient.contactHistory.map((log) => (
                      <div
                        key={log.id}
                        className="p-3.5 rounded-lg border border-slate-100 bg-slate-50 space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#07182B] px-2 py-0.5 bg-white rounded border border-slate-200">
                            {log.type}
                          </span>
                          <span className="font-mono-numbers text-slate-400 text-[11px]">
                            {formatDateTimeEAT(log.date)}
                          </span>
                        </div>
                        <p className="text-slate-700">{log.summary}</p>
                        <div className="text-[11px] text-slate-400">
                          Logged by: {log.staffName}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-xs text-slate-400">
                      No contact history logs recorded for this advertiser.
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-xs text-slate-400">
              Select an advertiser from the left directory to view full profile and campaigns.
            </div>
          )}
        </div>
      </div>

      {/* Register Client Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-[#07182B]">Register New Advertiser Client</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-700 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleRegisterClient} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Company / Brand Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Azam Media Group"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#07182B] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Contact Person *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Salim Bakhresa"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#07182B] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="+255 754 000 000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#07182B] focus:outline-none font-mono-numbers"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="ads@company.co.tz"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#07182B] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Industry</label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#07182B] focus:outline-none bg-white"
                  >
                    <option value="Telecommunications">Telecommunications</option>
                    <option value="FMCG / Beverages">FMCG / Beverages</option>
                    <option value="Manufacturing & Consumer Products">Manufacturing & Consumer</option>
                    <option value="Banking & Financial Services">Banking & Financial Services</option>
                    <option value="Media & Entertainment">Media & Entertainment</option>
                    <option value="Energy & Utilities">Energy & Utilities</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">TRA TIN Number</label>
                  <input
                    type="text"
                    placeholder="100-245-890"
                    value={tinNumber}
                    onChange={(e) => setTinNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#07182B] focus:outline-none font-mono-numbers"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">VRN Number</label>
                  <input
                    type="text"
                    placeholder="40-001290-B"
                    value={vrnNumber}
                    onChange={(e) => setVrnNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#07182B] focus:outline-none font-mono-numbers"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'active' | 'inactive' | 'prospect')}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#07182B] focus:outline-none bg-white"
                >
                  <option value="active">Active Advertiser</option>
                  <option value="prospect">Prospect / Lead</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Account Notes</label>
                <textarea
                  rows={2}
                  placeholder="Key background and corporate requirements..."
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
                  className="px-4 py-1.5 bg-[#F58220] hover:bg-[#e07316] text-white font-semibold rounded disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Saving...' : 'Register Advertiser'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Client Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-[#07182B]">Edit Advertiser Profile</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateClient} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Company / Brand Name *</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#07182B] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Contact Person *</label>
                  <input
                    type="text"
                    required
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#07182B] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#07182B] focus:outline-none font-mono-numbers"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#07182B] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'active' | 'inactive' | 'prospect')}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#07182B] focus:outline-none bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="prospect">Prospect</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Account Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#07182B] focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-[#07182B] hover:bg-slate-800 text-white font-semibold rounded disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-[#07182B]">Log Interaction with {selectedClient?.companyName}</h3>
              <button
                onClick={() => setShowContactModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddContactLog} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Interaction Type</label>
                <select
                  value={contactType}
                  onChange={(e) => setContactType(e.target.value as ClientContactLog['type'])}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#07182B] focus:outline-none bg-white"
                >
                  <option value="Phone Call">Phone Call</option>
                  <option value="Email">Email</option>
                  <option value="Physical Meeting">Physical Meeting</option>
                  <option value="WhatsApp">WhatsApp Message</option>
                  <option value="Proposal Sent">Proposal / Rate Card Sent</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Discussion Summary *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Summary of conversation and next steps..."
                  value={contactSummary}
                  onChange={(e) => setContactSummary(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#07182B] focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowContactModal(false)}
                  className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-[#F58220] hover:bg-[#e07316] text-white font-semibold rounded disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Saving...' : 'Save Contact Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
