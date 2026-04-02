import React from 'react';
import { AlertCircle, Clock } from 'lucide-react';
import { AccountsPayable, Payout, Transaction } from '../../types';
import { formatCurrency, cn } from '../../lib/utils';

interface DashboardAlertsProps {
  payables: AccountsPayable[];
  payouts: Payout[];
  transactions: Transaction[];
}

export function DashboardAlerts({ payables, payouts, transactions }: DashboardAlertsProps) {
  const overduePayables = payables.filter(p => p.status === 'overdue');
  const pendingPayouts = payouts.filter(p => p.status === 'pending');
  // Latest 4 transactions
  const recentTransactions = [...transactions].sort((a,b) => new Date(b.occurrence_date).getTime() - new Date(a.occurrence_date).getTime()).slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Caixa de Atenção */}
      <div className="bg-red-50 p-6 rounded-3xl border border-red-100">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle size={20} className="text-red-500" />
          <h4 className="text-sm font-bold text-red-900 uppercase">Requer Atenção</h4>
        </div>
        <div className="space-y-4">
          {overduePayables.slice(0, 3).map(p => (
            <div key={p.id} className="bg-white p-3 rounded-xl shadow-sm border border-red-100 text-sm">
              <div className="flex justify-between text-xs font-bold text-red-500 mb-1">
                <span>Atrasada</span>
                <span>{new Date(p.due_date).toLocaleDateString('pt-BR')}</span>
              </div>
              <p className="font-bold text-[#1a1a1a] truncate">{p.payee}</p>
              <p className="font-bold text-red-600">{formatCurrency(p.amount)}</p>
            </div>
          ))}
          {overduePayables.length === 0 && (
            <p className="text-xs text-red-400 font-bold uppercase text-center py-2">Nenhuma conta atrasada</p>
          )}
        </div>
      </div>

      {/* Vencimentos Hoje e Próximos Repasses */}
      <div className="bg-[#f5f5f0] p-6 rounded-3xl border border-brand/5">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={20} className="text-brand" />
          <h4 className="text-sm font-bold text-[#1a1a1a] uppercase">Agenda Operacional</h4>
        </div>
        <div className="space-y-4">
          {pendingPayouts.slice(0, 4).map((p, idx) => (
            <div key={p.id || idx} className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm">
              <div>
                <span className="text-[9px] uppercase font-bold text-orange-500 bg-orange-50 px-1 py-0.5 rounded">Repasse</span>
                <p className="text-xs font-bold text-[#1a1a1a] mt-1 truncate max-w-[100px]">Pendente</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-brand">{formatCurrency(p.amount)}</p>
              </div>
            </div>
          ))}
          {pendingPayouts.length === 0 && (
            <p className="text-xs text-brand/40 font-bold uppercase text-center py-2">Sem repasses pendentes</p>
          )}
        </div>
      </div>

      {/* Últimas Transações Clean */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-brand/5">
        <h4 className="text-sm font-bold text-[#1a1a1a] uppercase mb-4">Mural Recente</h4>
        <div className="space-y-3">
          {recentTransactions.map(t => (
            <div key={t.id} className="flex gap-3 text-xs border-b border-[#f5f5f0] pb-3 last:border-0">
              <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", t.type === 'income' ? 'bg-green-500' : 'bg-red-500')} />
              <div className="overflow-hidden">
                <p className="font-bold text-[#1a1a1a] truncate">{t.description}</p>
                <p className="text-[10px] text-brand/40 mt-0.5">{new Date(t.occurrence_date).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
          ))}
          {recentTransactions.length === 0 && (
            <p className="text-xs text-brand/40 font-bold uppercase text-center py-2">Nenhuma transação recente</p>
          )}
        </div>
      </div>
    </div>
  );
}
