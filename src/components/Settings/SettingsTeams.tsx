import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthGuard';
import { getCompanyTeams, createTeam, updateTeam, getCompanyUsers } from '../../services/settingsService';
import { Team, User } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { LayoutGrid, Plus, Save } from 'lucide-react';
import { teamSchema } from '../../lib/validation';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

export default function SettingsTeams() {
  const { company } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamForm, setTeamForm] = useState({
    name: '',
    manager_user_id: '',
    description: '',
    status: 'active' as 'active' | 'inactive'
  });
  const [isSavingTeam, setIsSavingTeam] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    if (company) {
      const [teamsData, usersData] = await Promise.all([
        getCompanyTeams(company.id),
        getCompanyUsers(company.id)
      ]);
      setTeams(teamsData);
      setUsers(usersData);
    }
  };

  useEffect(() => {
    fetchData();
  }, [company]);

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;

    setIsSavingTeam(true);
    try {
      teamSchema.parse(teamForm);

      if (editingTeam) {
        await updateTeam(editingTeam.id, teamForm);
        toast({ type: 'success', message: 'Time atualizado!' });
      } else {
        await createTeam({
          ...teamForm,
          company_id: company.id,
          created_at: new Date().toISOString()
        });
        toast({ type: 'success', message: 'Time criado!' });
      }
      setTeamForm({ name: '', manager_user_id: '', description: '', status: 'active' });
      setEditingTeam(null);
      setShowTeamForm(false);
      
      await fetchData();
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        toast({ type: 'error', message: error.errors[0]?.message });
      } else {
        toast({ type: 'error', message: 'Erro ao salvar time.' });
      }
    } finally {
      setIsSavingTeam(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif text-gray-900">Gestão de Times</h2>
          <p className="text-gray-500">Organize seus corretores em equipes</p>
        </div>
        <button
          onClick={() => {
            setEditingTeam(null);
            setTeamForm({ name: '', manager_user_id: '', description: '', status: 'active' });
            setShowTeamForm(!showTeamForm);
          }}
          className="bg-brand text-white px-6 py-3 rounded-2xl flex items-center justify-center space-x-2 hover:bg-[#4A4A30] transition-all shadow-md font-medium"
        >
          <Plus size={20} />
          <span>Novo Time</span>
        </button>
      </div>

      <AnimatePresence>
        {showTeamForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white p-8 rounded-[2rem] border border-brand/20 shadow-xl shadow-brand/5">
              <form onSubmit={handleSaveTeam} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 ml-1">Nome do Time</label>
                    <input
                      type="text"
                      value={teamForm.name}
                      onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                      placeholder="Ex: Time Alpha"
                      className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-brand outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 ml-1">Gestor Responsável</label>
                    <select
                      value={teamForm.manager_user_id}
                      onChange={(e) => setTeamForm({ ...teamForm, manager_user_id: e.target.value })}
                      className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-brand outline-none"
                    >
                      <option value="">Selecionar gestor...</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowTeamForm(false)}
                    className="px-6 py-3 rounded-xl text-gray-500 hover:bg-gray-100 transition-all font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingTeam}
                    className="bg-brand text-white px-8 py-3 rounded-xl hover:bg-[#4A4A30] transition-all font-medium flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {isSavingTeam ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Save size={20} />
                    )}
                    <span>{editingTeam ? 'Atualizar Time' : 'Salvar Time'}</span>
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map(team => {
          const manager = users.find(u => u.id === team.manager_user_id);
          const members = users.filter(u => u.team_id === team.id);
          
          return (
            <div key={team.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-brand/5 text-brand rounded-2xl">
                    <LayoutGrid size={24} />
                  </div>
                  <span className={cn(
                    "text-[10px] font-bold uppercase px-2 py-1 rounded-md",
                    team.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  )}>
                    {team.status === 'active' ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <h3 className="text-xl font-serif text-gray-900 mb-1">{team.name}</h3>
                <p className="text-sm text-gray-500 mb-4">Gestor: <span className="font-semibold text-gray-700">{manager?.name || 'Não atribuído'}</span></p>
                <div className="flex -space-x-3 mb-6">
                  {members.slice(0, 5).map((m, i) => (
                    <div key={m.id} className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-[10px] font-medium text-gray-600 z-[1]" style={{ zIndex: 5 - i }}>
                      {m.name.charAt(0)}
                    </div>
                  ))}
                  {members.length > 5 && (
                    <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[10px] font-medium text-gray-500 z-[0]">
                      +{members.length - 5}
                    </div>
                  )}
                  {members.length === 0 && (
                    <span className="text-xs text-gray-400">Nenhum membro</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  setEditingTeam(team);
                  setTeamForm({
                    name: team.name,
                    manager_user_id: team.manager_user_id,
                    description: team.description || '',
                    status: team.status
                  });
                  setShowTeamForm(true);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="w-full py-3 bg-gray-50 text-brand font-medium rounded-xl hover:bg-gray-100 transition-colors"
              >
                Editar Equipe
              </button>
            </div>
          );
        })}
        {teams.length === 0 && !showTeamForm && (
          <div className="col-span-full py-12 text-center bg-white rounded-3xl border border-gray-100 border-dashed">
            <LayoutGrid size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">Nenhum time criado nesta empresa.</p>
          </div>
        )}
      </div>
    </div>
  );
}
