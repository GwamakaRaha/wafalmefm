import React, { useState, useEffect } from 'react';
import { Layers, Plus, Clock, Sparkles, Check, CheckCircle2 } from 'lucide-react';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { AdvertisingPackage } from '../types';
import { formatTZS } from '../lib/formatters';
import { INITIAL_DEMO_PACKAGES } from '../lib/demo-data';

export const PackagesPage: React.FC = () => {
  const { permissions, user } = useAuth();
  const [packages, setPackages] = useState<AdvertisingPackage[]>(INITIAL_DEMO_PACKAGES);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priceTZS, setPriceTZS] = useState(85000);
  const [spotCount, setSpotCount] = useState(25);
  const [durationSeconds, setDurationSeconds] = useState(30);
  const [timeSlot, setTimeSlot] = useState('11:00 - 14:00 EAT');
  const [submitting, setSubmitting] = useState(false);

  const loadPackages = async () => {
    if (!auth.currentUser) {
      return;
    }
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, 'packages'));
      if (!snap.empty) {
        setPackages(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as AdvertisingPackage[]);
      }
    } catch (e) {
      console.warn('Load packages:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPackages();
  }, [user]);

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !priceTZS) return;
    setSubmitting(true);

    const newPkg: AdvertisingPackage = {
      id: `pkg_${Date.now()}`,
      name,
      description,
      priceTZS: Number(priceTZS),
      spotCount: Number(spotCount),
      durationSeconds: Number(durationSeconds),
      timeSlot,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    if (!auth.currentUser) {
      setPackages([newPkg, ...packages]);
      setShowAddModal(false);
      setName('');
      setDescription('');
      setSubmitting(false);
      return;
    }

    try {
      await addDoc(collection(db, 'packages'), newPkg);

      setShowAddModal(false);
      setName('');
      setDescription('');
      await loadPackages();
    } catch (err) {
      console.error('Create package:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#F58220] uppercase tracking-wide">
            <Layers className="w-4 h-4" />
            <span>Commercial Rate Cards & Airtime Inventory</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[#07182B]">
            Advertising Packages & Rate Cards
          </h2>
          <p className="text-xs text-slate-500">
            Standard spot rotation packages, prime morning slots, and news sponsorship tiers.
          </p>
        </div>

        {permissions.canManageSettings && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-[#F58220] hover:bg-[#e07316] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Rate Package</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-xs text-slate-400">
            Loading rate card packages...
          </div>
        ) : packages.length > 0 ? (
          packages.map((pkg) => (
            <div
              key={pkg.id}
              className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 flex flex-col justify-between hover:border-slate-300 transition-colors space-y-4"
            >
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-sm text-[#07182B]">{pkg.name}</h3>
                  <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                    Active
                  </span>
                </div>
                <p className="text-xs text-slate-500 min-h-[36px]">{pkg.description}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Per Spot Rate:</span>
                  <span className="font-bold text-[#07182B] font-mono-numbers">
                    {formatTZS(pkg.priceTZS)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Spot Flight Count:</span>
                  <span className="font-semibold text-slate-800 font-mono-numbers">
                    {pkg.spotCount} Spots
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Spot Duration:</span>
                  <span className="font-semibold text-slate-800 font-mono-numbers">
                    {pkg.durationSeconds} Seconds
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Broadcast Window:</span>
                  <span className="font-medium text-slate-700">{pkg.timeSlot}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wide block">
                    Full Package Value
                  </span>
                  <span className="text-base font-extrabold text-[#F58220] font-mono-numbers">
                    {formatTZS(pkg.priceTZS * pkg.spotCount)}
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-xs text-slate-400">
            No advertising packages found. Use the Seed Station Data button in the sidebar to populate packages.
          </div>
        )}
      </div>

      {/* Add Package Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-[#07182B]">Create Commercial Package</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePackage} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Package Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Asubuhi Njema Drive Time"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#07182B] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Target listener audience and flight parameters..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#07182B] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    Rate Per Spot (TZS) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={priceTZS}
                    onChange={(e) => setPriceTZS(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#07182B] focus:outline-none font-mono-numbers"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Spot Count *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={spotCount}
                    onChange={(e) => setSpotCount(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#07182B] focus:outline-none font-mono-numbers"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Duration (Seconds)</label>
                  <input
                    type="number"
                    required
                    min={5}
                    value={durationSeconds}
                    onChange={(e) => setDurationSeconds(parseInt(e.target.value) || 30)}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#07182B] focus:outline-none font-mono-numbers"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Time Slot Window</label>
                  <input
                    type="text"
                    required
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#07182B] focus:outline-none"
                  />
                </div>
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
                  {submitting ? 'Creating...' : 'Create Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
