import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check .env file');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types untuk database
export type User = {
  id: string;
  full_name: string;
  email: string;
};

export type Transaction = {
  id: string;
  user_id: string;
  date: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  notes?: string;
  created_at: string;
};

export type Budget = {
  id: string;
  user_id: string;
  category: string;
  limit_amount: number;
  period: 'monthly' | 'yearly';
  notified_threshold_50: boolean;
  notified_threshold_80: boolean;
  notified_threshold_100: boolean;
};

export type FinancialGoal = {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  target_amount: number;
  current_amount: number;
  deadline?: string;
  monthly_contribution?: number;
};

export type RecurringTransaction = {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  next_date: string;
  reminder_days: number;
  is_active: boolean;
};