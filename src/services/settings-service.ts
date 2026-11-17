import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { SystemSettings } from '../types';
import { logAuditEvent } from './audit-service';

export const DEFAULT_SETTINGS: SystemSettings = {
  id: 'stationConfig',
  stationName: 'Wafalme FM',
  tagline: 'Manage. Broadcast. Track. Grow.',
  frequencies: '89.1 FM Dar es Salaam · 92.5 FM Morogoro · 104.3 FM Dodoma',
  currency: 'TZS',
  timezone: 'Africa/Dar_es_Salaam',
  vatRatePercentage: 18,
  swahiliSmsEnabled: true,
  darEsSalaamOffice: 'Samora Avenue, Commercial Towers 7th Fl, Dar es Salaam, Tanzania',
  phoneContact: '+255 22 211 4500 / +255 754 000 891',
  emailContact: 'traffic@wafalmefm.co.tz',
  updatedAt: new Date().toISOString(),
};

export async function fetchSystemSettings(): Promise<SystemSettings> {
  if (!auth.currentUser) {
    return DEFAULT_SETTINGS;
  }
  const path = 'systemSettings/stationConfig';
  try {
    const docRef = doc(db, 'systemSettings', 'stationConfig');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as SystemSettings;
    }
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.warn('System settings fetch warning:', error);
    return DEFAULT_SETTINGS;
  }
}

export async function updateSystemSettings(
  settings: Partial<SystemSettings>,
  adminUid: string,
  adminEmail: string
): Promise<SystemSettings> {
  const current = await fetchSystemSettings();
  const updated: SystemSettings = {
    ...current,
    ...settings,
    id: 'stationConfig',
    updatedAt: new Date().toISOString(),
  };

  if (!auth.currentUser) {
    return updated;
  }

  const path = 'systemSettings/stationConfig';
  try {
    await setDoc(doc(db, 'systemSettings', 'stationConfig'), updated, { merge: true });

    await logAuditEvent({
      performedByUid: adminUid,
      performedByEmail: adminEmail,
      action: 'UPDATE_SYSTEM_SETTINGS',
      targetCollection: 'systemSettings',
      targetDocumentId: 'stationConfig',
      details: 'Updated station commercial rules and settings configuration.',
    });

    return updated;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
