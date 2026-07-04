import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

// ========== TYPES ==========
export interface Book {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  is_default: boolean;
  created_at: string;
}

// ✅ TYPE BARU: MonthlyBalance
export interface MonthlyBalance {
  id: string;
  user_id: string;
  book_id: string;
  year: number;
  month: number;
  opening_balance: number;
  closing_balance: number;
  created_at: string;
  updated_at: string;
}

export interface SupabaseTransaction {
  id: string; user_id: string; book_id: string | null; date: string;
  type: 'income' | 'expense'; category: string; description: string;
  amount: number; notes?: string | null; created_at: string; payment_method?: string;
}

export interface SupabaseBudget {
  id: string; user_id: string; book_id: string | null; category: string;
  limit_amount: number; period: string;
  description?: string | null;
  notified_threshold_50: boolean; notified_threshold_80: boolean; notified_threshold_100: boolean;
}

export interface SupabaseGoal {
  id: string; user_id: string; book_id: string | null; name: string; icon: string;
  target_amount: number; current_amount: number;
  deadline?: string | null; monthly_contribution?: number | null;
}

export interface SupabaseRecurring {
  id: string; user_id: string; book_id: string | null; name: string; amount: number;
  type: 'income' | 'expense'; category: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  next_date: string; reminder_days: number; is_active: boolean;
}

// ========== HOOK ==========
export function useSupabaseData(isFamilyMode: boolean = false) {
  const { user } = useAuth();
  
  // ✅ SEMUA useState DI TOP LEVEL (WAJIB!)
  const [books, setBooks] = useState<Book[]>([]);
  const [activeBook, setActiveBook] = useState<Book | null>(null);
  const [transactions, setTransactions] = useState<SupabaseTransaction[]>([]);
  const [budgets, setBudgets] = useState<SupabaseBudget[]>([]);
  const [goals, setGoals] = useState<SupabaseGoal[]>([]);
  const [recurring, setRecurring] = useState<SupabaseRecurring[]>([]);
  const [monthlyBalances, setMonthlyBalances] = useState<MonthlyBalance[]>([]); // ✅ STATE BARU
  const [goalContributions, setGoalContributions] = useState<GoalContribution[]>([]);
  const [loading, setLoading] = useState(true);
  

  // ========== FETCH BOOKS ==========
  const fetchBooks = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Fetch books error:', error);
        setLoading(false);
        return;
      }

      if (!data || data.length === 0) {
        console.log('📚 No books found, creating default...');
        const { data: newBook, error: createError } = await supabase
          .from('books')
          .insert({
            user_id: user.id,
            name: 'Buku Utama',
            icon: '📘',
            color: 'blue',
            is_default: true,
          })
          .select()
          .single();
        
        if (createError) {
          console.error('❌ Create default book error:', createError);
          setLoading(false);
          return;
        }
        
        setBooks([newBook]);
        setActiveBook(newBook);
      } else {
        setBooks(data);
        const savedBookId = localStorage.getItem(`active_book_${user.id}`);
        const savedBook = data.find(b => b.id === savedBookId);
        const defaultBook = data.find(b => b.is_default) || data[0];
        setActiveBook(savedBook || defaultBook);
      }
    } catch (err) {
      console.error('❌ Fetch books exception:', err);
      setLoading(false);
    }
  }, [user]);

  // ========== FETCH MONTHLY BALANCES ✅ FUNGSI BARU ==========
  const fetchMonthlyBalances = useCallback(async () => {
    if (!user) return;
    if (!isFamilyMode && !activeBook) return;
    
    try {
      let query = supabase.from('monthly_balances').select('*').eq('user_id', user.id);
      
      if (!isFamilyMode && activeBook) {
        query = query.eq('book_id', activeBook.id);
      }
      
      const { data, error } = await query.order('year', { ascending: false }).order('month', { ascending: false });
      
      if (error) {
        // ✅ Jika tabel belum ada, silent fail saja
        if (error.message.includes('does not exist') || error.code === '42P01') {
          console.warn('⚠️ Tabel monthly_balances belum dibuat. Lewati fetch.');
          return;
        }
        console.error('❌ Fetch monthly balances error:', error);
        return;
      }
      
      if (data) {
        setMonthlyBalances(data);
      }
    } catch (err) {
      console.error('❌ Fetch monthly balances exception:', err);
    }
  }, [user, activeBook, isFamilyMode]);

  // ========== FETCH DATA ==========
  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    if (!isFamilyMode && !activeBook) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let tQuery = supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      let bQuery = supabase.from('budgets').select('*').eq('user_id', user.id);
      let gQuery = supabase.from('financial_goals').select('*').eq('user_id', user.id);
      let rQuery = supabase.from('recurring_transactions').select('*').eq('user_id', user.id);

      if (!isFamilyMode && activeBook) {
        tQuery = tQuery.eq('book_id', activeBook.id);
        bQuery = bQuery.eq('book_id', activeBook.id);
        gQuery = gQuery.eq('book_id', activeBook.id);
        rQuery = rQuery.eq('book_id', activeBook.id);
      }

      const [tRes, bRes, gRes, rRes] = await Promise.all([
        tQuery, bQuery, gQuery, rQuery
      ]);

      if (tRes.error) console.error('❌ Transactions error:', tRes.error);
      if (bRes.error) console.error('❌ Budgets error:', bRes.error);
      if (gRes.error) console.error('❌ Goals error:', gRes.error);
      if (rRes.error) console.error('❌ Recurring error:', rRes.error);

      if (tRes.data) setTransactions(tRes.data);
      if (bRes.data) setBudgets(bRes.data);
      if (gRes.data) setGoals(gRes.data);
      if (rRes.data) setRecurring(rRes.data);

      if (!isFamilyMode && activeBook && tRes.data?.length === 0) {
        await migrateLocalStorage(user.id, activeBook);
      }
    } catch (err) {
      console.error('❌ Fetch data exception:', err);
      toast.error('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, [user, activeBook, isFamilyMode]);

  useEffect(() => { fetchBooks(); }, [fetchBooks]);
  useEffect(() => { 
    fetchData(); 
    fetchGoalContributions();
    fetchMonthlyBalances(); // ✅ TAMBAHKAN INI
  }, [fetchData, isFamilyMode, fetchMonthlyBalances]); 

  // ========== MIGRASI LOCALSTORAGE ==========
  const migrateLocalStorage = async (userId: string, book: Book) => {
    if (!book.is_default) return;
    try {
      const lT = JSON.parse(localStorage.getItem('keuangan_transactions') || '[]');
      const lB = JSON.parse(localStorage.getItem('keuangan_budgets') || '[]');
      const lG = JSON.parse(localStorage.getItem('keuangan_goals') || '[]');
      const lR = JSON.parse(localStorage.getItem('keuangan_recurring') || '[]');

      if (lT.length > 0 && transactions.length === 0) {
        await supabase.from('transactions').insert(lT.map((t: any) => ({
          user_id: userId, book_id: book.id, date: t.date, type: t.type,
          category: t.category, description: t.description, amount: t.amount, notes: t.notes || null,
        })));
      }
      if (lB.length > 0 && budgets.length === 0) {
        await supabase.from('budgets').insert(lB.map((b: any) => ({
          user_id: userId, book_id: book.id, category: b.category, limit_amount: b.limit,
          period: b.period || 'monthly',
          notified_threshold_50: false, notified_threshold_80: false, notified_threshold_100: false,
        })));
      }
      if (lG.length > 0 && goals.length === 0) {
        await supabase.from('financial_goals').insert(lG.map((g: any) => ({
          user_id: userId, book_id: book.id, name: g.name, icon: g.icon || '🎯',
          target_amount: g.targetAmount, current_amount: g.currentAmount || 0,
          deadline: g.deadline || null, monthly_contribution: g.monthlyContribution || null,
        })));
      }
      if (lR.length > 0 && recurring.length === 0) {
        await supabase.from('recurring_transactions').insert(lR.map((r: any) => ({
          user_id: userId, book_id: book.id, name: r.name, amount: r.amount, type: r.type,
          category: r.category, frequency: r.frequency, next_date: r.nextDate,
          reminder_days: r.reminderDays || 3, is_active: r.isActive !== false,
        })));
      }

      if (lT.length > 0 || lB.length > 0 || lG.length > 0 || lR.length > 0) {
        localStorage.removeItem('keuangan_transactions');
        localStorage.removeItem('keuangan_budgets');
        localStorage.removeItem('keuangan_goals');
        localStorage.removeItem('keuangan_recurring');
        toast.success(`Data lokal dimigrasi ke "${book.name}" ☁️`);
        await fetchData();
      }
    } catch (err) { console.error('Migration error:', err); }
  };

  // ========== BOOK CRUD ==========
  const createBook = async (name: string, icon: string, color: string) => {
    if (!user) return null;
    if (books.length >= 10) { toast.error('Maksimal 10 buku!'); return null; }
    const { data, error } = await supabase
      .from('books')
      .insert({ user_id: user.id, name, icon, color, is_default: false })
      .select()
      .single();
    if (error) { toast.error('Gagal buat buku'); return null; }
    setBooks(prev => [...prev, data]);
    setActiveBook(data);
    toast.success(`Buku "${name}" dibuat! 📚`);
    return data;
  };

  const renameBook = async (id: string, newName: string) => {
    const { data, error } = await supabase.from('books').update({ name: newName }).eq('id', id).select().single();
    if (error) { toast.error('Gagal rename'); return null; }
    setBooks(prev => prev.map(b => b.id === id ? data : b));
    if (activeBook?.id === id) setActiveBook(data);
    toast.success('Buku di-rename! ✏️');
    return data;
  };

  const deleteBook = async (id: string) => {
    const book = books.find(b => b.id === id);
    if (book?.is_default) { toast.error('Buku utama tidak bisa dihapus'); return false; }
    if (!window.confirm(`Hapus buku "${book?.name}"? Semua data di dalamnya ikut terhapus!`)) return false;
    const { error } = await supabase.from('books').delete().eq('id', id);
    if (error) { toast.error('Gagal hapus'); return false; }
    setBooks(prev => prev.filter(b => b.id !== id));
    if (activeBook?.id === id) {
      const defaultBook = books.find(b => b.is_default) || books[0];
      setActiveBook(defaultBook);
    }
    toast.success('Buku dihapus');
    return true;
  };

  const switchBook = (book: Book) => {
    setActiveBook(book);
    if (user) localStorage.setItem(`active_book_${user.id}`, book.id);
    toast(`Beralih ke ${book.icon} ${book.name}`);
  };

  // ========== TRANSACTION CRUD ==========
  const addTransaction = async (t: Omit<SupabaseTransaction, 'id' | 'user_id' | 'book_id' | 'created_at'> & { id?: string }) => {
    if (!user || !activeBook) {
      console.error('❌ Missing user or activeBook');
      return null;
    }
    console.log('📝 Adding transaction with date:', t.date, 'Type:', typeof t.date);
    
    const { data, error } = await supabase.from('transactions')
      .insert({ ...t, user_id: user.id, book_id: activeBook.id }).select().single();
      
    if (error) { 
      console.error('❌ Supabase insert error:', error);
      toast.error('Gagal: ' + error.message); 
      return null; 
    }
    
    console.log('✅ Transaction added:', data);
    setTransactions(prev => [data, ...prev]);
    return data;
  };

  const updateTransaction = async (id: string, updates: Partial<Omit<SupabaseTransaction, 'id' | 'user_id' | 'book_id' | 'created_at'>>) => {
    if (!user || !activeBook) return null;
    
    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
      
    if (error) { 
      console.error('❌ Update transaction error:', error);
      toast.error('Gagal update transaksi'); 
      return null; 
    }
    
    setTransactions(prev => prev.map(x => x.id === id ? data : x));
    return data;
  };

  const deleteTransaction = async (id: string) => {
    const transaction = transactions.find(t => t.id === id);
    if (transaction) {
      const refMatch = transaction.notes?.match(/\[ref:([a-zA-Z0-9-]+)\]/);
      if (refMatch && refMatch[1]) {
        await deleteGoalContribution(refMatch[1]);
        return true;
      }
    }
    
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) { toast.error('Gagal hapus'); return false; }
    setTransactions(prev => prev.filter(t => t.id !== id));
    return true;
  };

  // ========== BUDGET CRUD ==========
  const addBudget = async (b: { category: string; limit_amount: number; period?: string; description?: string }) => {
    if (!user || !activeBook) return null;
    const { data, error } = await supabase.from('budgets').insert({
      ...b, user_id: user.id, book_id: activeBook.id, period: b.period || 'monthly',
      description: b.description || null,
      notified_threshold_50: false, notified_threshold_80: false, notified_threshold_100: false,
    }).select().single();
    if (error) { toast.error('Gagal tambah budget'); return null; }
    setBudgets(prev => [...prev, data]);
    return data;
  };

  const updateBudget = async (id: string, updates: { category?: string; limit_amount?: number; period?: string; description?: string }) => {
    const { data, error } = await supabase.from('budgets').update(updates).eq('id', id).select().single();
    if (error) { 
      toast.error('Gagal update budget'); 
      console.error('Supabase Update Budget Error:', error);
      return null; 
    }
    setBudgets(prev => prev.map(b => b.id === id ? data : b));
    return data;
  };

  const deleteBudget = async (id: string) => {
    const { error } = await supabase.from('budgets').delete().eq('id', id);
    if (error) { toast.error('Gagal hapus'); return false; }
    setBudgets(prev => prev.filter(b => b.id !== id));
    return true;
  };

  // ========== GOAL CRUD ==========
  const addGoal = async (g: { name: string; icon: string; target_amount: number; current_amount?: number; deadline?: string; monthly_contribution?: number }) => {
    if (!user || !activeBook) return null;
    const { data, error } = await supabase.from('financial_goals').insert({
      ...g, user_id: user.id, book_id: activeBook.id, current_amount: g.current_amount || 0,
    }).select().single();
    if (error) { toast.error('Gagal tambah goal'); return null; }
    setGoals(prev => [...prev, data]);
    return data;
  };

  const updateGoal = async (id: string, updates: Partial<SupabaseGoal>) => {
    const { data, error } = await supabase.from('financial_goals').update(updates).eq('id', id).select().single();
    if (error) { toast.error('Gagal update'); return null; }
    setGoals(prev => prev.map(g => g.id === id ? data : g));
    return data;
  };

  const deleteGoal = async (id: string) => {
    const { error } = await supabase.from('financial_goals').delete().eq('id', id);
    if (error) { toast.error('Gagal hapus'); return false; }
    setGoals(prev => prev.filter(g => g.id !== id));
    return true;
  };

  // ========== GOAL CONTRIBUTIONS CRUD ==========
  const fetchGoalContributions = async () => {
    if (!user) return;
    if (!isFamilyMode && !activeBook) return;

    let query = supabase.from('goal_contributions').select('*').eq('user_id', user.id).order('date', { ascending: false });
    
    if (!isFamilyMode && activeBook) {
      query = query.eq('book_id', activeBook.id);
    }

    const { data, error } = await query;
    if (!error && data) setGoalContributions(data);
  };

  const addGoalContribution = async (contribution: {
    goal_id: string;
    amount: number;
    date: string;
    note?: string;
  }) => {
    if (!user || !activeBook) return null;
    
    const targetGoal = goals.find(g => g.id === contribution.goal_id);
    
    const { data, error } = await supabase
      .from('goal_contributions')
      .insert({
        ...contribution,
        user_id: user.id,
        book_id: activeBook.id,
      })
      .select()
      .single();
    
    if (error) {
      toast.error('Gagal menambah riwayat');
      console.error('Add Goal Contribution Error:', error);
      return null;
    }
    
    setGoalContributions(prev => [data, ...prev]);
    await incrementGoalAmount(contribution.goal_id, contribution.amount);
    
    return data;
  };

  const updateGoalContribution = async (id: string, updates: { amount?: number; date?: string; note?: string }) => {
    const oldContribution = goalContributions.find(c => c.id === id);
    if (!oldContribution) return null;

    const { data, error } = await supabase
      .from('goal_contributions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      toast.error('Gagal mengedit riwayat');
      console.error('Update Goal Contribution Error:', error);
      return null;
    }

    setGoalContributions(prev => prev.map(c => c.id === id ? data : c));

    const newAmount = updates.amount ?? oldContribution.amount;
    const delta = newAmount - oldContribution.amount;

    if (delta !== 0) {
      await incrementGoalAmount(oldContribution.goal_id, delta);
    }

    return data;
  };

  const deleteGoalContribution = async (id: string) => {
    const contribution = goalContributions.find(c => c.id === id);
    if (!contribution) return false;

    const linkedTransaction = transactions.find(t => 
      t.type === 'expense' && 
      t.category === 'investasi_exp' && 
      t.notes?.includes(`[ref:${id}]`)
    );

    if (linkedTransaction) {
      await deleteTransaction(linkedTransaction.id);
    }

    const { error } = await supabase
      .from('goal_contributions')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Gagal menghapus riwayat');
      return false;
    }

    setGoalContributions(prev => prev.filter(c => c.id !== id));
    await incrementGoalAmount(contribution.goal_id, -contribution.amount);

    return true;
  };

  // ========== RECURRING CRUD ==========
  const addRecurring = async (r: Omit<SupabaseRecurring, 'id' | 'user_id' | 'book_id'>) => {
    if (!user || !activeBook) return null;
    const { data, error } = await supabase.from('recurring_transactions').insert({
      ...r, user_id: user.id, book_id: activeBook.id,
    }).select().single();
    if (error) { toast.error('Gagal tambah recurring'); return null; }
    setRecurring(prev => [...prev, data]);
    return data;
  };

  const updateRecurring = async (id: string, updates: any) => {
    const { data, error } = await supabase.from('recurring_transactions').update(updates).eq('id', id).select().single();
    if (error) { 
      toast.error('Gagal update recurring'); 
      console.error('Supabase Update Recurring Error:', error);
      return null; 
    }
    setRecurring(prev => prev.map(r => r.id === id ? data : r));
    return data;
  };

  const deleteRecurring = async (id: string) => {
    const { error } = await supabase.from('recurring_transactions').delete().eq('id', id);
    if (error) { toast.error('Gagal hapus'); return false; }
    setRecurring(prev => prev.filter(r => r.id !== id));
    return true;
  };

  // ========== ATOMIC GOAL INCREMENT ==========
  const incrementGoalAmount = async (goalId: string, delta: number) => {
    const { error } = await supabase.rpc('increment_goal_amount', {
      p_goal_id: goalId,
      p_delta: delta,
    });
    
    if (error) {
      console.error('❌ RPC increment_goal_amount error:', error);
      toast.error('Gagal update progress goal');
      return false;
    }
    
    await fetchData();
    return true;
  };

  // ========== MONTHLY BALANCE FUNCTIONS ✅ FUNGSI BARU ==========
  
  const saveMonthlyBalance = async (year: number, month: number, openingBalance: number, closingBalance: number) => {
    if (!user || !activeBook) return null;
    
    const existing = monthlyBalances.find(mb => mb.year === year && mb.month === month);
    
    if (existing) {
      const { data, error } = await supabase
        .from('monthly_balances')
        .update({ 
          opening_balance: openingBalance, 
          closing_balance: closingBalance 
        })
        .eq('id', existing.id)
        .select()
        .single();
      
      if (error) {
        toast.error('Gagal update saldo bulanan');
        console.error('Save Monthly Balance Error:', error);
        return null;
      }
      
      setMonthlyBalances(prev => prev.map(mb => mb.id === existing.id ? data : mb));
      toast.success('Saldo bulanan diupdate! 💰');
      return data;
    } else {
      const { data, error } = await supabase
        .from('monthly_balances')
        .insert({
          user_id: user.id,
          book_id: activeBook.id,
          year,
          month,
          opening_balance: openingBalance,
          closing_balance: closingBalance
        })
        .select()
        .single();
      
      if (error) {
        toast.error('Gagal simpan saldo bulanan');
        console.error('Save Monthly Balance Error:', error);
        return null;
      }
      
      setMonthlyBalances(prev => [data, ...prev]);
      toast.success('Saldo bulanan disimpan! 💰');
      return data;
    }
  };

  const calculatePreviousMonthClosingBalance = (year: number, month: number): number => {
    let prevYear = year;
    let prevMonth = month - 1;
    
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear--;
    }
    
    const prevBalance = monthlyBalances.find(mb => mb.year === prevYear && mb.month === prevMonth);
    
    if (prevBalance) {
      return prevBalance.closing_balance;
    }
    
    const monthStart = new Date(prevYear, prevMonth - 1, 1);
    const monthEnd = new Date(prevYear, prevMonth, 0, 23, 59, 59);
    
    const monthTransactions = transactions.filter(t => {
      const d = new Date(t.date);
      return d >= monthStart && d <= monthEnd;
    });
    
    const income = monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    
    return income - expense;
  };

  const getCurrentMonthBalance = (): MonthlyBalance | undefined => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    
    return monthlyBalances.find(mb => mb.year === year && mb.month === month);
  };

  // ========== RETURN STATEMENT ==========
  return {
    books, activeBook, transactions, budgets, goals, recurring, loading,
    switchBook, createBook, renameBook, deleteBook,
    addTransaction, updateTransaction, deleteTransaction,
    addBudget, updateBudget, deleteBudget,
    addGoal, updateGoal, deleteGoal,
    addRecurring, updateRecurring, deleteRecurring,
    goalContributions, addGoalContribution, updateGoalContribution, deleteGoalContribution,
    refresh: fetchData, incrementGoalAmount,
    // ✅ MONTHLY BALANCE FUNCTIONS
    monthlyBalances, 
    saveMonthlyBalance, 
    calculatePreviousMonthClosingBalance, 
    getCurrentMonthBalance,
  };
}