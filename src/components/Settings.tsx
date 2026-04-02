import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthGuard';
import { Palette, Tag, Users as UsersIcon, User as UserIcon, LayoutGrid, LogOut } from 'lucide-react';
import SettingsBranding from './Settings/SettingsBranding';
import SettingsCategories from './Settings/SettingsCategories';
import SettingsUsers from './Settings/SettingsUsers';
import SettingsTeams from './Settings/SettingsTeams';
import SettingsProfile from './Settings/SettingsProfile';
import { AnimatePresence } from 'motion/react';

type SettingsTab = 'branding' | 'categories' | 'users' | 'profile' | 'teams';
type SettingsMode = 'system' | 'users' | 'all';

export default function Settings({ initialTab = 'branding', mode = 'all' }: { initialTab?: SettingsTab, mode?: SettingsMode }) {
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-serif text-brand">Configurações</h1>
        {activeTab === 'profile' && (
          <button 
            onClick={signOut}
            className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl transition-all"
          >
            <LogOut size={18} />
            <span className="font-medium">Sair da Conta</span>
          </button>
        )}
      </div>

      <div className="flex space-x-1 bg-white/50 p-1 rounded-2xl border border-gray-200 w-fit overflow-x-auto">
        {[
          { id: 'branding', label: 'Empresa', icon: Palette },
          { id: 'categories', label: 'Categorias', icon: Tag },
          { id: 'users', label: 'Equipe', icon: UsersIcon },
          { id: 'teams', label: 'Times', icon: LayoutGrid },
          { id: 'profile', label: 'Meu Perfil', icon: UserIcon },
        ].filter(tab => {
          if (mode === 'system') return ['branding', 'categories'].includes(tab.id);
          if (mode === 'users') return ['users', 'teams', 'profile'].includes(tab.id);
          return true;
        }).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl transition-all whitespace-nowrap ${
              activeTab === tab.id 
                ? 'bg-white text-brand shadow-sm font-medium' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon size={18} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'branding' && <SettingsBranding key="branding" />}
        {activeTab === 'users' && <SettingsUsers key="users" />}
        {activeTab === 'teams' && <SettingsTeams key="teams" />}
        {activeTab === 'categories' && <SettingsCategories key="categories" />}
        {activeTab === 'profile' && <SettingsProfile key="profile" />}
      </AnimatePresence>
    </div>
  );
}
