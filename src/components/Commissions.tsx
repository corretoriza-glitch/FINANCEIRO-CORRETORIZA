import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Search, 
  PieChart, 
  Users, 
  DollarSign, 
  ArrowRight, 
  Trash2, 
  CheckCircle, 
  Clock,
  Percent,
  UserCheck,
  Building2,
  AlertTriangle,
  Filter,
  X,
  Loader2
} from 'lucide-react';
import { useAuth } from './AuthGuard';
import { Operation, Payout, User, Team } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { getOperations, getCompanyPayouts, createOperation, updateOperation, deleteOperation } from '../services/commissionService';
import { getCompanyUsers, getCompanyTeams, getCompanyCategories } from '../services/settingsService';
import { createAccountsPayable } from '../services/payableService';
import { createAccountsReceivable } from '../services/receivableService';

export function Commissions() {
  const { user } = useAuth();
  const [operations, setOperations] = useState<Operation[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    gross_value: '',
    predicted_payment_date: new Date().toISOString().split('T')[0],
    status: 'pending' as 'pending' | 'completed' | 'cancelled',
  });

  const [splits, setSplits] = useState<any[]>([]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [opsData, payoutsData, usersData, teamsData, catsData] = await Promise.all([
        getOperations(user.company_id),
        getCompanyPayouts(user.company_id),
        getCompanyUsers(user.company_id),
        getCompanyTeams(user.company_id),
        getCompanyCategories(user.company_id)
      ]);
      setOperations(opsData);
      setPayouts(payoutsData);
      setUsers(usersData);
      setTeams(teamsData);
      setCategories(catsData);
    } catch (error) {
      console.error('Error fetching commissions data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const filteredOperations = operations.filter(op => 
    op.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    op.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const grossValue = parseFloat(formData.gross_value) || 0;
  const calculatedSplits = splits.map(split => {
    let amount = 0;
    if (split.calculation_type === 'percentage') {
      amount = (grossValue * (split.calculation_value || 0)) / 100;
    } else {
      amount = split.calculation_value || 0;
    }
    return { ...split, amount };
  });

  const totalDistributed = calculatedSplits.reduce((acc, s) => acc + s.amount, 0);
  const corretorizaAmt = grossValue - totalDistributed;

  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (corretorizaAmt < 0) {
      alert('O valor da Corretoriza não pode ser negativo. Revise os repasses.');
      return;
    }

    setIsSaving(true);
    try {
      const operation: Partial<Operation> = {
        company_id: user.company_id,
        code: formData.code,
        description: formData.description,
        gross_value: grossValue,
        commission_base_amount: grossValue,
        distributed_amount: totalDistributed,
        corretoriza_amount: corretorizaAmt,
        status: formData.status,
        predicted_payment_date: formData.predicted_payment_date,
        created_at: new Date().toISOString()
      };

      const payoutsToSave: Partial<Payout>[] = calculatedSplits.map(s => ({
        company_id: user.company_id,
        participant_user_id: s.participant_user_id,
        participant_role: s.participant_role,
        amount: s.amount,
        calculation_type: s.calculation_type,
        calculation_value: s.calculation_value,
        status: formData.status === 'completed' ? 'paid' : 'pending',
        created_at: new Date().toISOString()
      }));

      if (editingId) {
        await updateOperation(editingId, operation, payoutsToSave);
      } else {
        await createOperation(operation, payoutsToSave);
      }

      // Criar Contas a Pagar/Receber Automático
      if (!editingId) {
        // Encontrar categorias válidas para usar no financeiro (pega a primeira disponível caso o usuário não tenha definido uma exclusiva)
        const incomeCat = categories.find(c => c.type === 'income')?.id;
        const expenseCat = categories.find(c => c.type === 'expense')?.id;

        // 1. Receita: Lança o Valor Total da Comissão na operadora em "Contas a Receber"
        if (incomeCat) {
          await createAccountsReceivable({
            company_id: user.company_id,
            due_date: formData.predicted_payment_date,
            amount: grossValue,
            payer: formData.description, // Usa a descrição/cliente da operação como o pagador
            category_id: incomeCat, 
            status: formData.status === 'completed' ? 'received' : 'pending',
            notes: `Comissão ref. Operação #${formData.code}`
          });
        }

        // 2. Despesa: Lança o Repasse de cada corretor no "Contas a Pagar"
        if (expenseCat) {
          // Lógica para +2 dias no vencimento
          const [year, month, day] = formData.predicted_payment_date.split('-').map(Number);
          const dateObj = new Date(year, month - 1, day);
          dateObj.setDate(dateObj.getDate() + 2);
          const repasseDD = String(dateObj.getDate()).padStart(2, '0');
          const repasseMM = String(dateObj.getMonth() + 1).padStart(2, '0');
          const repasseYYYY = dateObj.getFullYear();
          const repasseDueDateStr = `${repasseYYYY}-${repasseMM}-${repasseDD}`;

          for (const split of payoutsToSave) {
            const participant = users.find(u => u.id === split.participant_user_id);
            if (split.amount && split.amount > 0) {
              await createAccountsPayable({
                company_id: user.company_id,
                due_date: repasseDueDateStr,
                amount: split.amount,
                payee: participant ? participant.name : 'Corretor/Parceiro',
                category_id: expenseCat,
                status: 'pending', // Sempre manter 'Pendente (A Pagar)' para avaliação financeira
                notes: `Repasse ref. Operação #${formData.code}`
              });
            }
          }
        }
      }
      
      setShowForm(false);
      setEditingId(null);
      setFormData({ code: '', description: '', gross_value: '', predicted_payment_date: new Date().toISOString().split('T')[0], status: 'pending' });
      setSplits([]);
      alert(editingId ? 'Operação atualizada com sucesso!' : 'Operação e repasses registrados com sucesso!');
      fetchData();
    } catch (error) {
      console.error('Error saving operation:', error);
      alert('Erro ao salvar operação.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditOperation = (op: Operation) => {
    setEditingId(op.id);
    setFormData({
      code: op.code,
      description: op.description,
      gross_value: op.gross_value.toString(),
      predicted_payment_date: op.predicted_payment_date || new Date().toISOString().split('T')[0],
      status: op.status,
    });
    
    const opPayouts = payouts.filter(p => p.operation_id === op.id);
    setSplits(opPayouts.map(p => ({
      participant_user_id: p.participant_user_id,
      participant_role: p.participant_role,
      calculation_type: p.calculation_type,
      calculation_value: p.calculation_value,
      amount: p.amount,
    })));
    setShowForm(true);
  };

  const addSplit = () => {
    setSplits([...splits, { 
      participant_user_id: '', 
      participant_role: '', 
      calculation_type: 'percentage', 
      calculation_value: 0 
    }]);
  };

  const removeSplit = (index: number) => {
    setSplits(splits.filter((_, i) => i !== index));
  };

  const updateSplit = (index: number, field: string, value: any) => {
    const newSplits = [...splits];
    const split = { ...newSplits[index], [field]: value };

    if (field === 'participant_user_id') {
      const selectedUser = users.find(u => u.id === value);
      if (selectedUser) {
        // Check for duplicates
        if (splits.some((s, i) => i !== index && s.participant_user_id === value)) {
          alert('Este participante já foi adicionado a esta operação.');
          return;
        }
        split.participant_role = selectedUser.role;
        if (selectedUser.role === 'broker' && selectedUser.commission_type) {
          split.calculation_type = selectedUser.commission_type;
          split.calculation_value = selectedUser.commission_value || 0;
        }
      }
    }

    newSplits[index] = split;
    setSplits(newSplits);
  };

  const handleDeleteOperation = async (opId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta operação? Todos os repasses associados também serão excluídos.')) return;

    try {
      await deleteOperation(opId);
      alert('Operação excluída com sucesso!');
      fetchData();
    } catch (error) {
      console.error('Error deleting operation:', error);
      alert('Erro ao excluir operação.');
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-serif font-bold text-[#1a1a1a]">Comissões e Repasses</h2>
          <p className="text-brand/60">Gerencie a distribuição de valores por operação.</p>
        </div>
        <button 
          onClick={() => {
            setEditingId(null);
            setFormData({ code: '', description: '', gross_value: '', predicted_payment_date: new Date().toISOString().split('T')[0], status: 'pending' });
            setSplits([]);
            setShowForm(true);
          }}
          className="bg-brand text-white px-6 py-3 rounded-full font-bold hover:bg-[#4a4a35] transition-all shadow-lg flex items-center gap-2"
        >
          <Plus size={20} />
          Nova Operação
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Operations List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-lg font-serif font-bold text-[#1a1a1a] flex items-center gap-2">
              <DollarSign size={20} className="text-brand" />
              Operações Recentes
            </h3>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand/40" size={16} />
              <input 
                type="text" 
                placeholder="Buscar por código ou descrição..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-brand/10 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredOperations.map((op) => (
              <div key={op.id} className="bg-white p-6 rounded-3xl border border-brand/5 shadow-sm hover:shadow-md transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-brand/40 tracking-widest">#{op.code}</span>
                    <h4 className="text-lg font-bold text-[#1a1a1a]">{op.description}</h4>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="text-right">
                      <p className="text-xl font-bold text-brand">{formatCurrency(op.gross_value)}</p>
                      {op.status === 'completed' ? (
                        <span className="text-[10px] uppercase font-bold text-green-600 bg-green-50 px-2 py-1 rounded">Recebida</span>
                      ) : op.status === 'pending' ? (
                        <span className="text-[10px] uppercase font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded">Aguardando</span>
                      ) : (
                        <span className="text-[10px] uppercase font-bold text-red-600 bg-red-50 px-2 py-1 rounded">Cancelada</span>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <button 
                        onClick={() => handleEditOperation(op)}
                        className="p-2 text-brand/40 hover:text-brand hover:bg-brand/5 rounded-full transition-all opacity-0 group-hover:opacity-100"
                        title="Editar Operação"
                      >
                        <PieChart size={18} />
                      </button>
                      <button 
                        onClick={() => handleDeleteOperation(op.id)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all opacity-0 group-hover:opacity-100"
                        title="Excluir Operação"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-brand/5 pt-4 mt-4">
                  <p className="text-xs font-bold text-brand/60 uppercase mb-3">Distribuição de Repasses</p>
                  <div className="flex flex-wrap gap-3">
                    <div className="bg-brand/10 px-3 py-2 rounded-xl flex items-center gap-2 border border-brand/20">
                      <Building2 size={14} className="text-brand" />
                      <span className="text-xs font-bold text-brand">Corretoriza</span>
                      <span className="text-xs font-bold text-brand">{formatCurrency(op.corretoriza_amount)}</span>
                    </div>
                    {payouts.filter(p => p.operation_id === op.id).map(p => {
                      const participant = users.find(u => u.id === p.participant_user_id);
                      return (
                        <div key={p.id} className="bg-[#f5f5f0] px-3 py-2 rounded-xl flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-brand" />
                          <span className="text-xs font-semibold text-[#1a1a1a]">{participant?.name || 'Usuário'}</span>
                          <span className="text-[10px] text-gray-400 uppercase">({p.participant_role})</span>
                          <span className="text-xs font-bold text-brand">{formatCurrency(p.amount)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
            {operations.length === 0 && (
              <div className="bg-white p-12 rounded-3xl border border-dashed border-brand/20 text-center">
                <p className="text-brand/40 italic">Nenhuma operação registrada.</p>
              </div>
            )}
          </div>
        </div>

        {/* Summary Sidebar */}
        <div className="space-y-6">
          <div className="bg-brand p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
            <PieChart size={32} className="mb-4 opacity-50 relative z-10" />
            <h3 className="text-xl font-serif font-bold mb-2 relative z-10">Resumo Financeiro</h3>
            <p className="text-white/60 text-sm mb-6 relative z-10">Consolidado de todas as operações.</p>
            <div className="space-y-4 relative z-10">
              <div className="flex justify-between items-center">
                <span className="text-sm opacity-70">Total Bruto</span>
                <span className="font-bold">{formatCurrency(operations.reduce((acc, op) => acc + op.gross_value, 0))}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm opacity-70">Repasses (Total)</span>
                <span className="font-bold text-red-200">-{formatCurrency(payouts.reduce((acc, p) => acc + p.amount, 0))}</span>
              </div>
              <div className="h-px bg-white/10 my-2" />
              <div className="flex justify-between items-center text-lg">
                <span className="font-serif">Corretoriza Líquido</span>
                <span className="font-bold text-green-300">{formatCurrency(operations.reduce((acc, op) => acc + op.corretoriza_amount, 0))}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-brand/5 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-sm font-bold text-[#1a1a1a] uppercase tracking-wider">Time de Vendas</h4>
              <Users size={16} className="text-brand/40" />
            </div>
            <div className="space-y-4">
              {Array.from(new Set(payouts.map(p => p.participant_user_id))).map(userId => {
                const participant = users.find(u => u.id === userId);
                const team = teams.find(t => t.id === participant?.team_id);
                if (!participant) return null;
                return (
                  <div key={userId} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img 
                          src={participant.photo_url || `https://ui-avatars.com/api/?name=${participant.name}`} 
                          alt="" 
                          className="w-10 h-10 rounded-full object-cover border-2 border-brand/10"
                        />
                        <div className={cn(
                          "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white",
                          participant.status === 'active' ? "bg-green-500" : "bg-gray-300"
                        )} />
                      </div>
                      <div>
                        <p className="text-sm text-[#1a1a1a] font-bold">{participant.name}</p>
                        <p className="text-[10px] text-brand/40 uppercase font-bold">{team?.name || 'Sem Time'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-brand">
                        {formatCurrency(payouts.filter(p => p.participant_user_id === userId).reduce((acc, p) => acc + p.amount, 0))}
                      </p>
                      <p className="text-[9px] text-gray-400 uppercase font-bold">Total Recebido</p>
                    </div>
                  </div>
                );
              })}
              {payouts.length === 0 && (
                <p className="text-center text-xs text-gray-400 italic py-4">Nenhum participante com repasses.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Form */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowForm(false)} className="absolute inset-0 bg-[#1a1a1a]/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden">
              <div className="p-8 max-h-[90vh] overflow-y-auto">
                <h3 className="text-2xl font-serif font-bold text-[#1a1a1a] mb-6">Nova Operação Comercial</h3>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-brand/60 ml-2">Código da Operação</label>
                      <input required type="text" value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value})} className="w-full px-4 py-3 bg-[#f5f5f0] border-none rounded-2xl text-sm" placeholder="Ex: SEG-2026-001" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-brand/60 ml-2">Valor Bruto (Comissão)</label>
                      <input required type="number" step="0.01" value={formData.gross_value} onChange={(e) => setFormData({...formData, gross_value: e.target.value})} className="w-full px-4 py-3 bg-[#f5f5f0] border-none rounded-2xl text-sm font-bold" placeholder="0,00" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-brand/60 ml-2">Previsão de Pagamento</label>
                      <input required type="date" value={formData.predicted_payment_date} onChange={(e) => setFormData({...formData, predicted_payment_date: e.target.value})} className="w-full px-4 py-3 bg-[#f5f5f0] border-none rounded-2xl text-sm" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-brand/60 ml-2">Situação da Comissão</label>
                      <select required value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value as any})} className="w-full px-4 py-3 bg-[#f5f5f0] border-none rounded-2xl text-sm font-bold">
                        <option value="pending">Aguardando (Pendente)</option>
                        <option value="completed">Recebida</option>
                        <option value="cancelled">Cancelada</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-brand/60 ml-2">Descrição / Cliente</label>
                    <input required type="text" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-3 bg-[#f5f5f0] border-none rounded-2xl text-sm" placeholder="Ex: Seguro de Vida - João Silva" />
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] uppercase font-bold text-brand/60 ml-2">Divisão de Repasses (Split)</label>
                      <button type="button" onClick={addSplit} className="text-xs font-bold text-brand flex items-center gap-1 hover:underline">
                        <Plus size={14} /> Adicionar Participante
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      {calculatedSplits.map((split, index) => (
                        <div key={index} className="bg-gray-50 p-4 rounded-2xl space-y-4 border border-transparent hover:border-brand/10 transition-all">
                          <div className="flex gap-3 items-start">
                            <div className="flex-1 space-y-1">
                              <label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Participante</label>
                              <select 
                                required
                                value={split.participant_user_id}
                                onChange={(e) => updateSplit(index, 'participant_user_id', e.target.value)}
                                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand/20 outline-none transition-all"
                              >
                                <option value="">Selecionar Corretor/Parceiro...</option>
                                {users.filter(u => (u.role === 'broker' || u.role === 'partner') && u.status === 'active').map(u => {
                                  const team = teams.find(t => t.id === u.team_id);
                                  return (
                                    <option key={u.id} value={u.id}>
                                      {u.name} ({u.role}) {team ? `- ${team.name}` : ''}
                                    </option>
                                  );
                                })}
                              </select>
                            </div>
                            <button type="button" onClick={() => removeSplit(index)} className="mt-7 text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-all">
                              <Trash2 size={18} />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Tipo de Cálculo</label>
                              <select
                                value={split.calculation_type}
                                onChange={(e) => updateSplit(index, 'calculation_type', e.target.value)}
                                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand/20 outline-none transition-all"
                              >
                                <option value="percentage">Porcentagem (%)</option>
                                <option value="fixed">Valor Fixo (R$)</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Valor</label>
                              <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                  {split.calculation_type === 'fixed' ? <DollarSign size={14} /> : <Percent size={14} />}
                                </div>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={split.calculation_value}
                                  onChange={(e) => updateSplit(index, 'calculation_value', parseFloat(e.target.value))}
                                  className="w-full pl-8 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand/20 outline-none transition-all"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-between items-center px-2 py-2 bg-white/50 rounded-xl border border-dashed border-gray-200">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Repasse Calculado</span>
                            <span className="text-sm font-bold text-brand">{formatCurrency(split.amount)}</span>
                          </div>
                        </div>
                      ))}
                      {calculatedSplits.length === 0 && (
                        <div className="py-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                          <Users size={24} className="mx-auto mb-2 text-gray-300" />
                          <p className="text-xs text-gray-400 italic">Nenhum repasse adicionado.</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      <div className={cn(
                        "flex justify-between px-6 py-4 rounded-2xl border transition-all",
                        corretorizaAmt < 0 
                          ? "bg-red-50 border-red-200 shadow-[0_0_15px_rgba(220,38,38,0.1)]" 
                          : "bg-brand/5 border-brand/10"
                      )}>
                        <div className="flex items-center gap-2">
                          <Building2 size={18} className={corretorizaAmt < 0 ? "text-red-600" : "text-brand"} />
                          <div>
                            <p className={cn("text-xs font-bold uppercase", corretorizaAmt < 0 ? "text-red-600" : "text-brand")}>Corretoriza (Líquido)</p>
                            <p className={cn("text-[10px]", corretorizaAmt < 0 ? "text-red-400" : "text-brand/60")}>Valor restante após repasses</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={cn(
                            "text-lg font-bold",
                            corretorizaAmt < 0 ? "text-red-600" : "text-brand"
                          )}>
                            {formatCurrency(corretorizaAmt)}
                          </p>
                          {corretorizaAmt < 0 && (
                            <div className="flex items-center gap-1 text-red-600">
                              <AlertTriangle size={10} />
                              <span className="text-[10px] font-bold uppercase">Excedeu o Bruto</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-between px-6 py-3 bg-gray-50 rounded-xl text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        <span>Total Distribuído</span>
                        <span>{formatCurrency(totalDistributed)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-4 text-sm font-bold text-brand bg-[#f5f5f0] rounded-2xl hover:bg-brand/10 transition-all">Cancelar</button>
                    <button 
                      type="submit" 
                      disabled={isSaving || corretorizaAmt < 0 || !formData.code || !formData.gross_value}
                      className={cn(
                        "flex-1 py-4 text-sm font-bold text-white rounded-2xl transition-all shadow-lg",
                        (isSaving || corretorizaAmt < 0 || !formData.code || !formData.gross_value)
                          ? "bg-gray-300 cursor-not-allowed shadow-none"
                          : "bg-brand hover:bg-[#4a4a35]"
                      )}
                    >
                      {isSaving ? 'Salvando...' : 'Salvar Operação'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
