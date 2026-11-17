import React, { useState, useEffect } from 'react';
import { ShieldAlert, Search, ShieldCheck, Lock, RefreshCw, Clock } from 'lucide-react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { AuditLog } from '../types';
import { formatDateTimeEAT } from '../lib/formatters';
import { INITIAL_DEMO_AUDIT_LOGS } from '../lib/demo-data';

export const AuditLogsPage: React.FC = () => {
  const { user, permissions } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>(INITIAL_DEMO_AUDIT_LOGS);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const loadLogs = async () => {
    if (!auth.currentUser) {
      return;
    }
    try {
      setLoading(true);
      const q = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'), limit(50));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as AuditLog[]);
      }
    } catch (e) {
      console.warn('Audit logs load:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [user]);

  const filteredLogs = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.performedByEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.targetCollection.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.details.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#F58220] uppercase tracking-wide">
            <ShieldAlert className="w-4 h-4" />
            <span>Immutable Governance & System Audit Trail</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[#07182B]">
            Administrative & Security Audit Logs
          </h2>
          <p className="text-xs text-slate-500">
            Chronological audit trail of privileged staff actions. Strictly append-only in Firestore Security Rules.
          </p>
        </div>

        <button
          onClick={loadLogs}
          className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Audit Trail</span>
        </button>
      </div>

      {/* Security Rule Assurance Banner */}
      <div className="p-4 bg-[#07182B] text-white rounded-xl border border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <div className="font-bold text-slate-100">Zero-Trust Immutability Guarantee</div>
            <div className="text-slate-400 text-[11px]">
              Firestore Security Rules forbid <code>update</code> and <code>delete</code> on <code>auditLogs</code>, preventing log tampering.
            </div>
          </div>
        </div>
        <span className="hidden sm:inline font-mono-numbers text-[#F58220] font-semibold">
          Cloud Firestore ABAC
        </span>
      </div>

      {/* Search */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs text-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search action, email, collection..."
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
                <th className="py-3 px-4">Timestamp (EAT)</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Actor Email</th>
                <th className="py-3 px-4">Target Collection</th>
                <th className="py-3 px-4">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Loading audit trail...
                  </td>
                </tr>
              ) : filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono-numbers text-slate-600 whitespace-nowrap">
                      {formatDateTimeEAT(log.timestamp)}
                    </td>
                    <td className="py-3 px-4 font-mono-numbers font-semibold text-[#07182B]">
                      {log.action}
                    </td>
                    <td className="py-3 px-4 text-slate-700">{log.performedByEmail}</td>
                    <td className="py-3 px-4 font-mono-numbers text-slate-500">
                      {log.targetCollection}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-md">{log.details}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No audit records recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
