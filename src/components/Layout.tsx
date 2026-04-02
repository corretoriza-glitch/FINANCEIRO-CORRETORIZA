import React from 'react';
import { 
  LayoutDashboard, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Users, 
  Settings, 
  LogOut, 
  PieChart, 
  FileText,
  DollarSign,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from './AuthGuard';
import { cn } from '../lib/utils';

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick: () => void;
}

function NavItem({ icon: Icon, label, active, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full text-left",
        active 
          ? "bg-brand text-white shadow-md" 
          : "text-brand hover:bg-brand/10"
      )}
    >
      <Icon size={20} />
      <span className="font-medium text-sm">{label}</span>
    </button>
  );
}

// Roles hierarchy — each role can see their own level and below
const ROLE_ACCESS: Record<string, string[]> = {
  admin:   ['admin', 'finance', 'manager', 'broker', 'partner', 'read'],
  finance: ['finance', 'manager', 'broker', 'partner', 'read'],
  manager: ['manager', 'broker', 'partner', 'read'],
  partner: ['partner', 'read'],
  broker:  ['broker', 'read'],
  read:    ['read'],
};

function canAccess(userRole: string | undefined, requiredRoles: string[] | undefined): boolean {
  // If no role restriction, everyone can see it
  if (!requiredRoles || requiredRoles.length === 0) return true;
  // If user has no role yet, only show unrestricted items
  if (!userRole) return false;
  // If user's role is in the required list, allow
  if (requiredRoles.includes(userRole)) return true;
  // Fallback: admin always has access
  return userRole === 'admin';
}

export function Layout({ children, activeTab, onTabChange }: { 
  children: React.ReactNode; 
  activeTab: string;
  onTabChange: (tab: string) => void;
}) {
  const { user, signOut, settings } = useAuth();

  const navItems = [
    { id: 'dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'transactions', icon: ArrowUpRight,     label: 'Transações',       roles: ['admin', 'finance'] },
    { id: 'payable',      icon: ArrowDownLeft,    label: 'Contas a Pagar',   roles: ['admin', 'finance'] },
    { id: 'receivable',   icon: DollarSign,       label: 'Contas a Receber', roles: ['admin', 'finance'] },
    { id: 'commissions',  icon: PieChart,         label: 'Comissões',        roles: ['admin', 'finance', 'manager', 'broker'] },
    { id: 'reports',      icon: FileText,         label: 'Relatórios',       roles: ['admin', 'finance', 'manager', 'partner'] },
    { id: 'closing',      icon: ShieldCheck,      label: 'Auditoria',        roles: ['admin'] },
    { id: 'users',        icon: Users,            label: 'Usuários',         roles: ['admin'] },
    { id: 'settings',     icon: Settings,         label: 'Configurações',    roles: ['admin'] },
  ];

  const filteredNavItems = navItems.filter(item => canAccess(user?.role, item.roles));

  return (
    <div className="flex h-screen bg-[#f5f5f0] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-brand/10 flex flex-col p-6 shrink-0">
        <div className="mb-10 flex flex-col justify-center min-h-[4rem]">
          {settings?.logo_url ? (
            <img 
              src={settings.logo_url} 
              alt="Logo Empresa" 
              className="max-h-12 w-auto object-contain"
            />
          ) : (
            <>
              <h1 className="text-xl font-serif font-bold text-[#1a1a1a]">Corretoriza</h1>
              <p className="text-[10px] uppercase tracking-widest text-brand/60">Financeiro</p>
            </>
          )}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto">
          {filteredNavItems.map((item) => (
            <NavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeTab === item.id}
              onClick={() => onTabChange(item.id)}
            />
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-brand/10 shrink-0">
          <button
            onClick={() => onTabChange('profile')}
            className={cn(
              "flex items-center gap-3 px-2 py-3 rounded-xl transition-all w-full text-left mb-4",
              activeTab === 'profile' ? "bg-gray-100" : "hover:bg-gray-50"
            )}
          >
            <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold overflow-hidden shrink-0">
              {user?.photo_url ? (
                <img src={user.photo_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span>{user?.name?.charAt(0)?.toUpperCase() || '?'}</span>
              )}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-[#1a1a1a] truncate">{user?.name || 'Usuário'}</p>
              <p className="text-[10px] text-brand/60 capitalize">{user?.role || '—'}</p>
            </div>
          </button>
          
          <button
            onClick={() => signOut()}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-all w-full text-left"
          >
            <LogOut size={20} />
            <span className="font-medium text-sm">Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
