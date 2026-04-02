import React, { useEffect, useState } from 'react';
import { useAuth } from './AuthGuard';
import { Transaction, AccountsPayable, AccountsReceivable, Operation, Payout, User, Team } from '../types';
import { getTransactions } from '../services/transactionService';
import { getAccountsPayable } from '../services/payableService';
import { getAccountsReceivable } from '../services/receivableService';
import { getOperations, getCompanyPayouts } from '../services/commissionService';
import { getCompanyUsers, getCompanyTeams } from '../services/settingsService';
import { StatCard } from './Dashboard/StatCardKPI';
import { CashFlowChart } from './Dashboard/CashFlowChart';
import { CommercialRanking } from './Dashboard/CommercialRanking';
import { DashboardAlerts } from './Dashboard/DashboardAlerts';
import { formatCurrency, cn } from '../lib/utils';
import { Wallet, ArrowUpRight, ArrowDownLeft, Users, TrendingUp, AlertCircle, Download, Plus, Filter, BarChart2, PieChart } from 'lucide-react';

export function Dashboard() {
  const { user } = useAuth();
  
  // Data States
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payables, setPayables] = useState<AccountsPayable[]>([]);
  const [receivables, setReceivables] = useState<AccountsReceivable[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [sysUsers, setSysUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [period, setPeriod] = useState('month'); // 'month', '3months', '6months'
  const [teamFilter, setTeamFilter] = useState('');
  const [brokerFilter, setBrokerFilter] = useState('');

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [txData, apData, arData, opData, poData, usersData, teamsData] = await Promise.all([
        getTransactions(user.company_id),
        getAccountsPayable(user.company_id),
        getAccountsReceivable(user.company_id),
        getOperations(user.company_id),
        getCompanyPayouts(user.company_id),
        getCompanyUsers(user.company_id),
        getCompanyTeams(user.company_id)
      ]);
      setTransactions(txData);
      setPayables(apData);
      setReceivables(arData);
      setOperations(opData);
      setPayouts(poData);
      setSysUsers(usersData);
      setTeams(teamsData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // --- KPI CALCULATIONS ---
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // 1. Saldo Atual (Transações Reais Concluídas)
  const totalIncome = transactions.filter(t => t.type === 'income' && t.status === 'completed').reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense' && t.status === 'completed').reduce((acc, t) => acc + t.amount, 0);
  const balance = totalIncome - totalExpense;

  // 2. A Receber / A Pagar no Mês
  const arMonthPending = receivables.filter(r => {
    const d = new Date(r.due_date);
    return r.status === 'pending' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).reduce((acc, r) => acc + r.amount, 0);

  const apMonthPending = payables.filter(p => {
    const d = new Date(p.due_date);
    return p.status === 'pending' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).reduce((acc, p) => acc + p.amount, 0);

  // 3. Resultado do Mês (Entradas Concluídas e Receber do mês - Saídas Concluídas e Pagar do mês)
  const txIncomeMonth = transactions.filter(t => { const d = new Date(t.occurrence_date); return t.type === 'income' && d.getMonth() === currentMonth; }).reduce((acc, t) => acc + t.amount, 0);
  const txExpenseMonth = transactions.filter(t => { const d = new Date(t.occurrence_date); return t.type === 'expense' && d.getMonth() === currentMonth; }).reduce((acc, t) => acc + t.amount, 0);
  const netResult = (txIncomeMonth + arMonthPending) - (txExpenseMonth + apMonthPending);

  // 4. Comissões a Repassar (Pendentes)
  const pendingPayouts = payouts.filter(p => p.status === 'pending').reduce((acc, p) => acc + p.amount, 0);

  // 5. Contas Vencidas
  const overduePayables = payables.filter(p => p.status === 'overdue').reduce((acc, p) => acc + p.amount, 0);
  const overdueReceivables = receivables.filter(r => r.status === 'overdue').reduce((acc, r) => acc + r.amount, 0);
  const totalOverdue = overduePayables + overdueReceivables;

  // --- CHARTS DATA PREP ---
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const chartLength = period === '6months' ? 6 : period === '3months' ? 3 : 1; 
  // Custom Flow Chart (Realizado)
  const flowChartData = (() => {
    const months = [];
    for (let i = chartLength - 1; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      
      const inc = transactions.filter(t => {
        const td = new Date(t.occurrence_date);
        return t.type === 'income' && td.getMonth() === m && td.getFullYear() === y;
      }).reduce((acc, t) => acc + t.amount, 0);
      
      const exp = transactions.filter(t => {
        const td = new Date(t.occurrence_date);
        return t.type === 'expense' && td.getMonth() === m && td.getFullYear() === y;
      }).reduce((acc, t) => acc + t.amount, 0);
      
      months.push({ name: monthNames[m], Receitas: inc, Despesas: exp, Saldo: inc - exp });
    }
    return months;
  })();

  // Apply Filters to Users and Operations/Payouts for Commercial Ranking
  let filteredUsers = sysUsers;
  if (teamFilter) {
    filteredUsers = sysUsers.filter(u => u.team_id === teamFilter);
  }
  if (brokerFilter) {
    filteredUsers = filteredUsers.filter(u => u.id === brokerFilter);
  }
  const validUserIds = new Set(filteredUsers.map(u => u.id));
  const filteredPayouts = brokerFilter || teamFilter ? payouts.filter(p => validUserIds.has(p.participant_user_id)) : payouts;
  
  // Calculate Gross Operations dynamically based on filters if applied to the team
  // For gross volume, we should calculate only operations that the filtered brokers participated in.
  const operationsWithFilteredPayouts = new Set(filteredPayouts.map(p => p.operation_id));
  const filteredOperations = brokerFilter || teamFilter ? operations.filter(op => operationsWithFilteredPayouts.has(op.id)) : operations;

  const grossCommissions = filteredOperations.reduce((acc, op) => acc + op.gross_value, 0);
  const retainedCommissions = filteredOperations.reduce((acc, op) => acc + op.corretoriza_amount, 0);

  if (loading && transactions.length === 0) {
    return <div className="flex h-[50vh] items-center justify-center text-brand">Carregando dashboard...</div>;
  }

  return (
    <div className="space-y-6 pb-20">
      {/* 1. TOPO: HEADER & AÇÕES RÁPIDAS */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-serif font-bold text-[#1a1a1a]">Visão Estratégica</h2>
          <p className="text-brand/60 mt-1">Bem-vindo(a), {user?.name.split(' ')[0]}. Aqui está o panorama gerencial atual.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="flex items-center gap-2 bg-white text-brand px-5 py-2.5 rounded-xl border border-brand/10 font-bold hover:bg-brand/5 transition-all text-sm">
            <Download size={16} /> Relatório PDF
          </button>
          <button className="flex items-center gap-2 bg-brand text-white px-5 py-2.5 rounded-xl font-bold hover:bg-[#4a4a35] transition-all shadow-lg text-sm">
            <Plus size={16} /> Nova Transação
          </button>
        </div>
      </header>

      {/* BARRA SUPERIOR DE FILTROS GLOBAIS */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-brand/5 flex flex-wrap gap-4 items-center mb-4">
        <div className="flex items-center gap-2 text-brand/40 font-bold uppercase text-[10px] tracking-widest pl-2">
          <Filter size={14} /> Filtros
        </div>
        <div className="h-6 w-px bg-brand/10 mx-2 hidden md:block"></div>
        <select value={period} onChange={e => setPeriod(e.target.value)} className="bg-[#f5f5f0] border-none rounded-xl text-xs font-bold px-4 py-2 text-[#1a1a1a] focus:ring-2 focus:ring-brand/20 outline-none">
          <option value="month">Este Mês</option>
          <option value="3months">Últimos 3 Meses</option>
          <option value="6months">Últimos 6 Meses</option>
        </select>
        <select value={teamFilter} onChange={e => setTeamFilter(e.target.value)} className="bg-[#f5f5f0] border-none rounded-xl text-xs font-bold px-4 py-2 text-[#1a1a1a] focus:ring-2 focus:ring-brand/20 outline-none">
          <option value="">Todos os Times</option>
          {teams.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <select value={brokerFilter} onChange={e => setBrokerFilter(e.target.value)} className="bg-[#f5f5f0] border-none rounded-xl text-xs font-bold px-4 py-2 text-[#1a1a1a] focus:ring-2 focus:ring-brand/20 outline-none">
          <option value="">Todos os Corretores</option>
          {sysUsers.filter(u => ['broker', 'partner'].includes(u.role) && (!teamFilter || u.team_id === teamFilter)).map(u => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </div>

      {/* 2. LINHA 1: KPIs FINANCEIROS E OPERACIONAIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard title="Conta Bancária" value={balance} icon={Wallet} color="bg-brand" subtitle="Saldo Consolidado" />
        <StatCard title="A Receber Mês" value={arMonthPending} icon={ArrowUpRight} trend="Previsto" trendUp={true} color="bg-blue-600" />
        <StatCard title="A Pagar Mês" value={apMonthPending} icon={ArrowDownLeft} trend="Previsto" trendUp={false} color="bg-orange-500" />
        <StatCard title="Comissões Repassar" value={pendingPayouts} icon={Users} color="bg-[#4a4a35]" subtitle="Pendência com parceiros" />
        <StatCard title="Resultado (Mês)" value={netResult} icon={TrendingUp} color={netResult >= 0 ? "bg-green-600" : "bg-red-600"} subtitle="Projeção Realizada" />
        <StatCard title="Alertas Vencidos" value={totalOverdue} icon={AlertCircle} color="bg-red-100" alert={true} />
      </div>

      {/* BLOCOS PRINCIPAIS */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* ESQUERDA: GRÁFICOS E COMPARAÇÕES (Ocupa 3 colunas) */}
        <div className="lg:col-span-3 space-y-6">
          <CashFlowChart data={flowChartData} />

          {/* 5. LINHA 2: BLOCOS ANALÍTICOS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Bloco 1: Radar Financeiro */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-brand/5">
              <h4 className="text-sm font-bold text-[#1a1a1a] uppercase mb-4 flex items-center gap-2">
                <BarChart2 size={16} className="text-brand" /> Progresso Mês
              </h4>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-green-700">Recebido</span>
                    <span>{formatCurrency(txIncomeMonth)} de {formatCurrency(txIncomeMonth + arMonthPending)}</span>
                  </div>
                  <div className="w-full bg-[#f5f5f0] rounded-full h-2 overflow-hidden">
                    <div className="bg-green-500 h-2 rounded-full" style={{width: `${Math.min((txIncomeMonth / ((txIncomeMonth+arMonthPending)||1))*100, 100)}%`}}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-red-700">Pago</span>
                    <span>{formatCurrency(txExpenseMonth)} de {formatCurrency(txExpenseMonth + apMonthPending)}</span>
                  </div>
                  <div className="w-full bg-[#f5f5f0] rounded-full h-2 overflow-hidden">
                    <div className="bg-red-500 h-2 rounded-full" style={{width: `${Math.min((txExpenseMonth / ((txExpenseMonth+apMonthPending)||1))*100, 100)}%`}}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bloco 2: Saúde das Comissões */}
            <div className="bg-brand p-6 rounded-3xl shadow-sm text-white relative overflow-hidden">
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-2xl z-0" />
              <h4 className="text-sm font-bold uppercase mb-4 flex items-center gap-2 relative z-10">
                <PieChart size={16} /> Saúde das Comissões
              </h4>
              <div className="relative z-10 space-y-3">
                <div className="flex justify-between items-end border-b border-white/10 pb-2">
                  <span className="text-[10px] uppercase font-bold opacity-70">Operado (Bruto)</span>
                  <span className="font-bold text-lg">{formatCurrency(grossCommissions)}</span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-[10px] uppercase font-bold opacity-70">Retido Corretoriza</span>
                  <span className="font-bold text-xl text-green-300">{formatCurrency(retainedCommissions)}</span>
                </div>
              </div>
            </div>

            {/* Bloco 3: Maiores Despesas (Real Calculado) */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-brand/5">
              <h4 className="text-sm font-bold text-[#1a1a1a] uppercase mb-4">Top Despesas</h4>
              <ul className="space-y-3">
                {/* We just list 'Geral' or actual expense tx if any exist. Just mapping top 3 expense transactions in month */}
                {transactions
                  .filter(t => t.type === 'expense' && new Date(t.occurrence_date).getMonth() === currentMonth)
                  .sort((a,b) => b.amount - a.amount)
                  .slice(0, 3)
                  .map((t, i) => (
                    <li key={t.id} className="flex justify-between items-center text-xs">
                      <span className="font-bold text-brand flex items-center gap-2 truncate max-w-[120px]">
                        <div className={cn("w-2 h-2 rounded-full", ["bg-red-400", "bg-orange-400", "bg-yellow-400"][i] || "bg-gray-400")} /> 
                        {t.description}
                      </span>
                      <span className="font-bold">{formatCurrency(t.amount)}</span>
                    </li>
                  ))
                }
                {transactions.filter(t => t.type === 'expense' && new Date(t.occurrence_date).getMonth() === currentMonth).length === 0 && (
                   <div className="text-xs text-gray-400">Nenhuma despesa no mês</div>
                )}
              </ul>
            </div>
          </div>

          {/* 6. BLOCO DE GESTÃO COMERCIAL */}
          <CommercialRanking operations={filteredOperations} payouts={filteredPayouts} users={filteredUsers} />

        </div>

        {/* 4. DIREITA: COLUNA LATERAL DE AÇÃO (Ocupa 1 coluna) */}
        <div className="lg:col-span-1 border-l border-brand/5 pl-2">
          <DashboardAlerts payables={payables} payouts={payouts} transactions={transactions} />
        </div>

      </div>
    </div>
  );
}
