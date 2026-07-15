import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { 
  onAuthStateChanged, 
  signOut, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  updatePassword,
  type User 
} from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot, collection, query, where, getDocs, limit, deleteDoc, writeBatch } from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType } from "@/lib/firebase";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  storeId?: string;
  createdAt: string;
  joinedAt?: string;
  onboardingCompleted?: boolean;
  description?: string;
  onboarding?: {
    storeName: string;
    brandColor?: string;
    businessType?: string;
    [key: string]: string | number | boolean | undefined;
  };
}

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfileName: (name: string) => Promise<void>;
  updateProfileDescription: (description: string) => Promise<void>;
  sendPasswordReset: (email?: string) => Promise<void>;
  updateUserPassword: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;
    
    // Check if we need to promote an already logged-in user (e.g. from Landing Page "Get Started")
    const checkPromotion = async (u: User, p: UserProfile | null) => {
      if (!u) return;
      const isCreateStoreFlow = sessionStorage.getItem("nexa_intended_business") !== null;
      const isDevAccount = u.email === 'nexatechnologies.dev@gmail.com';
      
      if ((isDevAccount || isCreateStoreFlow) && p && p.role !== "admin") {
        console.log("Promoting user to admin based on flow/email", u.email);
        const profileRef = doc(db, "users", u.uid);
        const batch = writeBatch(db);
        batch.update(profileRef, { role: "admin", updatedAt: new Date().toISOString() });
        batch.set(doc(db, "admins", u.uid), { 
          email: u.email || "",
          createdAt: new Date().toISOString()
        });
        
        try {
          await batch.commit();
          sessionStorage.removeItem("nexa_intended_business");
          // Profile listener will pick up the update
        } catch (error) {
          console.error("Promotion failed:", error);
        }
      }
    };

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      // Clear previous snapshot listener
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      setUser(u);
      
      if (u) {
        setLoading(true);
        const profileRef = doc(db, "users", u.uid);
        
        try {
          // Wrap profile fetch in a safety timeout of 1500ms
          const snap = await Promise.race([
            getDoc(profileRef),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error("Profile fetch timed out after 1500ms")), 1500)
            )
          ]);
          
          const isCreateStoreFlow = sessionStorage.getItem("nexa_intended_business") !== null;
          const isDevAccount = u.email === 'nexatechnologies.dev@gmail.com';

          if (snap.exists()) {
            const data = snap.data() as UserProfile;
            localStorage.setItem("nexa_profile_" + u.uid, JSON.stringify(data));
            
            // Allow existing users to join the store under invitation if they don't have a storeId
            const inviteStoreId = sessionStorage.getItem("nexa_invite_storeId");
            if (inviteStoreId && !data.storeId) {
              const inviteRole = sessionStorage.getItem("nexa_invite_role") || "manager";
              console.log("Linking existing user to invited storeId", inviteStoreId);
              try {
                await setDoc(profileRef, { 
                  storeId: inviteStoreId, 
                  role: inviteRole,
                  onboardingCompleted: true 
                }, { merge: true });
                data.storeId = inviteStoreId;
                data.role = inviteRole;
                data.onboardingCompleted = true;
                localStorage.setItem("nexa_profile_" + u.uid, JSON.stringify(data));
                toast.success("Successfully joined the store!");
              } catch (err) {
                console.error("Failed to link user to invited store:", err);
              } finally {
                sessionStorage.removeItem("nexa_invite_storeId");
                sessionStorage.removeItem("nexa_invite_role");
                sessionStorage.removeItem("nexa_invite_storeName");
              }
            } else if ((data.role === "admin" || isDevAccount) && !data.storeId) {
              console.log("Recovering storeId for admin", u.email);
              try {
                const updatedStoreId = u.uid;
                await setDoc(profileRef, { storeId: updatedStoreId }, { merge: true });
                data.storeId = updatedStoreId;

                // Also ensure store doc exists
                const storeRef = doc(db, "stores", updatedStoreId);
                const storeSnap = await getDoc(storeRef);
                if (!storeSnap.exists()) {
                  console.log("Creating missing store doc for recovered admin");
                  await setDoc(storeRef, {
                    id: updatedStoreId,
                    storeName: "My Store",
                    isOnboarded: false,
                    ownerId: u.uid,
                    createdAt: new Date().toISOString()
                  });
                } else if (storeSnap.data()?.isOnboarded && !data.onboardingCompleted) {
                  // If store is onboarded but profile isn't, sync them
                  await setDoc(profileRef, { onboardingCompleted: true }, { merge: true });
                  data.onboardingCompleted = true;
                }
                localStorage.setItem("nexa_profile_" + u.uid, JSON.stringify(data));
              } catch (err) {
                console.error("Failed to recover store/profile data:", err);
                // We keep going, the user might see limited data but at least they get in
                data.storeId = u.uid; 
              }
            } else if (data.storeId) {
              // Sync existing profile with store onboarding status
              try {
                const storeSnap = await getDoc(doc(db, "stores", data.storeId));
                if (storeSnap.exists() && storeSnap.data()?.isOnboarded && !data.onboardingCompleted) {
                  await setDoc(profileRef, { onboardingCompleted: true }, { merge: true });
                  data.onboardingCompleted = true;
                  localStorage.setItem("nexa_profile_" + u.uid, JSON.stringify(data));
                }
              } catch (e) {
                console.warn("Failed to sync store onboarding status", e);
              }
            }
            
            setProfile(data);
            
            // Handle promotion if needed
            await checkPromotion(u, data);
          } else {
            console.log("No profile found for user, checking if they should be admin...");
            // New user detection
            let allUsersSnap;
            try {
              // Note: If this fails with permission denied, it's likely strict rules being applied.
              // We check if we are in a "create store" flow which implies intent to be an admin.
              allUsersSnap = await Promise.race([
                getDocs(query(collection(db, "users"), limit(1))),
                new Promise<never>((_, reject) => 
                  setTimeout(() => reject(new Error("Timeout checking first user")), 1500)
                )
              ]);
            } catch (error) {
              console.error("Initial users check failed:", error);
              // Fallback for dev account or onboarding flow or if we assume first-user-is-admin
              if (isDevAccount || isCreateStoreFlow) {
                allUsersSnap = { empty: true };
              } else {
                // If we can't check, we assume not-admin to be safe, but we must still create a profile
                allUsersSnap = { empty: false };
              }
            }

            // If DB is empty OR it's the dev account OR the user clicked "Create New Store"
            const inviteStoreId = sessionStorage.getItem("nexa_invite_storeId");
            const inviteRole = sessionStorage.getItem("nexa_invite_role") || "manager";

            const shouldBeAdmin = !inviteStoreId;
            const newRole = inviteStoreId ? inviteRole : "admin";
            const regName = sessionStorage.getItem("nexa_reg_name");
            
            const newStoreId = inviteStoreId ? inviteStoreId : u.uid;

            const newProfile: UserProfile = {
              id: u.uid,
              name: regName || u.displayName || u.email?.split("@")[0] || "User",
              email: u.email || "",
              role: newRole,
              storeId: newStoreId || undefined,
              createdAt: new Date().toISOString(),
              joinedAt: new Date().toISOString(),
              onboardingCompleted: inviteStoreId ? true : false,
            };
            
            const batch = writeBatch(db);
            batch.set(profileRef, newProfile);
            
            if (!inviteStoreId && newRole === "admin" && newStoreId) {
              batch.set(doc(db, "admins", u.uid), { 
                email: u.email || "",
                storeId: newStoreId,
                createdAt: new Date().toISOString()
              });
              
              const storeRef = doc(db, "stores", newStoreId);
              batch.set(storeRef, {
                id: newStoreId,
                storeName: "My New Store",
                isOnboarded: false,
                businessType: "retail",
                ownerId: u.uid,
                createdAt: new Date().toISOString()
              });

              // Check if a referral code exists in local/session storage
              const refCode = localStorage.getItem("nexaos_referral_code") || sessionStorage.getItem("nexaos_referral_code");
              if (refCode) {
                // Perform agent lookup and write to "referrals" asynchronously to keep sign-up fast
                setTimeout(async () => {
                  try {
                    const agentsSnap = await getDocs(
                      query(collection(db, "agents"), where("referralCode", "==", refCode), where("status", "==", "approved"))
                    );
                    if (!agentsSnap.empty) {
                      const agentDoc = agentsSnap.docs[0];
                      const agentData = agentDoc.data();
                      const referralId = `ref-${Date.now()}`;
                      await setDoc(doc(db, "referrals", referralId), {
                        id: referralId,
                        agentId: agentData.agentId,
                        storeId: newStoreId,
                        status: "pending",
                        createdAt: new Date().toISOString()
                      });
                      console.log(`[Referral] Linked store ${newStoreId} with agent ${agentData.agentId} under code ${refCode}`);
                      // Clean up storage so we don't attribute multiple stores to the same single session click
                      localStorage.removeItem("nexaos_referral_code");
                      sessionStorage.removeItem("nexaos_referral_code");
                    }
                  } catch (e) {
                    console.error("[Referral] Error associating referral code:", e);
                  }
                }, 500);
              }
            }
            
            try {
              await Promise.race([
                batch.commit(),
                new Promise<void>((_, reject) => 
                  setTimeout(() => reject(new Error("Timeout committing profile batch")), 1500)
                )
              ]);
              setProfile(newProfile);
              localStorage.setItem("nexa_profile_" + u.uid, JSON.stringify(newProfile));
              sessionStorage.removeItem("nexa_intended_business");
              sessionStorage.removeItem("nexa_reg_name");
              sessionStorage.removeItem("nexa_invite_storeId");
              sessionStorage.removeItem("nexa_invite_role");
              sessionStorage.removeItem("nexa_invite_storeName");
            } catch (error) {
              console.warn("Batch commit failed or timed out. Falling back to local profile state:", error);
              setProfile(newProfile);
              localStorage.setItem("nexa_profile_" + u.uid, JSON.stringify(newProfile));
              sessionStorage.removeItem("nexa_intended_business");
              sessionStorage.removeItem("nexa_reg_name");
              sessionStorage.removeItem("nexa_invite_storeId");
              sessionStorage.removeItem("nexa_invite_role");
              sessionStorage.removeItem("nexa_invite_storeName");
            }
          }
        } catch (error) {
          console.warn("Critical Auth/Profile Error: Profile unavailable or Firestore unreachable. Using cache/local fallback.", error);
          
          const cachedProfileStr = localStorage.getItem("nexa_profile_" + u.uid);
          if (cachedProfileStr) {
            try {
              const cached = JSON.parse(cachedProfileStr) as UserProfile;
              setProfile(cached);
              setLoading(false);
              return;
            } catch (e) {
              console.error("Failed to parse cached profile", e);
            }
          }

          // No cache, build safe run-time fallback
          const isCreateStoreFlow = sessionStorage.getItem("nexa_intended_business") !== null;
          const isDevAccount = u.email === 'nexatechnologies.dev@gmail.com';
          const regName = sessionStorage.getItem("nexa_reg_name");
          const inviteStoreId = sessionStorage.getItem("nexa_invite_storeId");
          const inviteRole = sessionStorage.getItem("nexa_invite_role") || "manager";

          const newRole = inviteStoreId ? inviteRole : "admin";
          const newStoreId = inviteStoreId ? inviteStoreId : u.uid;

          const fallbackProfile: UserProfile = {
            id: u.uid,
            name: regName || u.displayName || u.email?.split("@")[0] || "User",
            email: u.email || "",
            role: newRole,
            storeId: newStoreId,
            createdAt: new Date().toISOString(),
            joinedAt: new Date().toISOString(),
            onboardingCompleted: inviteStoreId ? true : false,
          };
          
          localStorage.setItem("nexa_profile_" + u.uid, JSON.stringify(fallbackProfile));
          setProfile(fallbackProfile);
        } finally {
          setLoading(false);
        }

        // Listen for profile changes
        unsubProfile = onSnapshot(profileRef, (s) => {
          if (s.exists()) {
            const data = s.data() as UserProfile;
            setProfile(data);
            localStorage.setItem("nexa_profile_" + u.uid, JSON.stringify(data));
          }
        }, (error) => {
          console.warn("Profile snapshot listener encountered an error:", error.message);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const cleanEmail = email.trim().toLowerCase();
    try {
      await signInWithEmailAndPassword(auth, cleanEmail, password);
    } catch (authError: unknown) {
      // If sign in fails, see if there is a matching user in our Firestore collection with a matching temporary password
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", cleanEmail), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const userDoc = snap.docs[0];
          const userData = userDoc.data();
          if (userData.tempPassword && userData.tempPassword === password) {
            // Yes! They are trying to log in with their temporary password, but their Auth account is not yet created.
            // Let's create their Firebase Auth account on the fly with that temporary password!
            sessionStorage.setItem("nexa_reg_name", userData.name || cleanEmail.split("@")[0]);
            
            if (userData.storeId) {
              sessionStorage.setItem("nexa_invite_storeId", userData.storeId);
              sessionStorage.setItem("nexa_invite_role", userData.role || "manager");
            }
            
            const { user: newUser } = await createUserWithEmailAndPassword(auth, cleanEmail, password);
            if (newUser) {
              await updateProfile(newUser, { displayName: userData.name || cleanEmail.split("@")[0] });
              // Write the permanent user profile using their actual Firebase Auth UID
              await setDoc(doc(db, "users", newUser.uid), {
                id: newUser.uid,
                name: userData.name || cleanEmail.split("@")[0],
                email: cleanEmail,
                role: userData.role || "manager",
                storeId: userData.storeId || null,
                status: "active",
                joinedAt: new Date().toISOString(),
                createdAt: userData.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
              });
            }
            return;
          }
        }
      } catch (dbErr) {
        console.error("Failed to check tempPassword in Firestore:", dbErr);
      }
      throw authError;
    }
  };

  const register = async (email: string, password: string, name: string) => {
    const trimmedName = name.trim();
    sessionStorage.setItem("nexa_reg_name", trimmedName);
    const { user: newUser } = await createUserWithEmailAndPassword(auth, email.trim(), password);
    if (newUser) {
      await updateProfile(newUser, { displayName: trimmedName });
    }
  };

  const logout = async () => {
    try {
      sessionStorage.clear();
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const updateProfileName = async (name: string) => {
    if (!user) throw new Error("No user is logged in");
    const trimmedName = name.trim();
    if (!trimmedName) throw new Error("Name cannot be empty");
    
    // 1. Update firebase auth display name
    await updateProfile(user, { displayName: trimmedName });
    
    // 2. Update Firestore user profile
    const profileRef = doc(db, "users", user.uid);
    await setDoc(profileRef, { name: trimmedName, updatedAt: new Date().toISOString() }, { merge: true });
    
    toast.success("Profile name updated successfully");
  };

  const updateProfileDescription = async (description: string) => {
    if (!user) throw new Error("No user is logged in");
    
    // Update Firestore user profile with biography/description
    const profileRef = doc(db, "users", user.uid);
    await setDoc(profileRef, { description: description.trim(), updatedAt: new Date().toISOString() }, { merge: true });
    
    toast.success("Profile biography updated successfully");
  };

  const sendPasswordReset = async (email?: string) => {
    const targetEmail = email || user?.email;
    if (!targetEmail) throw new Error("No email address provided");
    await sendPasswordResetEmail(auth, targetEmail);
    toast.success(`Password reset email sent to ${targetEmail}`);
  };

  const updateUserPassword = async (password: string) => {
    if (!user) throw new Error("No user is logged in");
    if (!password || password.length < 6) throw new Error("Password must be at least 6 characters long");
    await updatePassword(user, password);
    toast.success("Password updated successfully");
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, register, logout, updateProfileName, updateProfileDescription, sendPasswordReset, updateUserPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
