import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check .env file');
}

// ✅ KONFIGURASI CLIENT YANG LEBIH STABIL UNTUK MOBILE
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,       // ✅ Auto refresh token sebelum expired
    persistSession: true,         // ✅ Simpan session di localStorage
    detectSessionInUrl: true,     // ✅ Deteksi session dari URL (OAuth)
    storageKey: 'catatan-keuangan-auth', // ✅ Key khusus agar tidak bentrok
  },
  global: {
    headers: {
      'x-client-info': 'catatan-keuangan/1.0.0',
    },
    // ✅ CUSTOM FETCH DENGAN TIMEOUT (Cegah request menggantung)
    fetch: (url, options = {}) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 detik
      
      return fetch(url, {
        ...options,
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));
    },
  },
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 10, // ✅ Batasi event realtime
    },
  },
});

// ========== TYPES ==========
export type User = {
  id: string;
  full_name: string;
  email: string;
};

export type Transaction = {
  id: string;
  user_id: string;
  book_id?: string;
  date: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  notes?: string;
  payment_method?: string;
  created_at: string;
};

export type Budget = {
  id: string;
  user_id: string;
  book_id?: string;
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
  book_id?: string;
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
  book_id?: string;
  name: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  next_date: string;
  reminder_days: number;
  is_active: boolean;
};

// ✅ HELPER: CEK KONEKSI SUPABASE
export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('books')
      .select('id')
      .limit(1);
    return !error;
  } catch (err) {
    console.error('❌ Supabase connection check failed:', err);
    return false;
  }
};

// ✅ HELPER: FETCH DENGAN RETRY (Exponential Backoff)
export const fetchWithRetry = async <T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    // Jika abort (timeout), langsung lempar error
    if (error?.name === 'AbortError') {
      throw new Error('Request timeout setelah 15 detik');
    }
    
    if (retries === 0) throw error;
    
    console.warn(`⚠️ Fetch gagal, retry dalam ${delay}ms... (${retries} sisa)`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return fetchWithRetry(fn, retries - 1, delay * 2);
  }
};