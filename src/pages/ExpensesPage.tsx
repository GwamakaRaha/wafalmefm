import React, { useState, useEffect } from 'react';
import { Receipt, Plus, Search, Calendar, DollarSign } from 'lucide-react';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Expense } from '../types';
import { formatDate, formatTZS } from '../lib/formatters';
import { logAuditEvent } from '../services/audit-service';
import { INITIAL_DEMO_EXPENSES } from '../lib/demo-data';

export const ExpensesPage: React.FC = () => {
  const { user, permissions } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>(INITIAL_DEMO_EXPENSES);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [category, setCategory] = useState('Transmitter Power & Fuel (TANESCO)');
  const [description, setDescription] = useState('');
  const [amountTZS, setAmountTZS] = useState(650000);
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);

  const loadExpenses = async () => {
    if (!auth.currentUser) {
      return;
    }
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, 'expenses'));
      if (!snap.empty) {
        setExpenses(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Expense[]);
      }
    } catch (e) {
      console.warn('Load expenses:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [user]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amountTZS || !user) return;
    setSubmitting(true);

    const nowIso = new Date().toISOString();
    const newExp: Expense = {
      id: `exp_${Date.now()}`,
      category,
      description,
      amountTZS: Number(amountTZS),
      expenseDate: new Date(expenseDate).toISOString(),
      approvedByUid: user.uid,
      createdAt: nowIso,
    };

    if (!auth.currentUser) {
      setExpenses([newExp, ...expenses]);
      setShowAddModal(false);
      setDescription('');
      setSubmitting(false);
      return;
    }

    try {
      await addDoc(collection(db, 'expenses'), newExp);

      await logAuditEvent({
        performedByUid: user.uid,
        performedByEmail: user.email || '',
        action: 'RECORD_EXPENSE',
        targetCollection: 'expenses',
        details: `Recorded station expenditure: ${category} - ${formatTZS(Number(amountTZS))}`,
      });

      setShowAddModal(false);
      setDescription('');
      await loadExpenses();
    } catch (err) {
      console.error('Add expense error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const totalExpense = expenses.reduce((acc, e) => acc + (e.amountTZS || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#F58220] uppercase tracking-wide">
            <Receipt className="w-4 h-4" />
            <span>Station Operating Costs & Outlays</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[#07182B]">
            Operating Expenses Ledger
          </h2>
          <p className="text-xs text-slate-500">
            Transmitter power, tower maintenance, TCRA regulatory licenses, and studio operations.
          </p>
        </div>

        {permissions.canManageExpenses && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-[#F58220] hover:bg-[#e07316] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record Expense</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs max-w-sm">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          Total Recorded Station Expenses
        </span>
        <div className="mt-1 text-2xl font-extrabold text-[#07182B] font-mono-numbers">
          {formatTZS(totalExpense)}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F5F7FA] text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 font-mono-numbers">Amount (TZS)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    Loading expenses...
                  </td>
                </tr>
              ) : expenses.length > 0 ? (
                expenses.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono-numbers text-slate-600">
                      {formatDate(item.expenseDate)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{item.category}</td>
                    <td className="py-3 px-4 text-slate-700">{item.description}</td>
                    <td className="py-3 px-4 font-bold text-[#07182B] font-mono-numbers">
                      {formatTZS(item.amountTZS)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    No operating expenses recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-[#07182B]">Record Station Expense</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Expense Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#07182B] focus:outline-none bg-white"
                >
                  <option value="Transmitter Power & Fuel (TANESCO)">
                    Transmitter Power & Fuel (TANESCO)
                  </option>
                  <option value="TCRA Frequency License Fees">
                    TCRA Frequency License Fees
                  </option>
                  <option value="Studio Equipment & Consumables">
                    Studio Equipment & Consumables
                  </option>
                  <option value="Commercial Production & Voiceovers">
                    Commercial Production & Voiceovers
                  </option>
                  <option value="Sales Agent Commissions">Sales Agent Commissions</option>
                  <option value="Administrative & Office Rent">
                    Administrative & Office Rent
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Diesel generator backup for Morogoro transmitter tower"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#07182B] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Amount (TZS) *</label>
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
                <label className="block text-slate-700 font-medium mb-1">Expense Date</label>
                <input
                  type="date"
                  required
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
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
                  {submitting ? 'Saving...' : 'Record Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
