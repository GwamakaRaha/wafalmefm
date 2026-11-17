import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Radio,
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  User,
  Play,
  RotateCcw,
  Sparkles,
  Calendar,
  Plus,
  XCircle,
} from 'lucide-react';
import { collection, getDocs, doc, updateDoc, addDoc, runTransaction, increment } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { BroadcastSchedule, BroadcastLog, PageId, Campaign } from '../types';
import { formatTimeEAT, formatDateTimeEAT, formatDate } from '../lib/formatters';
import { logAuditEvent } from '../services/audit-service';
import { INITIAL_DEMO_SCHEDULES, INITIAL_DEMO_LOGS } from '../lib/demo-data';

interface BroadcastCalendarProps {
  onNavigate: (page: PageId) => void;
}

export const BroadcastCalendarPage: React.FC<BroadcastCalendarProps> = ({ onNavigate }) => {
  const { user, staff, permissions } = useAuth();
  const [schedules, setSchedules] = useState<BroadcastSchedule[]>(INITIAL_DEMO_SCHEDULES);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [asRunLogs, setAsRunLogs] = useState<BroadcastLog[]>(INITIAL_DEMO_LOGS);
  
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedShow, setSelectedShow] = useState('All Shows');
  const [loading, setLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [alertSuccess, setAlertSuccess] = useState<string | null>(null);

  // New slot scheduling modal
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [newCampaignId, setNewCampaignId] = useState('');
  const [newShowName, setNewShowName] = useState('Kikosi Cha Asubuhi');
  const [newTimeSlot, setNewTimeSlot] = useState('07:30 - 07:31 EAT');
  const [newScheduledDate, setNewScheduledDate] = useState(new Date().toISOString().split('T')[0]);
  const [newPresenter, setNewPresenter] = useState('Khamis Masoud');

  // Reschedule modal state
  const [reschedulingItem, setReschedulingItem] = useState<BroadcastSchedule | null>(null);
  const [rescheduleTimeSlot, setRescheduleTimeSlot] = useState('08:00 - 08:01 EAT');
  const [reschedulePresenter, setReschedulePresenter] = useState('Khamis Masoud');

  const shows = [
    'All Shows',
    'Kikosi Cha Asubuhi (06:00 - 10:00)',
    'Wafalme Mchana (11:00 - 14:00)',
    'Mchakamchaka Drive (16:00 - 19:00)',
    'Wafalme Michezo Sports Hour (20:00 - 22:00)',
  ];

  const loadData = async () => {
    if (!auth.currentUser) return;
    try {
      setLoading(true);
      const [schedSnap, logSnap, campSnap] = await Promise.all([
        getDocs(collection(db, 'broadcastSchedules')),
        getDocs(collection(db, 'broadcastLogs')),
        getDocs(collection(db, 'campaigns')),
      ]);

      if (!schedSnap.empty) {
        setSchedules(schedSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as BroadcastSchedule[]);
      }
      if (!logSnap.empty) {
        setAsRunLogs(logSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as BroadcastLog[]);
      }
      if (!campSnap.empty) {
        setCampaigns(campSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Campaign[]);
      }
    } catch (e) {
      console.warn('Broadcast calendar load error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Atomic Exact-Once Airing Execution with Firestore Transaction
  const handleConfirmAiring = async (sched: BroadcastSchedule) => {
    if (!user || sched.status === 'aired') return;
    setActionInProgress(sched.id);
    setAlertSuccess(null);

    const nowIso = new Date().toISOString();
    const presenterName = staff?.fullName || user.displayName || 'Khamis Masoud';

    const logData: BroadcastLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      scheduleId: sched.id,
      campaignId: sched.campaignId,
      campaignTitle: sched.campaignTitle || 'Spot Commercial',
      clientName: sched.clientName || 'Advertiser',
      airedAt: nowIso,
      presenterUid: user.uid,
      presenterName,
      verified: true,
      transmissionNotes: `Verified on-air playback at ${formatTimeEAT(nowIso)} by ${presenterName}`,
      createdAt: nowIso,
    };

    if (!auth.currentUser) {
      // Offline / preview fallback
      setSchedules(schedules.map((s) => (s.id === sched.id ? { ...s, status: 'aired' } : s)));
      setAsRunLogs([logData, ...asRunLogs]);
      setAlertSuccess(`Broadcast confirmed exactly once for ${sched.campaignTitle}!`);
      setTimeout(() => setAlertSuccess(null), 4000);
      setActionInProgress(null);
      return;
    }

    try {
      // Secure transaction preventing duplicate execution
      await runTransaction(db, async (transaction) => {
        const schedRef = doc(db, 'broadcastSchedules', sched.id);
        const schedSnap = await transaction.get(schedRef);
        
        if (!schedSnap.exists()) {
          throw new Error('Schedule slot does not exist.');
        }

        const data = schedSnap.data() as BroadcastSchedule;
        if (data.status === 'aired') {
          throw new Error('Duplicate Execution Prevented: This broadcast has already been logged as aired.');
        }

        // 1. Mark schedule as aired
        transaction.update(schedRef, { status: 'aired' });

        // 2. Create broadcast log
        const logRef = doc(collection(db, 'broadcastLogs'));
        transaction.set(logRef, logData);

        // 3. Atomically increment campaign totalSpotsAired
        const campRef = doc(db, 'campaigns', sched.campaignId);
        transaction.update(campRef, {
          totalSpotsAired: increment(1),
          updatedAt: nowIso,
        });
      });

      // Log Swahili SMS confirmation
      await addDoc(collection(db, 'smsLogs'), {
        clientId: '',
        clientName: sched.clientName,
        recipientPhone: '+255 754 000 891',
        messageBody: `Wafalme FM: Tangazo la '${sched.campaignTitle}' limerushwa hewani saa ${formatTimeEAT(
          nowIso
        )} kwenye ${sched.showName}. Asante kwa kuchagua Wafalme FM.`,
        templateType: 'broadcast_confirmation',
        dispatchStatus: 'delivered',
        dispatchedAt: nowIso,
        createdAt: nowIso,
      });

      await logAuditEvent({
        performedByUid: user.uid,
        performedByEmail: user.email || '',
        action: 'CONFIRM_EXACT_ONCE_BROADCAST',
        targetCollection: 'broadcastLogs',
        targetDocumentId: logData.id,
        details: `Confirmed exact-once airing for ${sched.campaignTitle} (${sched.clientName})`,
      });

      setAlertSuccess(`Broadcast confirmed exactly once for ${sched.campaignTitle}! Campaign progress updated.`);
      setTimeout(() => setAlertSuccess(null), 4000);
      await loadData();
    } catch (err: unknown) {
      alert(`Execution Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setActionInProgress(null);
    }
  };

  // Mark slot as missed
  const handleMarkMissed = async (sched: BroadcastSchedule) => {
    if (!user) return;
    try {
      if (auth.currentUser) {
        await updateDoc(doc(db, 'broadcastSchedules', sched.id), { status: 'missed' });
        await logAuditEvent({
          performedByUid: user?.uid || '',
          performedByEmail: user?.email || '',
          action: 'MARK_BROADCAST_MISSED',
          targetCollection: 'broadcastSchedules',
          targetDocumentId: sched.id,
          details: `Marked broadcast slot for ${sched.campaignTitle} as missed.`,
        });
      }
      setSchedules(schedules.map((s) => (s.id === sched.id ? { ...s, status: 'missed' } : s)));
      setAlertSuccess(`Slot marked as missed for ${sched.campaignTitle}.`);
      setTimeout(() => setAlertSuccess(null), 3000);
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Schedule new slot submission
  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaignId) {
      alert('Please select a campaign.');
      return;
    }
    const selectedCamp = campaigns.find((c) => c.id === newCampaignId);
    if (!selectedCamp) return;

    const nowIso = new Date().toISOString();
    const newSched: BroadcastSchedule = {
      id: `sched_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      campaignId: selectedCamp.id,
      campaignTitle: selectedCamp.title,
      clientName: selectedCamp.clientName,
      scheduledTime: `${newScheduledDate}T08:00:00Z`,
      showName: newShowName,
      timeSlot: newTimeSlot,
      status: 'scheduled',
      assignedPresenterName: newPresenter,
      createdAt: nowIso,
    };

    try {
      if (auth.currentUser) {
        await addDoc(collection(db, 'broadcastSchedules'), newSched);
        await logAuditEvent({
          performedByUid: user?.uid || '',
          performedByEmail: user?.email || '',
          action: 'SCHEDULE_BROADCAST_SLOT',
          targetCollection: 'broadcastSchedules',
          targetDocumentId: newSched.id,
          details: `Scheduled new broadcast slot for campaign ${selectedCamp.title} on ${newShowName}`,
        });
      }
      setSchedules([newSched, ...schedules]);
      setShowScheduleModal(false);
      setAlertSuccess('New broadcast slot scheduled successfully!');
      setTimeout(() => setAlertSuccess(null), 4000);
      await loadData();
    } catch (err) {
      alert(`Error scheduling: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Reschedule slot
  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reschedulingItem) return;

    if (!auth.currentUser) {
      setSchedules(
        schedules.map((s) =>
          s.id === reschedulingItem.id
            ? { ...s, timeSlot: rescheduleTimeSlot, assignedPresenterName: reschedulePresenter }
            : s
        )
      );
      setReschedulingItem(null);
      return;
    }

    try {
      await updateDoc(doc(db, 'broadcastSchedules', reschedulingItem.id), {
        timeSlot: rescheduleTimeSlot,
        assignedPresenterName: reschedulePresenter,
      });
      await logAuditEvent({
        performedByUid: user?.uid || '',
        performedByEmail: user?.email || '',
        action: 'RESCHEDULE_BROADCAST_SLOT',
        targetCollection: 'broadcastSchedules',
        targetDocumentId: reschedulingItem.id,
        details: `Rescheduled broadcast slot for ${reschedulingItem.campaignTitle} to ${rescheduleTimeSlot}`,
      });
      setReschedulingItem(null);
      await loadData();
      setAlertSuccess('Broadcast slot rescheduled successfully.');
      setTimeout(() => setAlertSuccess(null), 3000);
    } catch (err) {
      alert(`Reschedule error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Filter schedules by show & viewMode
  const filteredSchedules = schedules.filter((s) => {
    const matchesShow = selectedShow === 'All Shows' || s.showName.includes(selectedShow.split(' (')[0]);
    if (!matchesShow) return false;

    // ViewMode date filtering logic
    const schedDate = new Date(s.scheduledTime || Date.now());
    const today = new Date();
    if (viewMode === 'daily') {
      return schedDate.toDateString() === today.toDateString() || s.status === 'scheduled';
    } else if (viewMode === 'weekly') {
      // within 7 days
      const diffTime = Math.abs(schedDate.getTime() - today.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
    }
    // monthly: current month
    return schedDate.getMonth() === today.getMonth();
  });

  // Check for missed broadcasts
  const missedBroadcasts = schedules.filter(
    (s) => s.status === 'scheduled' && new Date(s.scheduledTime || Date.now()).getTime() < Date.now() - 3600000
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#F58220] uppercase tracking-wide">
            <CalendarDays className="w-4 h-4" />
            <span>Studio Programming & Transmission Engine</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[#07182B]">
            Broadcast Transmission Calendar & Scheduling
          </h2>
          <p className="text-xs text-slate-500">
            Daily, weekly, and monthly programming grid. Exact-once recording enforced via secure Firestore transactions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowScheduleModal(true)}
            className="px-3.5 py-2 bg-[#07182B] hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Slot</span>
          </button>
          <button
            onClick={() => onNavigate('broadcast_management')}
            className="px-4 py-2 bg-[#F58220] hover:bg-[#e07316] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Radio className="w-4 h-4" />
            <span>On-Air Studio Console</span>
          </button>
        </div>
      </div>

      {/* Missed-Broadcast Alert Banner */}
      {missedBroadcasts.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <strong className="block font-bold">Missed-Broadcast Alert ({missedBroadcasts.length} slots):</strong>
              <span>One or more scheduled commercial slots have passed their transmission time without confirmation.</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {missedBroadcasts.slice(0, 2).map((mb) => (
              <button
                key={mb.id}
                onClick={() => handleMarkMissed(mb)}
                className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 font-semibold rounded text-[11px] cursor-pointer"
              >
                Mark {mb.campaignTitle?.slice(0, 12)} Missed
              </button>
            ))}
          </div>
        </div>
      )}

      {alertSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{alertSuccess}</span>
        </div>
      )}

      {/* View Mode & Show Filters */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        {/* Calendar View Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-full sm:w-auto">
          {(['daily', 'weekly', 'monthly'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3.5 py-1.5 font-medium rounded-md transition-colors capitalize cursor-pointer flex-1 sm:flex-initial ${
                viewMode === mode
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {mode} View
            </button>
          ))}
        </div>

        {/* Show Selector */}
        <div className="w-full sm:w-auto">
          <select
            value={selectedShow}
            onChange={(e) => setSelectedShow(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none"
          >
            {shows.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-[#07182B] capitalize">{viewMode} Programming Grid</span>
            <span className="text-slate-300">·</span>
            <span className="text-xs text-slate-500 font-mono-numbers">{filteredSchedules.length} Scheduled Slots</span>
          </div>
          <span className="text-xs text-slate-500 font-mono-numbers">Africa/Dar_es_Salaam (EAT)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full py-12 text-center text-xs text-slate-400">Loading schedule grid...</div>
          ) : filteredSchedules.length > 0 ? (
            filteredSchedules.map((item) => {
              const isAired = item.status === 'aired';
              const isMissed = item.status === 'missed';
              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border transition-all text-xs space-y-3 ${
                    isAired
                      ? 'border-emerald-200 bg-emerald-50/20'
                      : isMissed
                      ? 'border-red-200 bg-red-50/20'
                      : 'border-slate-200 bg-white hover:border-[#07182B]'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-sm text-[#07182B]">{item.clientName}</span>
                      <span className="text-[11px] text-slate-500 block truncate max-w-[200px]">
                        {item.campaignTitle}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded capitalize ${
                        isAired
                          ? 'bg-emerald-100 text-emerald-800'
                          : isMissed
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1 text-[11px] text-slate-600">
                    <div className="flex justify-between font-mono-numbers">
                      <span className="text-slate-400">Time Slot:</span>
                      <strong className="text-slate-800">{item.timeSlot}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Show Program:</span>
                      <strong className="text-slate-800">{item.showName}</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Assigned Presenter:</span>
                      <span className="font-medium text-[#07182B] flex items-center gap-1">
                        <User className="w-3 h-3 text-[#F58220]" />
                        <span>{item.assignedPresenterName || 'Khamis Masoud'}</span>
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setReschedulingItem(item);
                          setRescheduleTimeSlot(item.timeSlot);
                          setReschedulePresenter(item.assignedPresenterName || 'Khamis Masoud');
                        }}
                        className="text-[11px] text-slate-600 hover:text-[#07182B] font-medium transition-colors cursor-pointer"
                      >
                        Reschedule
                      </button>
                      {!isAired && !isMissed && (
                        <button
                          onClick={() => handleMarkMissed(item)}
                          className="text-[11px] text-red-600 hover:text-red-800 font-medium transition-colors cursor-pointer"
                        >
                          Mark Missed
                        </button>
                      )}
                    </div>

                    {isAired ? (
                      <span className="text-emerald-700 font-semibold text-[11px] flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Aired (Exact-Once)</span>
                      </span>
                    ) : isMissed ? (
                      <span className="text-red-700 font-semibold text-[11px] flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Missed Slot</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleConfirmAiring(item)}
                        disabled={actionInProgress === item.id}
                        className="px-3 py-1 bg-[#F58220] hover:bg-[#e07316] text-white font-semibold text-xs rounded transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50 shadow-2xs"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>{actionInProgress === item.id ? 'Recording...' : 'Confirm Airing'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full py-12 text-center text-xs text-slate-400">
              No broadcast slots scheduled for this view.
            </div>
          )}
        </div>
      </div>

      {/* Schedule New Slot Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-[#07182B]">Schedule New Commercial Slot</h3>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSchedule} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Select Campaign *</label>
                <select
                  required
                  value={newCampaignId}
                  onChange={(e) => setNewCampaignId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#07182B] focus:outline-none bg-white"
                >
                  <option value="">-- Select Active Campaign --</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.clientName} - {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Show Program *</label>
                <select
                  value={newShowName}
                  onChange={(e) => setNewShowName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#07182B] focus:outline-none bg-white"
                >
                  <option value="Kikosi Cha Asubuhi">Kikosi Cha Asubuhi (06:00 - 10:00)</option>
                  <option value="Wafalme Mchana">Wafalme Mchana (11:00 - 14:00)</option>
                  <option value="Mchakamchaka Drive">Mchakamchaka Drive (16:00 - 19:00)</option>
                  <option value="Wafalme Michezo Sports Hour">Wafalme Michezo Sports Hour (20:00 - 22:00)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Broadcast Date *</label>
                  <input
                    type="date"
                    required
                    value={newScheduledDate}
                    onChange={(e) => setNewScheduledDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#07182B] focus:outline-none font-mono-numbers"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Time Window *</label>
                  <input
                    type="text"
                    required
                    placeholder="07:30 - 07:31 EAT"
                    value={newTimeSlot}
                    onChange={(e) => setNewTimeSlot(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#07182B] focus:outline-none font-mono-numbers"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Assigned Presenter *</label>
                <select
                  value={newPresenter}
                  onChange={(e) => setNewPresenter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#07182B] focus:outline-none bg-white"
                >
                  <option value="Khamis Masoud">Khamis Masoud (Morning Drive)</option>
                  <option value="Mariam Said">Mariam Said (Midday Beats)</option>
                  <option value="Baraka Mrope">Baraka Mrope (Evening Rush)</option>
                  <option value="Zuwena Khamis">Zuwena Khamis (Sports Hour)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#07182B] hover:bg-slate-800 text-white font-semibold rounded cursor-pointer"
                >
                  Save Schedule Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {reschedulingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-[#07182B]">Reschedule Broadcast Slot</h3>
              <button
                onClick={() => setReschedulingItem(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRescheduleSubmit} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Campaign</label>
                <input
                  type="text"
                  disabled
                  value={reschedulingItem.campaignTitle}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded text-slate-600"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">New Time Slot Window *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 07:45 - 07:46 EAT"
                  value={rescheduleTimeSlot}
                  onChange={(e) => setRescheduleTimeSlot(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#07182B] focus:outline-none font-mono-numbers"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Assigned Presenter *</label>
                <select
                  value={reschedulePresenter}
                  onChange={(e) => setReschedulePresenter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#07182B] focus:outline-none bg-white"
                >
                  <option value="Khamis Masoud">Khamis Masoud (Morning Drive)</option>
                  <option value="Mariam Said">Mariam Said (Midday Beats)</option>
                  <option value="Baraka Mrope">Baraka Mrope (Evening Rush)</option>
                  <option value="Zuwena Khamis">Zuwena Khamis (Sports Hour)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReschedulingItem(null)}
                  className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#07182B] hover:bg-slate-800 text-white font-semibold rounded cursor-pointer"
                >
                  Save Rescheduling
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

