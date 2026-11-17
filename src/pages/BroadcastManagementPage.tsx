import React, { useState, useEffect } from 'react';
import {
  Radio,
  CheckCircle2,
  Clock,
  Calendar,
  AlertCircle,
  Play,
  RotateCcw,
  Sparkles,
  MessageSquare,
  Shield,
  Volume2,
} from 'lucide-react';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  increment,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { BroadcastSchedule, BroadcastLog, PageId } from '../types';
import { formatTimeEAT, formatDateTimeEAT } from '../lib/formatters';
import { logAuditEvent } from '../services/audit-service';
import { INITIAL_DEMO_SCHEDULES, INITIAL_DEMO_LOGS } from '../lib/demo-data';

interface BroadcastManagementProps {
  onNavigate: (page: PageId) => void;
}

export const BroadcastManagementPage: React.FC<BroadcastManagementProps> = ({ onNavigate }) => {
  const { user, staff, activeRole, permissions } = useAuth();
  const [schedules, setSchedules] = useState<BroadcastSchedule[]>(INITIAL_DEMO_SCHEDULES);
  const [asRunLogs, setAsRunLogs] = useState<BroadcastLog[]>(INITIAL_DEMO_LOGS);
  const [loading, setLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [confirmSuccess, setConfirmSuccess] = useState<string | null>(null);

  const loadData = async () => {
    if (!auth.currentUser) {
      return;
    }
    try {
      setLoading(true);
      const [schedSnap, logSnap] = await Promise.all([
        getDocs(collection(db, 'broadcastSchedules')),
        getDocs(query(collection(db, 'broadcastLogs'), orderBy('airedAt', 'desc'), limit(15))),
      ]);

      if (!schedSnap.empty) {
        setSchedules(schedSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as BroadcastSchedule[]);
      }
      if (!logSnap.empty) {
        setAsRunLogs(logSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as BroadcastLog[]);
      }
    } catch (e) {
      console.warn('Broadcast logs load:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleConfirmAiring = async (sched: BroadcastSchedule) => {
    if (!user) return;
    setActionInProgress(sched.id);
    setConfirmSuccess(null);

    try {
      const nowIso = new Date().toISOString();
      const presenterName = staff?.fullName || user.displayName || 'Studio Presenter';

      const logData: BroadcastLog = {
        id: `log_${Date.now()}`,
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
        setSchedules(schedules.map((s) => (s.id === sched.id ? { ...s, status: 'aired' } : s)));
        setAsRunLogs([logData, ...asRunLogs]);
        setConfirmSuccess(`Airing successfully confirmed and logged for ${sched.campaignTitle}!`);
        setTimeout(() => setConfirmSuccess(null), 4000);
        return;
      }

      await addDoc(collection(db, 'broadcastLogs'), logData);

      // 2. Update Schedule Status
      await updateDoc(doc(db, 'broadcastSchedules', sched.id), {
        status: 'aired',
      });

      // 3. Atomically increment totalSpotsAired on the campaign
      await updateDoc(doc(db, 'campaigns', sched.campaignId), {
        totalSpotsAired: increment(1),
        updatedAt: nowIso,
      });

      // 4. Create Swahili SMS alert entry
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
        action: 'CONFIRM_BROADCAST_AIRING',
        targetCollection: 'broadcastLogs',
        targetDocumentId: sched.id,
        details: `Confirmed on-air transmission for ${sched.campaignTitle} (${sched.clientName})`,
      });

      setConfirmSuccess(`Airing successfully confirmed and logged for ${sched.campaignTitle}!`);
      setTimeout(() => setConfirmSuccess(null), 4000);
      await loadData();
    } catch (err: unknown) {
      alert(`Notice: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const canLog = permissions.canLogBroadcasts;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#F58220] uppercase tracking-wide">
            <Radio className="w-4 h-4" />
            <span>Studio Master Control · On-Air Transmission</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[#07182B]">
            Broadcast Management & As-Run Verification
          </h2>
          <p className="text-xs text-slate-500">
            Presenters and operators verify live transmission of commercial spots. Verified logs update client campaign metrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 bg-[#07182B] text-white text-xs rounded-lg flex items-center gap-2 font-mono-numbers">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>TRANSMITTING 89.1 FM</span>
          </div>
        </div>
      </div>

      {confirmSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{confirmSuccess}</span>
        </div>
      )}

      {/* Two Columns: Live Queued Commercial Spots (Left) & Confirmed As-Run Permanent Logs (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Airing Queue */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-sm text-[#07182B] flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-[#F58220]" />
                Commercial Spots Scheduled for Transmission
              </h3>
              <p className="text-xs text-slate-500">
                Execute and confirm playback during designated commercial break windows.
              </p>
            </div>
            <button
              onClick={loadData}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
              title="Refresh"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading airing schedule...</div>
            ) : schedules.length > 0 ? (
              schedules.map((item) => {
                const isAired = item.status === 'aired';
                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-xl border transition-all text-xs space-y-2 ${
                      isAired
                        ? 'border-emerald-200 bg-emerald-50/30'
                        : 'border-slate-200 bg-white hover:border-[#07182B]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{item.clientName}</span>
                          <span className="text-[10px] text-[#F58220] font-semibold uppercase">
                            30s Spot
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 font-medium">
                          {item.campaignTitle}
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded capitalize ${
                          isAired ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                      <span>Show: {item.showName}</span>
                      <span className="font-mono-numbers font-medium text-slate-700">
                        {item.timeSlot}
                      </span>
                    </div>

                    {/* Airing Confirmation Control */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-mono-numbers">
                        ID: {item.id}
                      </span>
                      {isAired ? (
                        <span className="text-emerald-700 font-semibold text-[11px] flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Transmission Confirmed</span>
                        </span>
                      ) : canLog ? (
                        <button
                          onClick={() => handleConfirmAiring(item)}
                          disabled={actionInProgress === item.id}
                          className="px-3 py-1 bg-[#F58220] hover:bg-[#e07316] text-white font-semibold text-xs rounded transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>
                            {actionInProgress === item.id ? 'Confirming...' : 'Confirm Airing'}
                          </span>
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[11px]">
                          Requires Presenter or Traffic role
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                No spots queued for this transmission block.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Confirmed As-Run Logs (Permanent Ledger) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-sm text-[#07182B] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Verified As-Run Transmission Logs
            </h3>
            <p className="text-xs text-slate-500">
              Immutable radio transmission logs. These verified timestamps drive client billing reconciliation.
            </p>
          </div>

          <div className="space-y-3">
            {asRunLogs.length > 0 ? (
              asRunLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-lg border border-slate-100 bg-slate-50/60 space-y-1.5 text-xs"
                >
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-[#07182B]">{log.clientName}</span>
                    <span className="text-[10px] font-mono-numbers text-slate-500">
                      {formatDateTimeEAT(log.airedAt)}
                    </span>
                  </div>

                  <div className="text-slate-700 font-medium">{log.campaignTitle}</div>

                  <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1 text-emerald-700 font-medium">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>{log.presenterName}</span>
                    </span>
                    <span className="text-slate-400 font-mono-numbers">Log #{log.id.slice(0, 8)}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                No confirmed logs recorded yet today.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
