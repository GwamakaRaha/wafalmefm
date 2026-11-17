import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

/* CRITICAL: Must pass firestoreDatabaseId */
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export { firebaseConfig };

/**
 * Startup connectivity test as specified in Firebase Integration guidelines.
 */
export async function testFirestoreConnection(): Promise<{ success: boolean; message: string; details?: string }> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return {
      success: true,
      message: 'Cloud Firestore is reachable and operational.',
      details: `Database: ${firebaseConfig.firestoreDatabaseId} (${firebaseConfig.projectId})`
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (errorMsg.includes('the client is offline')) {
      console.warn('Firestore offline:', errorMsg);
      return {
        success: false,
        message: 'Client is offline. Verify network connection and Firebase configuration.',
        details: errorMsg
      };
    }
    // If it reached the server but got not-found or permission check, the connection is alive!
    return {
      success: true,
      message: 'Cloud Firestore responded from server.',
      details: errorMsg
    };
  }
}
