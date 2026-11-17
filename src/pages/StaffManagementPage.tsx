import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Shield,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Key,
  Lock,
  Mail,
  Phone,
  Building,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { StaffMember, StaffRole } from '../types';
import { ALL_ROLES, ROLE_PERMISSIONS, ROLE_DESCRIPTIONS } from '../lib/permissions';
import { fetchAllStaff, createStaffMember, updateStaffRoleAndStatus } from '../services/staff-service';
import { formatDate } from '../lib/formatters';

export const StaffManagementPage: React.FC = () => {
  const { user, staff, activeRole, permissions } = useAuth();

  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [activeTab, setActiveTab] = useState<'roster' | 'matrix' | 'security'>('roster');

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+255 ');
  const [role, setRole] = useState<StaffRole>('Sales Agent');
  const [department, setDepartment] = useState('Commercial Sales');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadStaff = async () => {
    setLoading(true);
    try {
      const data = await fetchAllStaff();
      setStaffList(data);
    } catch (err) {
      console.warn('Could not load staff list directly:', err);
      // Fallback to current authenticated staff if permissions restrict full list
      if (staff) {
        setStaffList([staff]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, [staff]);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!fullName || !email) {
      setFormError('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const generatedUid = `staff_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await createStaffMember(
        {
          uid: generatedUid,
          fullName,
          email,
          phone,
          role,
          department,
          isActive: true,
        },
        { uid: user.uid, email: user.email || '' }
      );

      setShowAddModal(false);
      setFullName('');
      setEmail('');
      setPhone('+255 ');
      await loadStaff();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingStaff) return;

    setSubmitting(true);
    setFormError(null);

    try {
      await updateStaffRoleAndStatus(
        editingStaff.uid,
        editingStaff.role,
        editingStaff.isActive,
        { uid: user.uid, email: user.email || '' }
      );

      setEditingStaff(null);
      await loadStaff();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const filteredStaff = staffList.filter((s) => {
    const matchesRole = selectedRoleFilter === 'all' || s.role === selectedRoleFilter;
    const matchesSearch =
      s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.phone.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const canManage = permissions.canManageStaff;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#F58220] uppercase tracking-wide">
            <Shield className="w-4 h-4" />
            <span>Station Governance & Access Control</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[#07182B]">
            Staff Directory & Role-Based Authorization
          </h2>
          <p className="text-xs text-slate-500">
            Strict attribute-based access control (ABAC) enforced at Firestore Security Rules.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canManage ? (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-[#F58220] hover:bg-[#e07316] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Staff Member</span>
            </button>
          ) : (
            <div className="px-3 py-1.5 bg-slate-100 text-slate-500 text-xs rounded border border-slate-200 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>Read-only as {activeRole}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-medium">
        <button
          onClick={() => setActiveTab('roster')}
          className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'roster'
              ? 'border-[#F58220] text-[#07182B] font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Staff Directory ({filteredStaff.length})
        </button>
        <button
          onClick={() => setActiveTab('matrix')}
          className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'matrix'
              ? 'border-[#F58220] text-[#07182B] font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Permissions Matrix
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'security'
              ? 'border-[#F58220] text-[#07182B] font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Security Rules Inspector
        </button>
      </div>

      {activeTab === 'roster' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
            {/* Search */}
            <div className="relative w-full md:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-[#07182B]"
              />
            </div>

            {/* Role Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto p-1 bg-slate-100 rounded-lg">
              <button
                onClick={() => setSelectedRoleFilter('all')}
                className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap ${
                  selectedRoleFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Roles
              </button>
              {ALL_ROLES.map((r) => (
                <button
                  key={r}
                  onClick={() => setSelectedRoleFilter(r)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap ${
                    selectedRoleFilter === r
                      ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {r === 'Traffic / Programming Manager'
                    ? 'Traffic'
                    : r === 'Presenter / Operator'
                    ? 'Presenter'
                    : r}
                </button>
              ))}
            </div>
          </div>

          {/* Staff Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F5F7FA] text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Station Role</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Joined Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                        <span>Loading staff roster...</span>
                      </td>
                    </tr>
                  ) : filteredStaff.length > 0 ? (
                    filteredStaff.map((member) => (
                      <tr key={member.uid} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-[#07182B]">{member.fullName}</div>
                          <div className="text-[11px] text-slate-400 font-mono-numbers">{member.uid}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-slate-700">{member.email}</div>
                          <div className="text-[11px] text-slate-500 font-mono-numbers">{member.phone}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-800">
                            {member.role}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{member.department}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 font-medium text-[11px] ${
                              member.isActive ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                member.isActive ? 'bg-emerald-600' : 'bg-rose-600'
                              }`}
                            ></span>
                            <span>{member.isActive ? 'Active' : 'Suspended'}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono-numbers">
                          {formatDate(member.createdAt)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {canManage ? (
                            <button
                              onClick={() => setEditingStaff(member)}
                              className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-[#07182B] hover:text-white text-slate-700 rounded transition-colors cursor-pointer"
                            >
                              Edit Role
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[11px]">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No staff members found matching this filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Permissions Matrix Tab */}
      {activeTab === 'matrix' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-6">
          <div>
            <h3 className="font-bold text-sm text-[#07182B]">
              Role-Based Access Control (RBAC) Authority Matrix
            </h3>
            <p className="text-xs text-slate-500">
              Station privileges mapped to the 6 operational roles. Enforced strictly by Firestore security rules.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-[#07182B] text-white">
                  <th className="p-3">Operational Capability</th>
                  {ALL_ROLES.map((r) => (
                    <th key={r} className="p-3 text-center whitespace-nowrap">
                      {r}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {[
                  { key: 'canManageStaff', label: 'Create & Manage Staff Accounts' },
                  { key: 'canManageClients', label: 'Create & Update Client Accounts' },
                  { key: 'canCreateCampaigns', label: 'Create Advertising Campaigns' },
                  { key: 'canApproveCampaigns', label: 'Approve & Activate Campaigns' },
                  { key: 'canRecordPayments', label: 'Record & Clear Payments (TZS)' },
                  { key: 'canManageBroadcastSchedules', label: 'Manage Broadcast Schedules & Slots' },
                  { key: 'canLogBroadcasts', label: 'Log Confirmed On-Air Playback' },
                  { key: 'canSendSms', label: 'Trigger Swahili SMS Notifications' },
                  { key: 'canManageExpenses', label: 'Manage Station Operating Expenses' },
                  { key: 'canViewReports', label: 'View Commercial & Financial Reports' },
                  { key: 'canViewAuditLogs', label: 'Access Immutable Audit Trail' },
                  { key: 'canManageSettings', label: 'Update Station Settings & Rate Cards' },
                ].map((perm) => (
                  <tr key={perm.key} className="hover:bg-slate-50">
                    <td className="p-3 font-medium text-slate-900">{perm.label}</td>
                    {ALL_ROLES.map((r) => {
                      const hasPerm = ROLE_PERMISSIONS[r][perm.key as keyof typeof ROLE_PERMISSIONS[typeof r]];
                      return (
                        <td key={r} className="p-3 text-center">
                          {hasPerm ? (
                            <span className="inline-flex text-emerald-600 font-bold">✓</span>
                          ) : (
                            <span className="inline-flex text-slate-300 font-normal">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Security Rules Inspector Tab */}
      {activeTab === 'security' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-4 text-xs">
          <div>
            <h3 className="font-bold text-sm text-[#07182B] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Eight Pillars Security Rules Architecture
            </h3>
            <p className="text-slate-500">
              Verification of Firestore rules deployed to Cloud Firestore project.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="font-bold text-[#07182B]">1. Master Gate & Default Deny</div>
              <p className="text-slate-600">
                Catch-all <code>match /&#123;document=**&#125; &#123; allow read, write: if false; &#125;</code> prevents unauthenticated leaks.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="font-bold text-[#07182B]">2. Tiered Identity & Staff Verification</div>
              <p className="text-slate-600">
                Lookups verify <code>exists(/databases/$(database)/documents/staff/$(request.auth.uid))</code> and <code>isActive == true</code>. Root authority bootstrapped to <code>makajoseph97@gmail.com</code>.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="font-bold text-[#07182B]">3. Client-Campaign Decoupling</div>
              <p className="text-slate-600">
                Rule requires <code>incoming().clientId == existing().clientId</code> on campaign updates to prevent redirecting credits.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="font-bold text-[#07182B]">4. Audit & As-Run Immutability</div>
              <p className="text-slate-600">
                <code>auditLogs</code> and <code>broadcastLogs</code> strictly block update and delete operations (<code>allow delete: if false;</code>).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-[#07182B]">Add New Staff Account</h3>
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

            <form onSubmit={handleCreateStaff} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Salim Mwamba"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#07182B] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Work Email *</label>
                <input
                  type="email"
                  required
                  placeholder="s.mwamba@wafalmefm.co.tz"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#07182B] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="+255 754 000 000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#07182B] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Role *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as StaffRole)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#07182B] focus:outline-none bg-white"
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-500">{ROLE_DESCRIPTIONS[role]}</p>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Department</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#07182B] focus:outline-none bg-white"
                >
                  <option value="Commercial Sales">Commercial Sales</option>
                  <option value="Traffic & Scheduling">Traffic & Scheduling</option>
                  <option value="Finance & Accounts">Finance & Accounts</option>
                  <option value="Studio & Programming">Studio & Programming</option>
                  <option value="Executive Management">Executive Management</option>
                </select>
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
                  {submitting ? 'Creating...' : 'Create Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-[#07182B]">
                Modify Role: {editingStaff.fullName}
              </h3>
              <button
                onClick={() => setEditingStaff(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateStaff} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Station Role</label>
                <select
                  value={editingStaff.role}
                  onChange={(e) =>
                    setEditingStaff({ ...editingStaff, role: e.target.value as StaffRole })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#07182B] focus:outline-none bg-white"
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="activeCheck"
                  checked={editingStaff.isActive}
                  onChange={(e) =>
                    setEditingStaff({ ...editingStaff, isActive: e.target.checked })
                  }
                  className="rounded text-[#07182B]"
                />
                <label htmlFor="activeCheck" className="text-slate-700 font-medium">
                  Account is Active and authorized to access station portal
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-[#07182B] hover:bg-slate-800 text-white font-semibold rounded disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Role & Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
