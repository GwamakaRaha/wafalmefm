import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, testFirestoreConnection } from '../lib/firebase';
import { StaffMember, StaffRole, StaffPermission } from '../types';
import { getPermissionsForRole } from '../lib/permissions';
import { bootstrapStaffAccount, getStaffProfile } from '../services/staff-service';
import { checkHasData, seedWafalmeDatabase } from '../services/db-seed-service';

interface AuthContextValue {
  user: User | null;
  staff: StaffMember | null;
  activeRole: StaffRole;
  permissions: StaffPermission;
  isLoading: boolean;
  firestoreStatus: { success: boolean; message: string; details?: string };
  previewRoleOverride: StaffRole | null;
  setPreviewRoleOverride: (role: StaffRole | null) => void;
  signInWithGoogle: () => Promise<void>;
  signInDemoUser: (role?: StaffRole) => Promise<void>;
  logout: () => Promise<void>;
  refreshStaff: () => Promise<void>;
  seedInitialDataIfEmpty: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [staff, setStaff] = useState<StaffMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [previewRoleOverride, setPreviewRoleOverride] = useState<StaffRole | null>(null);
  const [firestoreStatus, setFirestoreStatus] = useState<{
    success: boolean;
    message: string;
    details?: string;
  }>({
    success: false,
    message: 'Testing connection...',
  });

  // Verify connection to Firestore at boot
  useEffect(() => {
    testFirestoreConnection().then(setFirestoreStatus);
  }, []);

  const refreshStaff = async () => {
    if (!user) return;
    try {
      const profile = await getStaffProfile(user.uid);
      if (profile) {
        setStaff(profile);
      }
    } catch (e) {
      console.warn('Error refreshing staff profile:', e);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const staffProfile = await bootstrapStaffAccount(currentUser);
          setStaff(staffProfile);
          // Auto seed if database is brand new
          const hasData = await checkHasData();
          if (!hasData) {
            await seedWafalmeDatabase({
              uid: currentUser.uid,
              email: currentUser.email || 'director@wafalmefm.co.tz',
            });
          }
        } catch (error) {
          console.warn('Failed bootstrapping staff:', error);
        }
      } else {
        setStaff(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Google Sign-in failed:', msg);
      // In certain sandboxed iFrames where third-party popups are blocked by browser settings,
      // provide immediate feedback and allow dev-mode fallback
      alert(`Google Sign-In: ${msg}. If popup is blocked by your browser in this preview sandbox, you can also use Quick Station Operator Access.`);
    } finally {
      setIsLoading(false);
    }
  };

  const signInDemoUser = async (role: StaffRole = 'Super Admin') => {
    setIsLoading(true);
    // Development simulated sign-in for iframe sandboxes
    const mockUid = 'wafalme-root-superadmin-01';
    const mockUser = {
      uid: mockUid,
      email: 'makajoseph97@gmail.com',
      displayName: 'Joseph Maka (Managing Director)',
      emailVerified: true,
      providerData: [{ providerId: 'google.com', email: 'makajoseph97@gmail.com' }],
    } as unknown as User;

    setUser(mockUser);
    const demoStaff: StaffMember = {
      uid: mockUid,
      email: 'makajoseph97@gmail.com',
      fullName: 'Joseph Maka',
      phone: '+255 754 000 891',
      role,
      department: 'Executive Management',
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    setStaff(demoStaff);

    try {
      const hasData = await checkHasData();
      if (!hasData) {
        await seedWafalmeDatabase({ uid: mockUid, email: 'makajoseph97@gmail.com' });
      }
    } catch (e) {
      console.warn('Seed database during demo sign-in:', e);
    }

    setIsLoading(false);
  };

  const logout = async () => {
    try {
      await fbSignOut(auth);
    } catch (e) {
      console.warn('Sign out:', e);
    }
    setUser(null);
    setStaff(null);
    setPreviewRoleOverride(null);
  };

  const seedInitialDataIfEmpty = async () => {
    if (!user) return;
    await seedWafalmeDatabase({ uid: user.uid, email: user.email || '' });
    await refreshStaff();
  };

  // Determine active role
  const activeRole: StaffRole = previewRoleOverride || staff?.role || 'Super Admin';
  const permissions: StaffPermission = getPermissionsForRole(activeRole);

  return (
    <AuthContext.Provider
      value={{
        user,
        staff,
        activeRole,
        permissions,
        isLoading,
        firestoreStatus,
        previewRoleOverride,
        setPreviewRoleOverride,
        signInWithGoogle,
        signInDemoUser,
        logout,
        refreshStaff,
        seedInitialDataIfEmpty,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
