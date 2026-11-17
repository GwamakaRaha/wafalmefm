import { collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { AuditLog } from '../types';

const AUDIT_COLLECTION = 'auditLogs';

export async function logAuditEvent(params: {
  performedByUid: string;
  performedByEmail: string;
  action: string;
  targetCollection: string;
  targetDocumentId?: string;
  details: string;
}): Promise<void> {
  if (!auth.currentUser) {
    return; // Do not write to Firestore without authenticated user
  }
  try {
    const logData: Omit<AuditLog, 'id'> = {
      performedByUid: params.performedByUid,
      performedByEmail: params.performedByEmail,
      action: params.action,
      targetCollection: params.targetCollection,
      targetDocumentId: params.targetDocumentId || '',
      details: params.details,
      timestamp: new Date().toISOString(),
    };

    await addDoc(collection(db, AUDIT_COLLECTION), logData);
  } catch (error) {
    console.error('Failed to write audit log:', error);
    // Audit logs should not crash client operations if permissions are restricted
  }
}

export async function fetchRecentAuditLogs(maxLogs: number = 20): Promise<AuditLog[]> {
  try {
    const q = query(collection(db, AUDIT_COLLECTION), orderBy('timestamp', 'desc'), limit(maxLogs));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as AuditLog[];
  } catch (error) {
    // If not admin, return empty gracefully
    console.warn('Audit logs access:', error);
    return [];
  }
}
