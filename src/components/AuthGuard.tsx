import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { 
  signInWithPassword,
  signUpWithPassword,
  resetPasswordForEmail,
  signOutUser, 
  onAuthStateChange, 
  getCurrentSession 
} from '../services/authService';
import { 
  getUserProfile, 
  getCompany, 
  findInviteByEmail, 
  acceptInvite, 
  createUserProfile, 
  createCompany, 
  createSystemSettings, 
  createDefaultCategories,
  getSystemSettings
} from '../services/userService';
import { User, Company, SystemSetting } from '../types';

interface AuthContextType {
  user: User | null;
  company: Company | null;
  settings: SystemSetting | null;
  authUser: any | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [settings, setSettings] = useState<SystemSetting | null>(null);
  const [authUser, setAuthUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const applyBranding = (data: SystemSetting | null) => {
    if (data?.primary_color) {
      document.documentElement.style.setProperty('--brand-color', data.primary_color);
    } else {
      document.documentElement.style.removeProperty('--brand-color');
    }
  };

  const refreshSettings = async () => {
    if (company) {
      const data = await getSystemSettings(company.id);
      setSettings(data);
      applyBranding(data);
    }
  };

  const bootstrap = async (session: any) => {
    if (!session?.user) {
      setUser(null);
      setCompany(null);
      setAuthUser(null);
      setLoading(false);
      return;
    }

    const sUser = session.user;
    setAuthUser(sUser);

    try {
      let profile = await getUserProfile(sUser.id);

      if (profile) {
        const companyData = await getCompany(profile.company_id);
        const settingsData = await getSystemSettings(profile.company_id);
        
        setCompany(companyData);
        setUser(profile);
        setSettings(settingsData);
        applyBranding(settingsData);
      } else {
        // User doesn't exist in public.users, check for invites
        const invite = await findInviteByEmail(sUser.email!);

        if (invite) {
          const newUser: User = {
            id: sUser.id,
            company_id: invite.company_id,
            name: sUser.user_metadata?.full_name || sUser.email?.split('@')[0] || 'Usuário',
            email: sUser.email!,
            photo_url: '',
            role: invite.role,
            status: 'active',
            team_id: invite.team_id,
            commission_type: invite.commission_type,
            commission_value: invite.commission_value,
            created_at: new Date().toISOString()
          };

          await createUserProfile(newUser);
          await acceptInvite(invite.id);
          
          const companyData = await getCompany(invite.company_id);
          const settingsData = await getSystemSettings(invite.company_id);
          
          setCompany(companyData);
          setUser(newUser);
          setSettings(settingsData);
          applyBranding(settingsData);
        } else {
          // No invite, create new company and admin profile
          const userName = sUser.user_metadata?.full_name || sUser.email?.split('@')[0] || 'Usuário';
          const createdCompany = await createCompany({
            legal_name: `${userName} Corretora`,
            trade_name: userName,
            document: '',
            status: 'active'
          });

          const newUser: User = {
            id: sUser.id,
            company_id: createdCompany.id,
            name: userName,
            email: sUser.email!,
            photo_url: '',
            role: 'admin',
            status: 'active',
            created_at: new Date().toISOString()
          };

          await createUserProfile(newUser);
          await createSystemSettings({
            company_id: createdCompany.id,
            theme: 'light'
          });
          await createDefaultCategories(createdCompany.id);

          setCompany(createdCompany);
          setUser(newUser);
          const settingsData = await getSystemSettings(createdCompany.id);
          setSettings(settingsData);
          applyBranding(settingsData);
        }
      }
    } catch (error) {
      console.error('Error during bootstrap:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial session check
    getCurrentSession().then(bootstrap);

    // Listen for auth changes
    const subscription = onAuthStateChange((session) => {
      bootstrap(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      await signOutUser();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, company, settings, authUser, loading, signOut, refreshSettings }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}import { ConfigScreen, AuthForms } from './Auth/AuthForms';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const env = (window as any)?.__ENV__ || import.meta.env;
  const isConfigured = !!env.VITE_SUPABASE_URL && !!env.VITE_SUPABASE_ANON_KEY;

  if (!isConfigured) {
    return <ConfigScreen />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#f5f5f0]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthForms />;
  }

  return <>{children}</>;
}
