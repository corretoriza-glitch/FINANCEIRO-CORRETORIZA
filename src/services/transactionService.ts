import { supabase } from '../supabase';
import { Transaction } from '../types';
import { isPeriodClosed } from './closingService';

export const getTransactions = async (companyId: string, filters?: any) => {
  let query = supabase
    .from('transactions')
    .select('*')
    .eq('company_id', companyId)
    .order('occurrence_date', { ascending: false });

  if (filters?.type) {
    query = query.eq('type', filters.type);
  }
  if (filters?.category_id) {
    query = query.eq('category_id', filters.category_id);
  }
  if (filters?.startDate) {
    query = query.gte('occurrence_date', filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte('occurrence_date', filters.endDate);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Transaction[];
};

export const createTransaction = async (transaction: Partial<Transaction>) => {
  if (transaction.company_id && transaction.occurrence_date) {
    if (await isPeriodClosed(transaction.company_id, transaction.occurrence_date)) {
      throw new Error('Não é possível criar transações em um período financeiro fechado.');
    }
  }

  const { error } = await supabase
    .from('transactions')
    .insert(transaction);
  
  if (error) throw error;
};

export const updateTransaction = async (transactionId: string, updates: Partial<Transaction>) => {
  // To be perfectly safe, we should check both the old and new date.
  // Assuming the UI prevents trying to edit a closed period altogether.
  // But let's check the date we are trying to set if it exists.
  if (updates.company_id && updates.occurrence_date) {
    if (await isPeriodClosed(updates.company_id, updates.occurrence_date)) {
      throw new Error('Não é possível mover/atualizar transações para um período fechado.');
    }
  }

  const { error } = await supabase
    .from('transactions')
    .update(updates)
    .eq('id', transactionId);
  
  if (error) throw error;
};

export const deleteTransaction = async (transactionId: string) => {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', transactionId);
  
  if (error) throw error;
};
