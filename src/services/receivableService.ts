import { supabase } from '../supabase';
import { AccountsReceivable } from '../types';

export const getAccountsReceivable = async (companyId: string, filters?: any) => {
  let query = supabase
    .from('accounts_receivable')
    .select('*')
    .eq('company_id', companyId)
    .order('due_date', { ascending: true });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.startDate) {
    query = query.gte('due_date', filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte('due_date', filters.endDate);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data.map((item: any) => ({ ...item, amount: item.amount_total })) as AccountsReceivable[];
};

export const createAccountsReceivable = async (receivable: Partial<AccountsReceivable>) => {
  const payload: any = { 
    ...receivable, 
    amount_total: receivable.amount,
    amount_open: receivable.status === 'received' ? 0 : receivable.amount,
    competence_date: receivable.competence_date || receivable.due_date
  };
  delete payload.amount;
  const { error } = await supabase
    .from('accounts_receivable')
    .insert(payload);
  
  if (error) throw error;
};

export const updateAccountsReceivable = async (receivableId: string, updates: Partial<AccountsReceivable>) => {
  const payload: any = { ...updates };
  if (payload.amount !== undefined) {
    payload.amount_total = payload.amount;
    delete payload.amount;
  }
  if (payload.status === 'received') {
    payload.amount_open = 0;
  }
  const { error } = await supabase
    .from('accounts_receivable')
    .update(payload)
    .eq('id', receivableId);
  
  if (error) throw error;
};

export const deleteAccountsReceivable = async (receivableId: string) => {
  const { error } = await supabase
    .from('accounts_receivable')
    .delete()
    .eq('id', receivableId);
  
  if (error) throw error;
};
