import React, { useEffect, useState } from 'react';
import { 
  Lock, 
  Unlock, 
  CheckCircle, 
  AlertCircle, 
  Calendar,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from './AuthGuard';
import { FinancialPeriod, Transaction } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { motion } from 'motion/react';
import { getFinancialPeriods, closeFinancialPeriod } from '../services/closingService';

export function Closing() {
  const { user } = useAuth();
  const [periods, setPeriods] = useState<FinancialPeriod[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getFinancialPeriods(user.company_id);
      setPeriods(data);
    } catch (error) {
      console.error('Error fetching financial periods:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleClosePeriod = async (year: number, month: number) => {
    if (!user || user.role !== 'admin') return;
    
    try {
      const period: Partial<FinancialPeriod> = {
        company_id: user.company_id,
        year,
        month,
        status: 'closed',
        closed_at: new Date().toISOString(),
        closed_by: user.id
      };
      await closeFinancialPeriod(period);
      fetchData();
    } catch (error) {
      console.error('Error closing period:', error);
    }
  };

  const currentYear = new Date().getFullYear();
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-serif font-bold text-[#1a1a1a]">Auditoria e Fechamento</h2>
        <p className="text-brand/60">Garanta a imutabilidade dos dados após a conciliação mensal.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-brand/5 overflow-hidden">
            <div className="p-8 border-b border-brand/5">
              <h3 className="text-xl font-serif font-bold text-[#1a1a1a]">Competências de {currentYear}</h3>
            </div>
            <div className="divide-y divide-brand/5">
              {months.map((monthName, idx) => {
                const monthNum = idx + 1;
                const period = periods.find(p => p.year === currentYear && p.month === monthNum);
                const isClosed = period?.status === 'closed';

                return (
                  <div key={idx} className="p-6 flex items-center justify-between hover:bg-[#f5f5f0]/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center",
                        isClosed ? "bg-green-100 text-green-600" : "bg-orange-100 text-orange-600"
                      )}>
                        {isClosed ? <Lock size={20} /> : <Unlock size={20} />}
                      </div>
                      <div>
                        <p className="font-bold text-[#1a1a1a]">{monthName}</p>
                        <p className="text-xs text-brand/60">
                          {isClosed ? `Fechado em ${new Date(period.closed_at!).toLocaleDateString('pt-BR')}` : 'Período Aberto'}
                        </p>
                      </div>
                    </div>
                    
                    {isClosed ? (
                      <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full flex items-center gap-1">
                        <CheckCircle size={12} /> Conciliado
                      </span>
                    ) : (
                      <button 
                        onClick={() => handleClosePeriod(currentYear, monthNum)}
                        disabled={user?.role !== 'admin'}
                        className="text-xs font-bold text-brand hover:bg-brand hover:text-white px-4 py-2 rounded-full border border-brand/20 transition-all disabled:opacity-50"
                      >
                        Fechar Mês
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-brand p-8 rounded-[2.5rem] text-white shadow-xl">
            <ShieldCheck size={32} className="mb-4 opacity-50" />
            <h3 className="text-xl font-serif font-bold mb-4">Governança</h3>
            <p className="text-white/70 text-sm leading-relaxed mb-6">
              O fechamento de competência bloqueia edições e exclusões para garantir que os relatórios gerenciais permaneçam auditáveis.
            </p>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-white/40 mt-1.5 shrink-0" />
                <span>Bloqueio automático de lançamentos retroativos.</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-white/40 mt-1.5 shrink-0" />
                <span>Trilha de auditoria para cada fechamento.</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-white/40 mt-1.5 shrink-0" />
                <span>Reabertura restrita a administradores.</span>
              </li>
            </ul>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-brand/5 shadow-sm">
            <h4 className="text-sm font-bold text-[#1a1a1a] mb-4 flex items-center gap-2">
              <AlertCircle size={16} className="text-orange-500" />
              Pendências de Fechamento
            </h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-brand/60">Títulos Vencidos</span>
                <span className="font-bold text-red-500">03</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-brand/60">Repasses em Aberto</span>
                <span className="font-bold text-orange-500">05</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
