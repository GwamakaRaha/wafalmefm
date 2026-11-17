import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { StaffMember, StaffRole } from '../types';
import { logAuditEvent } from './audit-service';

const STAFF_COLLECTION = 'staff';

export const DEFAULT_STAFF_ROSTER: StaffMember[] = [
  {
    uid: 'staff_superadmin_01',
    email: 'makajoseph97@gmail.com',
    fullName: 'Joseph Maka',
    phone: '+255 754 000 891',
    role: 'Super Admin',
    department: 'Executive Management',
    isActive: true,
    createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
  },
  {
    uid: 'staff_admin_02',
    email: 'h.mushi@wafalmefm.co.tz',
    fullName: 'Halima Mushi',
    phone: '+255 784 112 334',
    role: 'Admin',
    department: 'Station Operations',
    isActive: true,
    createdAt: new Date(Date.now() - 75 * 86400000).toISOString(),
  },
  {
    uid: 'staff_sales_03',
    email: 'j.mwamburi@wafalmefm.co.tz',
    fullName: 'Juma Mwamburi',
    phone: '+255 655 889 001',
    role: 'Sales Agent',
    department: 'Commercial Sales',
    isActive: true,
    createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
  },
  {
    uid: 'staff_acct_04',
    email: 'f.salum@wafalmefm.co.tz',
    fullName: 'Fatma Salum',
    phone: '+255 713 445 667',
    role: 'Accountant',
    department: 'Finance & Accounts',
    isActive: true,
    createdAt: new Date(Date.now() - 50 * 86400000).toISOString(),
  },
  {
    uid: 'staff_traffic_05',
    email: 'k.masoud@wafalmefm.co.tz',
    fullName: 'Khamis Masoud',
    phone: '+255 754 332 119',
    role: 'Traffic / Programming Manager',
    department: 'Traffic & Scheduling',
    isActive: true,
    createdAt: new Date(Date.now() - 40 * 86400000).toISOString(),
  },
  {
    uid: 'staff_presenter_06',
    email: 'm.said@wafalmefm.co.tz',
    fullName: 'Mariam Said',
    phone: '+255 788 776 554',
    role: 'Presenter / Operator',
    department: 'Studio & Programming',
    isActive: true,
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
];

export async function getStaffProfile(uid: string): Promise<StaffMember | null> {
  if (!auth.currentUser) {
    const match = DEFAULT_STAFF_ROSTER.find((m) => m.uid === uid || m.email === 'makajoseph97@gmail.com');
    return match || DEFAULT_STAFF_ROSTER[0];
  }

  const path = `${STAFF_COLLECTION}/${uid}`;
  try {
    const docSnap = await getDoc(doc(db, STAFF_COLLECTION, uid));
    if (docSnap.exists()) {
      return docSnap.data() as StaffMember;
    }
    return null;
  } catch (error) {
    console.warn(`Staff profile lookup for ${uid}:`, error);
    return null;
  }
}

export async function fetchAllStaff(): Promise<StaffMember[]> {
  const path = STAFF_COLLECTION;

  // Never query secured collections without authenticated Firebase user
  if (!auth.currentUser) {
    return DEFAULT_STAFF_ROSTER;
  }

  try {
    const snapshot = await getDocs(collection(db, STAFF_COLLECTION));
    if (snapshot.empty) {
      // Seed default roster into Firestore
      try {
        for (const member of DEFAULT_STAFF_ROSTER) {
          await setDoc(doc(db, STAFF_COLLECTION, member.uid), member, { merge: true });
        }
      } catch (seedErr) {
        console.warn('Seeding initial staff roster notice:', seedErr);
      }
      return DEFAULT_STAFF_ROSTER;
    }
    return snapshot.docs.map((d) => d.data() as StaffMember);
  } catch (error) {
    console.warn('Staff collection query notice, using station roster fallback:', error);
    return DEFAULT_STAFF_ROSTER;
  }
}

/**
 * Ensures the authenticated user has a registered staff record.
 * If user is makajoseph97@gmail.com, assigns Super Admin.
 */
export async function bootstrapStaffAccount(user: User): Promise<StaffMember> {
  const path = `${STAFF_COLLECTION}/${user.uid}`;
  const existing = await getStaffProfile(user.uid);
  if (existing) {
    return existing;
  }

  const isRootAdmin = user.email?.toLowerCase() === 'makajoseph97@gmail.com';
  const newStaff: StaffMember = {
    uid: user.uid,
    email: user.email || 'operator@wafalmefm.co.tz',
    fullName: user.displayName || (isRootAdmin ? 'Joseph Maka (Managing Director)' : 'Wafalme FM Staff'),
    phone: '+255 754 000 891',
    role: isRootAdmin ? 'Super Admin' : 'Sales Agent',
    department: isRootAdmin ? 'Executive Management' : 'Commercial Sales',
    isActive: true,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, STAFF_COLLECTION, user.uid), newStaff);
    await logAuditEvent({
      performedByUid: user.uid,
      performedByEmail: user.email || '',
      action: 'BOOTSTRAP_STAFF_RECORD',
      targetCollection: STAFF_COLLECTION,
      targetDocumentId: user.uid,
      details: `Initialized staff account for ${user.email} with role: ${newStaff.role}`,
    });
  } catch (error) {
    console.warn('Bootstrap staff record:', error);
  }

  return newStaff;
}

export async function createStaffMember(
  data: Omit<StaffMember, 'createdAt'>,
  adminUser: { uid: string; email: string }
): Promise<StaffMember> {
  const newStaff: StaffMember = {
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (!auth.currentUser) {
    DEFAULT_STAFF_ROSTER.push(newStaff);
    return newStaff;
  }

  const path = `${STAFF_COLLECTION}/${data.uid}`;
  try {
    await setDoc(doc(db, STAFF_COLLECTION, data.uid), newStaff);

    await logAuditEvent({
      performedByUid: adminUser.uid,
      performedByEmail: adminUser.email,
      action: 'CREATE_STAFF_MEMBER',
      targetCollection: STAFF_COLLECTION,
      targetDocumentId: data.uid,
      details: `Added new staff member ${data.fullName} (${data.email}) as ${data.role}`,
    });

    return newStaff;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateStaffRoleAndStatus(
  uid: string,
  role: StaffRole,
  isActive: boolean,
  adminUser: { uid: string; email: string }
): Promise<void> {
  if (!auth.currentUser) {
    const idx = DEFAULT_STAFF_ROSTER.findIndex((m) => m.uid === uid);
    if (idx !== -1) {
      DEFAULT_STAFF_ROSTER[idx].role = role;
      DEFAULT_STAFF_ROSTER[idx].isActive = isActive;
    }
    return;
  }

  const path = `${STAFF_COLLECTION}/${uid}`;
  try {
    await updateDoc(doc(db, STAFF_COLLECTION, uid), {
      role,
      isActive,
      updatedAt: new Date().toISOString(),
    });

    await logAuditEvent({
      performedByUid: adminUser.uid,
      performedByEmail: adminUser.email,
      action: 'UPDATE_STAFF_ROLE',
      targetCollection: STAFF_COLLECTION,
      targetDocumentId: uid,
      details: `Updated staff permissions: Role=${role}, Active=${isActive}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
