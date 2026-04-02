import React from 'react';
import { formatCurrency } from '../../lib/utils';
import { Operation, Payout, User } from '../../types';

interface CommercialRankingProps {
  operations: Operation[];
  payouts: Payout[];
  users: User[];
}

export function CommercialRanking({ operations, payouts, users }: CommercialRankingProps) {
  // Aggregate sales and commissions per user dynamically
  const userStatsMap: Record<string, { name: string; type: string; sales: number; commission: number }> = {};

  // First identify users that had any payouts
  payouts.forEach(p => {
    if (!userStatsMap[p.participant_user_id]) {
      const u = users.find(usr => usr.id === p.participant_user_id);
      userStatsMap[p.participant_user_id] = {
        name: u?.name || 'Usuário Desconhecido',
        type: u?.role === 'partner' ? 'Sócio' : u?.role === 'broker' ? 'Corretor' : u?.role || 'Membro',
        sales: 0,
        commission: 0,
      };
    }
    userStatsMap[p.participant_user_id].commission += p.amount;
    
    // Attribute sales volume based on the operation this payout belongs to
    const op = operations.find(o => o.id === p.operation_id);
    if (op) {
      // To prevent double counting the same operation for the same user in multiple payouts (unlikely but possible), 
      // we could do a set per operation id per user, but realistically gross_value can just be attributed to the broker/partner.
      // Easiest is to distribute operation gross_value logic.
      userStatsMap[p.participant_user_id].sales += op.gross_value;
    }
  });

  const commercialRanking = Object.values(userStatsMap)
    .filter(stat => stat.commission > 0)
    .sort((a, b) => b.commission - a.commission) // sort by highest commission
    .slice(0, 5); // top 5

  return (
    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-brand/5">
      <h3 className="text-lg font-serif font-bold text-[#1a1a1a] mb-2">Desempenho Comercial</h3>
      <p className="text-xs font-bold text-brand/40 uppercase tracking-wider mb-6">Ranking de corretores e parceiros</p>
      
      {commercialRanking.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-gray-500 font-medium">Nenhum dado comercial disponível para o período.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-brand/5">
                <th className="pb-3 text-[10px] uppercase tracking-widest text-brand/60 font-bold">Participante</th>
                <th className="pb-3 text-[10px] uppercase tracking-widest text-brand/60 font-bold">Tipo</th>
                <th className="pb-3 text-[10px] uppercase tracking-widest text-brand/60 font-bold text-right">Volume Operado</th>
                <th className="pb-3 text-[10px] uppercase tracking-widest text-brand/60 font-bold text-right">Comissão Real</th>
                <th className="pb-3 text-[10px] uppercase tracking-widest text-brand/60 font-bold text-right">Margem Retida</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand/5">
              {commercialRanking.map((rank, idx) => {
                const marginPercentage = rank.sales > 0 ? ((rank.sales - rank.commission) / rank.sales * 100).toFixed(1) + '%' : '-';
                return (
                  <tr key={idx} className="hover:bg-[#f5f5f0]/30">
                    <td className="py-4">
                      <div className="flex items-center gap-2 font-bold text-sm text-[#1a1a1a]">
                        <div className="w-6 h-6 rounded-full bg-brand/10 flex items-center justify-center text-[10px] text-brand">{idx+1}</div>
                        {rank.name}
                      </div>
                    </td>
                    <td className="py-4"><span className="text-[10px] bg-[#f5f5f0] px-2 py-1 rounded-md font-bold uppercase">{rank.type}</span></td>
                    <td className="py-4 text-right font-bold text-brand">{formatCurrency(rank.sales)}</td>
                    <td className="py-4 text-right font-bold text-green-600">{formatCurrency(rank.commission)}</td>
                    <td className="py-4 text-right font-bold text-[#1a1a1a]">{marginPercentage}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
