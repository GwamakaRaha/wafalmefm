import React, { useState, useEffect } from 'react';
import {
  Settings,
  Radio,
  Save,
  RefreshCw,
  Database,
  Building,
  CreditCard,
  MessageSquare,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { SystemSettings } from '../types';
import { fetchSystemSettings, updateSystemSettings, DEFAULT_SETTINGS } from '../services/settings-service';
import { testFirestoreConnection } from '../lib/firebase';

export const SystemSettingsPage: React.FC = () => {
  const { user, staff, activeRole, permissions, firestoreStatus, seedInitialDataIfEmpty } = useAuth();

  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [liveTestResult, setLiveTestResult] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await fetchSystemSettings();
        setSettings(data);
      } catch (err) {
        console.warn('Load settings:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setSaveSuccess(false);
    setErrorMessage(null);

    try {
      const updated = await updateSystemSettings(
        settings,
        user.uid,
        user.email || 'director@wafalmefm.co.tz'
      );
      setSettings(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleRunDiagnostics = async () => {
    setLiveTestResult('Querying server-side Firestore instance...');
    const res = await testFirestoreConnection();
    setLiveTestResult(
      res.success
        ? `Status: Operational. ${res.message} (Target: ${res.details})`
        : `Status: Error. ${res.message}`
    );
  };

  const handleSeedData = async () => {
    setSeeding(true);
    try {
      await seedInitialDataIfEmpty();
      alert('Wafalme FM commercial packages, clients, and campaigns populated successfully!');
    } catch (err: unknown) {
      alert(`Seeding notice: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSeeding(false);
    }
  };

  const canEdit = permissions.canManageSettings;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#F58220] uppercase tracking-wide">
            <Radio className="w-4 h-4" />
            <span>Station Infrastructure & Configuration</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[#07182B]">
            System Settings & Commercial Rules
          </h2>
          <p className="text-xs text-slate-500">
            Configure transmission transmitters, Tanzania VAT tax policy, TZS financial parameters, and Swahili SMS notifications.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRunDiagnostics}
            className="px-3.5 py-1.5 text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Database className="w-3.5 h-3.5 text-[#F58220]" />
            <span>Test DB Live</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Station settings and commercial configuration successfully saved and synchronized.</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>Error saving settings: {errorMessage}</span>
        </div>
      )}

      {liveTestResult && (
        <div className="p-3 bg-slate-900 text-slate-100 rounded-xl border border-slate-800 text-xs font-mono-numbers flex items-center justify-between">
          <span>{liveTestResult}</span>
          <button
            onClick={() => setLiveTestResult(null)}
            className="text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Station Identity */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-[#07182B] border-b border-slate-100 pb-2">
            <Radio className="w-4 h-4 text-[#F58220]" />
            <h3>Station Identity & Coverage Frequencies</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Station Name</label>
              <input
                type="text"
                disabled={!canEdit}
                value={settings.stationName}
                onChange={(e) => setSettings({ ...settings, stationName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#07182B] focus:outline-none disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Station Tagline</label>
              <input
                type="text"
                disabled={!canEdit}
                value={settings.tagline}
                onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#07182B] focus:outline-none disabled:bg-slate-50"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-slate-700 font-semibold mb-1">
                Broadcast Transmitter Frequencies
              </label>
              <input
                type="text"
                disabled={!canEdit}
                value={settings.frequencies}
                onChange={(e) => setSettings({ ...settings, frequencies: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#07182B] focus:outline-none disabled:bg-slate-50"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Primary active broadcast frequencies across mainland Tanzania.
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-slate-700 font-semibold mb-1">Headquarters Address</label>
              <input
                type="text"
                disabled={!canEdit}
                value={settings.darEsSalaamOffice}
                onChange={(e) => setSettings({ ...settings, darEsSalaamOffice: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#07182B] focus:outline-none disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Office Telephone</label>
              <input
                type="text"
                disabled={!canEdit}
                value={settings.phoneContact}
                onChange={(e) => setSettings({ ...settings, phoneContact: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#07182B] focus:outline-none disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Traffic Inquiries Email</label>
              <input
                type="email"
                disabled={!canEdit}
                value={settings.emailContact}
                onChange={(e) => setSettings({ ...settings, emailContact: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#07182B] focus:outline-none disabled:bg-slate-50"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Financial & Regulatory Rules */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-[#07182B] border-b border-slate-100 pb-2">
            <CreditCard className="w-4 h-4 text-emerald-600" />
            <h3>Financial & Tax Compliance Rules (Tanzania Revenue Authority)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Operating Currency</label>
              <input
                type="text"
                disabled
                value={settings.currency}
                className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded text-slate-600 font-mono-numbers font-semibold"
              />
              <p className="mt-1 text-[11px] text-slate-500">Tanzanian Shilling (TZS)</p>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Value Added Tax (VAT) %
              </label>
              <input
                type="number"
                disabled={!canEdit}
                value={settings.vatRatePercentage}
                onChange={(e) =>
                  setSettings({ ...settings, vatRatePercentage: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#07182B] focus:outline-none font-mono-numbers"
              />
              <p className="mt-1 text-[11px] text-slate-500">TRA Standard Commercial Rate: 18%</p>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Timezone</label>
              <input
                type="text"
                disabled
                value={settings.timezone}
                className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded text-slate-600 font-mono-numbers"
              />
              <p className="mt-1 text-[11px] text-slate-500">Africa/Dar_es_Salaam (EAT, UTC+3)</p>
            </div>
          </div>
        </div>

        {/* Section 3: Swahili SMS Alerts */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-[#07182B] border-b border-slate-100 pb-2">
            <MessageSquare className="w-4 h-4 text-[#F58220]" />
            <h3>Client SMS Gateway (Swahili Language)</h3>
          </div>

          <div className="text-xs space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="smsCheck"
                disabled={!canEdit}
                checked={settings.swahiliSmsEnabled}
                onChange={(e) =>
                  setSettings({ ...settings, swahiliSmsEnabled: e.target.checked })
                }
                className="rounded text-[#07182B]"
              />
              <label htmlFor="smsCheck" className="text-slate-800 font-medium">
                Enable automated Swahili SMS notifications upon confirmed on-air playback & invoice receipts
              </label>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 font-mono-numbers text-[11px] space-y-1">
              <div className="font-semibold text-slate-900">Standard Broadcast Swahili SMS Template:</div>
              <p>
                "Wafalme FM: Tangazo la [Campaign] limerushwa hewani saa [Time] kwenye [ShowName]. Asante kwa kuchagua Wafalme FM 89.1 Dar es Salaam."
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        {canEdit ? (
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleSeedData}
              disabled={seeding}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-[#F58220]" />
              <span>{seeding ? 'Seeding...' : 'Populate Standard Tanzanian Packages & Clients'}</span>
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-[#F58220] hover:bg-[#e07316] text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving Changes...' : 'Save Settings'}</span>
            </button>
          </div>
        ) : (
          <div className="p-3 bg-slate-100 text-slate-600 text-xs rounded border border-slate-200">
            You are logged in as <strong>{activeRole}</strong>. Only Super Admins and Station Admins have authority to mutate system settings.
          </div>
        )}
      </form>
    </div>
  );
};
