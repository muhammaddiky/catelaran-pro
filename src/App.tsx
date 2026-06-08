import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, Trash2, Edit2, TrendingUp, Calendar, BarChart3,
  Home, Cloud, CheckCircle, DollarSign, Zap, Lightbulb, AlertTriangle,
  Target, Repeat, Bell, Sun, Moon, Download, Settings as SettingsIcon,
  ArrowUpRight, ArrowDownLeft, Menu, ChevronRight, X
} from 'lucide-react';
import {
  PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import toast, { Toaster } from 'react-hot-toast';
import { format, differenceInDays } from 'date-fns';
import { id } from 'date-fns/locale';

// ==================== TYPES ====================
interface Transaction {
  id: string;
  date: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  notes?: string;
  syncedToSheets?: boolean;
  createdAt: string;
  recurringId?: string;
}

interface CategoryConfig {
  id: string;
  name: string;
  shortName: string; // Untuk chart mobile
  icon: string;
  color: string;
  bgColor: string;
  type: 'income' | 'expense';
}

interface Budget {
  id: string;
  category: string;
  limit: number;
  period: 'monthly' | 'yearly';
  createdAt: string;
  notified?: { threshold50?: boolean; threshold80?: boolean; threshold100?: boolean };
}

interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  monthlyContribution?: number;
  icon: string;
  createdAt: string;
}

interface RecurringTransaction {
  id: string;
  name: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  nextDate: string;
  reminderDays: number;
  isActive: boolean;
}

type TabType = 'dashboard' | 'input' | 'history' | 'more';
type MoreTab = 'analisis' | 'budget' | 'goals' | 'recurring' | 'settings';

// ==================== CONSTANTS ====================
const incomeCategories: Record<string, CategoryConfig> = {
  gaji: { id: 'gaji', name: 'Gaji', shortName: 'Gaji', icon: '💼', color: 'text-green-600', bgColor: 'bg-green-100', type: 'income' },
  usaha: { id: 'usaha', name: 'Usaha', shortName: 'Usaha', icon: '🏪', color: 'text-blue-600', bgColor: 'bg-blue-100', type: 'income' },
  investasi: { id: 'investasi', name: 'Investasi', shortName: 'Invest', icon: '📈', color: 'text-purple-600', bgColor: 'bg-purple-100', type: 'income' },
  lainnya: { id: 'lainnya', name: 'Lainnya', shortName: 'Lain', icon: '🎁', color: 'text-yellow-600', bgColor: 'bg-yellow-100', type: 'income' },
};

const expenseCategories: Record<string, CategoryConfig> = {
  rumah_tangga: { id: 'rumah_tangga', name: 'Rumah', shortName: 'Rumah', icon: '🏠', color: 'text-orange-600', bgColor: 'bg-orange-100', type: 'expense' },
  utilitas: { id: 'utilitas', name: 'Utilitas', shortName: 'Util', icon: '⚡', color: 'text-yellow-600', bgColor: 'bg-yellow-100', type: 'expense' },
  makanan: { id: 'makanan', name: 'Makanan', shortName: 'Mkn', icon: '🍜', color: 'text-orange-500', bgColor: 'bg-orange-50', type: 'expense' },
  transportasi: { id: 'transportasi', name: 'Transport', shortName: 'Trans', icon: '🚗', color: 'text-red-600', bgColor: 'bg-red-100', type: 'expense' },
  pendidikan: { id: 'pendidikan', name: 'Pendidikan', shortName: 'Pend', icon: '📚', color: 'text-indigo-600', bgColor: 'bg-indigo-100', type: 'expense' },
  kesehatan: { id: 'kesehatan', name: 'Kesehatan', shortName: 'Kes', icon: '🏥', color: 'text-red-500', bgColor: 'bg-red-50', type: 'expense' },
  cicilan: { id: 'cicilan', name: 'Cicilan', shortName: 'Ccl', icon: '💳', color: 'text-blue-700', bgColor: 'bg-blue-100', type: 'expense' },
  asuransi: { id: 'asuransi', name: 'Asuransi', shortName: 'Asr', icon: '🛡️', color: 'text-indigo-500', bgColor: 'bg-indigo-50', type: 'expense' },
  investasi_exp: { id: 'investasi_exp', name: 'Investasi', shortName: 'Inv', icon: '💰', color: 'text-green-600', bgColor: 'bg-green-100', type: 'expense' },
  hiburan: { id: 'hiburan', name: 'Hiburan', shortName: 'Hbr', icon: '🎬', color: 'text-pink-600', bgColor: 'bg-pink-100', type: 'expense' },
  belanja: { id: 'belanja', name: 'Belanja', shortName: 'Blnj', icon: '🛍️', color: 'text-rose-600', bgColor: 'bg-rose-100', type: 'expense' },
  rekreasi: { id: 'rekreasi', name: 'Rekreasi', shortName: 'Rek', icon: '✈️', color: 'text-cyan-600', bgColor: 'bg-cyan-100', type: 'expense' },
  sosial: { id: 'sosial', name: 'Sosial', shortName: 'Sos', icon: '🤝', color: 'text-purple-600', bgColor: 'bg-purple-100', type: 'expense' },
  anak: { id: 'anak', name: 'Anak', shortName: 'Anak', icon: '👶', color: 'text-pink-500', bgColor: 'bg-pink-50', type: 'expense' },
  cadangan: { id: 'cadangan', name: 'Cadangan', shortName: 'Cdg', icon: '🔐', color: 'text-slate-600', bgColor: 'bg-slate-100', type: 'expense' },
};

const PIE_COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

// ==================== UTILS ====================
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount);
};

const formatCompact = (amount: number): string => {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}jt`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(0)}rb`;
  return amount.toString();
};

const formatNominalDisplay = (amount: string): string => {
  if (!amount) return '';
  const numOnly = amount.replace(/\D/g, '');
  if (!numOnly) return '';
  return 'Rp ' + parseInt(numOnly).toLocaleString('id-ID');
};

const parseNominal = (value: string): number => parseInt(value.replace(/\D/g, '')) || 0;

const notify = {
  success: (msg: string) => toast.success(msg, { duration: 2500, style: { background: '#10b981', color: '#fff', fontSize: '14px' } }),
  error: (msg: string) => toast.error(msg, { duration: 3000, style: { background: '#ef4444', color: '#fff', fontSize: '14px' } }),
  info: (msg: string) => toast(msg, { duration: 2500, icon: 'ℹ️', style: { background: '#3b82f6', color: '#fff', fontSize: '14px' } }),
  budget: (cat: string, pct: number) => toast(`${cat} sudah ${pct.toFixed(0)}%!`, {
    duration: 4000, icon: pct >= 100 ? '🚨' : '💰',
    style: { background: pct >= 100 ? '#dc2626' : '#f59e0b', color: '#fff', fontSize: '14px' },
  }),
};

const APPS_SCRIPT_CODE = `function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = JSON.parse(e.postData.contents);
    sheet.appendRow([new Date(), data.date, data.type, data.category, data.description, data.amount, data.notes || '']);
    return ContentService.createTextOutput(JSON.stringify({status:'success'})).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({status:'error'})).setMimeType(ContentService.MimeType.JSON);
  }
}`;

// ==================== MAIN COMPONENT ====================
export default function CatanKeuangan() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [activeMoreTab, setActiveMoreTab] = useState<MoreTab>('analisis');
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
  const [filterDate, setFilterDate] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [scriptUrl, setScriptUrl] = useState(() => localStorage.getItem('keuangan_scriptUrl') || '');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'expense' as 'income' | 'expense',
    category: 'makanan',
    description: '',
    amount: '',
    notes: '',
  });

  const [budgetForm, setBudgetForm] = useState({ category: 'makanan', limit: '' });
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [goalForm, setGoalForm] = useState({ name: '', targetAmount: '', deadline: '', monthlyContribution: '', icon: '🎯' });
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [recurringForm, setRecurringForm] = useState({
    name: '', amount: '', type: 'expense' as 'income' | 'expense', category: 'utilitas',
    frequency: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'yearly',
    nextDate: format(new Date(), 'yyyy-MM-dd'), reminderDays: 3,
  });
  const [showRecurringForm, setShowRecurringForm] = useState(false);

  // ========== THEME ==========
  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('theme')) setTheme(e.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // ========== LOCAL STORAGE ==========
  useEffect(() => {
    try {
      const t = localStorage.getItem('keuangan_transactions');
      const b = localStorage.getItem('keuangan_budgets');
      const g = localStorage.getItem('keuangan_goals');
      const r = localStorage.getItem('keuangan_recurring');
      if (t) setTransactions(JSON.parse(t));
      if (b) setBudgets(JSON.parse(b));
      if (g) setGoals(JSON.parse(g));
      if (r) setRecurringTransactions(JSON.parse(r));
    } catch (e) { console.error('Load error:', e); }
  }, []);

  useEffect(() => { localStorage.setItem('keuangan_transactions', JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem('keuangan_budgets', JSON.stringify(budgets)); }, [budgets]);
  useEffect(() => { localStorage.setItem('keuangan_goals', JSON.stringify(goals)); }, [goals]);
  useEffect(() => { localStorage.setItem('keuangan_recurring', JSON.stringify(recurringTransactions)); }, [recurringTransactions]);

  // ========== RECURRING PROCESSOR ==========
  useEffect(() => {
    if (recurringTransactions.length === 0) return;
    const now = new Date();
    const newTrans: Transaction[] = [];
    const updated: RecurringTransaction[] = [];

    recurringTransactions.forEach(r => {
      if (!r.isActive) { updated.push(r); return; }
      const next = new Date(r.nextDate);
      if (next <= now) {
        newTrans.push({
          id: Date.now().toString() + Math.random(),
          date: now.toISOString().split('T')[0],
          type: r.type, category: r.category,
          description: `Auto: ${r.name}`, amount: r.amount,
          createdAt: now.toISOString(), recurringId: r.id,
        });
        const n = new Date(next);
        switch (r.frequency) {
          case 'daily': n.setDate(n.getDate() + 1); break;
          case 'weekly': n.setDate(n.getDate() + 7); break;
          case 'monthly': n.setMonth(n.getMonth() + 1); break;
          case 'yearly': n.setFullYear(n.getFullYear() + 1); break;
        }
        updated.push({ ...r, nextDate: n.toISOString().split('T')[0] });
      } else updated.push(r);
    });

    if (newTrans.length > 0) {
      setTransactions(prev => [...newTrans, ...prev]);
      setRecurringTransactions(updated);
      notify.success(`${newTrans.length} transaksi auto diproses`);
    }
  }, []);

  // ========== BUDGET ALERTS ==========
  useEffect(() => {
    if (budgets.length === 0) return;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const spending: Record<string, number> = {};
    transactions.forEach(t => {
      const d = new Date(t.date);
      if (t.type === 'expense' && d >= monthStart && d <= monthEnd) {
        spending[t.category] = (spending[t.category] || 0) + t.amount;
      }
    });

    budgets.forEach(b => {
      const spent = spending[b.category] || 0;
      const pct = (spent / b.limit) * 100;
      const catName = expenseCategories[b.category]?.name || b.category;

      if (pct >= 100 && !b.notified?.threshold100) {
        notify.budget(catName, pct);
        setBudgets(prev => prev.map(x => x.id === b.id ? { ...x, notified: { ...x.notified, threshold100: true } } : x));
      } else if (pct >= 80 && pct < 100 && !b.notified?.threshold80) {
        notify.budget(catName, pct);
        setBudgets(prev => prev.map(x => x.id === b.id ? { ...x, notified: { ...x.notified, threshold80: true } } : x));
      }
    });
  }, [transactions, budgets]);

  // ========== COMPUTED ==========
  const monthlyIncome = useMemo(() => {
    const now = new Date();
    return transactions.filter(t => {
      const d = new Date(t.date);
      return t.type === 'income' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((s, t) => s + t.amount, 0);
  }, [transactions]);

  const monthlyExpense = useMemo(() => {
    const now = new Date();
    return transactions.filter(t => {
      const d = new Date(t.date);
      return t.type === 'expense' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((s, t) => s + t.amount, 0);
  }, [transactions]);

  const savings = useMemo(() => monthlyIncome - monthlyExpense, [monthlyIncome, monthlyExpense]);

  const monthlySpending = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const s: Record<string, number> = {};
    transactions.forEach(t => {
      const d = new Date(t.date);
      if (t.type === 'expense' && d >= start && d <= end) s[t.category] = (s[t.category] || 0) + t.amount;
    });
    return s;
  }, [transactions]);

  // Pie data dengan shortName untuk mobile
  const pieData = useMemo(() =>
    Object.entries(monthlySpending)
      .map(([k, v]) => ({
        name: expenseCategories[k]?.shortName || k,
        fullName: expenseCategories[k]?.name || k,
        icon: expenseCategories[k]?.icon || '',
        value: v,
      })),
    [monthlySpending]
  );

  const barData = useMemo(() => {
    const now = new Date();
    const m: Record<string, { income: number; expense: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      m[k] = { income: 0, expense: 0 };
    }
    transactions.forEach(t => {
      const d = new Date(t.date);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (m[k]) { if (t.type === 'income') m[k].income += t.amount; else m[k].expense += t.amount; }
    });
    return Object.entries(m).map(([k, v]) => ({
      name: format(new Date(k + '-01'), 'MMM', { locale: id }),
      Pemasukan: v.income, Pengeluaran: v.expense,
    }));
  }, [transactions]);

  const generateAdvice = (): string[] => {
    const rate = monthlyIncome > 0 ? (savings / monthlyIncome) * 100 : 0;
    const advice: string[] = [];
    const byCat: Record<string, number> = {};
    transactions.filter(t => t.type === 'expense').forEach(t => byCat[t.category] = (byCat[t.category] || 0) + t.amount);
    const top = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];

    if (monthlyIncome === 0) advice.push('📝 Mulai catat pemasukan untuk saran yang lebih baik.');
    else if (rate < 10) advice.push(`⚠️ Tabungan hanya ${rate.toFixed(1)}%. Target minimal 20%.`);
    else if (rate < 20) advice.push(`💡 Tabungan ${rate.toFixed(1)}%. Bagus, tingkatkan ke 30%.`);
    else if (rate >= 30) advice.push(`🎯 Luar biasa! Tabungan ${rate.toFixed(1)}%. Pertahankan!`);

    if (monthlyExpense > monthlyIncome && monthlyIncome > 0)
      advice.push(`🚨 Defisit ${formatCurrency(monthlyExpense - monthlyIncome)}!`);
    if (top && top[1] > monthlyIncome * 0.5)
      advice.push(`💸 ${expenseCategories[top[0]]?.name} terlalu besar (${formatCurrency(top[1])}).`);

    return advice.length > 0 ? advice : ['💭 Terus catat transaksi untuk saran akurat.'];
  };

  const handleNominalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, amount: e.target.value.replace(/\D/g, '') }));
  };

  const syncToSheets = async (t: Transaction) => {
    if (!scriptUrl) return false;
    try {
      await fetch(scriptUrl, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: t.date, type: t.type, category: t.category, description: t.description, amount: t.amount, notes: t.notes || '' }),
      });
      return true;
    } catch { return false; }
  };

  const handleAddTransaction = async () => {
    if (!formData.description || !formData.amount) { notify.error('Deskripsi & nominal wajib diisi!'); return; }
    const nt: Transaction = {
      id: editingId || Date.now().toString(), date: formData.date, type: formData.type,
      category: formData.category, description: formData.description,
      amount: parseInt(formData.amount), notes: formData.notes, createdAt: new Date().toISOString(),
    };
    if (editingId) {
      setTransactions(transactions.map(t => t.id === editingId ? nt : t));
      setEditingId(null);
      notify.success('Transaksi diupdate!');
    } else {
      setTransactions([nt, ...transactions]);
      if (scriptUrl) {
        const ok = await syncToSheets(nt);
        if (ok) setTransactions(prev => prev.map(t => t.id === nt.id ? { ...t, syncedToSheets: true } : t));
      }
      notify.success('Transaksi ditambahkan!');
    }
    setFormData({ date: new Date().toISOString().split('T')[0], type: 'expense', category: 'makanan', description: '', amount: '', notes: '' });
    setActiveTab('history');
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Hapus transaksi ini?')) {
      setTransactions(transactions.filter(t => t.id !== id));
      notify.info('Transaksi dihapus');
    }
  };

  const handleEdit = (t: Transaction) => {
    setFormData({ date: t.date, type: t.type, category: t.category, description: t.description, amount: t.amount.toString(), notes: t.notes || '' });
    setEditingId(t.id);
    setActiveTab('input');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredTransactions = useMemo(() =>
    transactions
      .filter(t => !filterDate || t.date === filterDate)
      .filter(t => !filterCategory || t.category === filterCategory)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [transactions, filterDate, filterCategory]
  );

  const getCategories = () => transactionType === 'income' ? incomeCategories : expenseCategories;
  const currentCategory = getCategories()[formData.category];

  // ========== HANDLERS ==========
  const handleAddBudget = () => {
    const limit = parseNominal(budgetForm.limit);
    if (limit <= 0) { notify.error('Nominal tidak valid'); return; }
    if (budgets.some(b => b.category === budgetForm.category)) { notify.error('Budget sudah ada'); return; }
    setBudgets([...budgets, { id: Date.now().toString(), category: budgetForm.category, limit, period: 'monthly', createdAt: new Date().toISOString() }]);
    notify.success(`Budget ${expenseCategories[budgetForm.category].name} ditambahkan`);
    setBudgetForm({ category: 'makanan', limit: '' });
    setShowBudgetForm(false);
  };

  const handleAddGoal = () => {
    if (!goalForm.name || !goalForm.targetAmount) { notify.error('Nama & target wajib'); return; }
    setGoals([...goals, {
      id: Date.now().toString(), name: goalForm.name, targetAmount: parseInt(goalForm.targetAmount),
      currentAmount: 0, deadline: goalForm.deadline || undefined,
      monthlyContribution: goalForm.monthlyContribution ? parseInt(goalForm.monthlyContribution) : undefined,
      icon: goalForm.icon, createdAt: new Date().toISOString(),
    }]);
    notify.success('Goal ditambahkan!');
    setGoalForm({ name: '', targetAmount: '', deadline: '', monthlyContribution: '', icon: '🎯' });
    setShowGoalForm(false);
  };

  const addFundsToGoal = (id: string) => {
    const a = prompt('Nominal yang ditambahkan:');
    if (a) {
      const p = parseNominal(a);
      if (p > 0) {
        setGoals(goals.map(g => g.id === id ? { ...g, currentAmount: g.currentAmount + p } : g));
        notify.success(`+${formatCurrency(p)} ditambahkan`);
      }
    }
  };

  const handleAddRecurring = () => {
    if (!recurringForm.name || !recurringForm.amount) { notify.error('Nama & nominal wajib'); return; }
    setRecurringTransactions([...recurringTransactions, {
      id: Date.now().toString(), name: recurringForm.name, amount: parseInt(recurringForm.amount),
      type: recurringForm.type, category: recurringForm.category, frequency: recurringForm.frequency,
      nextDate: recurringForm.nextDate, reminderDays: recurringForm.reminderDays, isActive: true,
    }]);
    notify.success('Recurring ditambahkan');
    setRecurringForm({ name: '', amount: '', type: 'expense', category: 'utilitas', frequency: 'monthly', nextDate: format(new Date(), 'yyyy-MM-dd'), reminderDays: 3 });
    setShowRecurringForm(false);
  };

  const handleExport = () => {
    const data = { transactions, budgets, goals, recurringTransactions, exportDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `catat-keuangan-${Date.now()}.json`; a.click();
    notify.success('Data diexport');
  };

  const handleClearAll = () => {
    if (window.confirm('Yakin hapus SEMUA data?')) {
      setTransactions([]); setBudgets([]); setGoals([]); setRecurringTransactions([]);
      notify.success('Semua data dihapus');
    }
  };

  const goToMore = (tab: MoreTab) => {
    setActiveMoreTab(tab);
    setActiveTab('more');
  };

  const isDark = theme === 'dark';

  // Custom Pie Chart Label (responsive untuk mobile)
  const renderCustomizedLabel = (props: any) => {
    const { x, y, value, name } = props;
    const percentage = pieData.length > 0 ? ((value / pieData.reduce((sum, d) => sum + d.value, 0)) * 100).toFixed(0) : 0;
    if (parseInt(percentage) < 5) return null; // Hide label if too small
    return (
      <text x={x} y={y} fill={isDark ? '#fff' : '#1e293b'} textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight="600">
        {percentage}%
      </text>
    );
  };

  // Custom Legend untuk Pie Chart (compact mobile)
  const renderPieLegend = (props: any) => {
    const { payload } = props;
    return (
      <div className="flex flex-wrap gap-1.5 justify-center mt-2">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 rounded-full px-2 py-0.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-[10px] text-slate-700 dark:text-slate-300 font-medium">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  // Custom Legend untuk Bar Chart
  const renderBarLegend = (props: any) => {
    const { payload } = props;
    return (
      <div className="flex justify-center gap-3 mt-2">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded" style={{ backgroundColor: entry.color }} />
            <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  // Custom Tooltip untuk chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-2">
          {payload.map((item: any, idx: number) => (
            <div key={idx} className="text-xs">
              <span className="text-slate-500 dark:text-slate-400">{item.name}: </span>
              <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(item.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // ========== RENDER ==========
  return (
    <div className={`${isDark ? 'dark' : ''}`}>
      <div className="min-h-[100dvh] bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white transition-colors">
        <Toaster position="top-center" />

        {/* HEADER */}
        <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 sticky top-0 z-20 shadow-sm">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-gradient-to-br from-green-400 to-blue-500 rounded-xl flex items-center justify-center shadow-md">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold leading-tight">Catat Keuangan</h1>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">Pro Edition</p>
              </div>
            </div>
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center active:scale-95 transition-transform"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
            </button>
          </div>
        </header>

        {/* CONTENT */}
        <main className="max-w-4xl mx-auto px-4 pt-4 pb-28">

          {/* DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-4 shadow-lg shadow-green-500/20">
                  <div className="flex items-center gap-1.5 mb-1">
                    <ArrowDownLeft className="w-3.5 h-3.5 text-green-100" />
                    <p className="text-[11px] text-green-50 font-medium">Pemasukan</p>
                  </div>
                  <p className="text-sm font-bold text-white break-words">{formatCurrency(monthlyIncome).replace('Rp', 'Rp ')}</p>
                </div>
                <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl p-4 shadow-lg shadow-red-500/20">
                  <div className="flex items-center gap-1.5 mb-1">
                    <ArrowUpRight className="w-3.5 h-3.5 text-red-100" />
                    <p className="text-[11px] text-red-50 font-medium">Pengeluaran</p>
                  </div>
                  <p className="text-sm font-bold text-white break-words">{formatCurrency(monthlyExpense).replace('Rp', 'Rp ')}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-4 shadow-lg shadow-purple-500/20">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Zap className="w-3.5 h-3.5 text-purple-100" />
                    <p className="text-[11px] text-purple-50 font-medium">Tabungan</p>
                  </div>
                  <p className="text-sm font-bold text-white break-words">{formatCurrency(savings).replace('Rp', 'Rp ')}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl p-4 shadow-lg shadow-blue-500/20">
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingUp className="w-3.5 h-3.5 text-blue-100" />
                    <p className="text-[11px] text-blue-50 font-medium">Status</p>
                  </div>
                  <p className="text-sm font-bold text-white">{savings > 0 ? '✅ Positif' : '⚠️ Negatif'}</p>
                </div>
              </div>

              {pieData.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-md">
                  <h3 className="font-bold text-sm mb-3 text-slate-900 dark:text-white">📊 Breakdown Bulan Ini</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <RePieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={2}
                        dataKey="value"
                        label={renderCustomizedLabel}
                        labelLine={false}
                      >
                        {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend content={renderPieLegend} />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-md">
                <h3 className="font-bold text-sm mb-3 text-slate-900 dark:text-white">📈 6 Bulan Terakhir</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={barData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }}
                      axisLine={{ stroke: isDark ? '#475569' : '#cbd5e1' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 9, fill: isDark ? '#94a3b8' : '#64748b' }}
                      axisLine={{ stroke: isDark ? '#475569' : '#cbd5e1' }}
                      tickLine={false}
                      tickFormatter={v => formatCompact(v)}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend content={renderBarLegend} />
                    <Bar dataKey="Pemasukan" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Pengeluaran" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {budgets.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-md">
                  <h3 className="font-bold text-sm mb-3 text-slate-900 dark:text-white">💰 Status Budget</h3>
                  <div className="space-y-3">
                    {budgets.slice(0, 3).map(b => {
                      const spent = monthlySpending[b.category] || 0;
                      const pct = (spent / b.limit) * 100;
                      return (
                        <div key={b.id}>
                          <div className="flex justify-between mb-1">
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{expenseCategories[b.category]?.icon} {expenseCategories[b.category]?.name}</span>
                            <span className={`text-xs font-bold ${pct >= 100 ? 'text-red-500' : pct >= 80 ? 'text-orange-500' : 'text-green-500'}`}>{pct.toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                            <div className={`h-full rounded-full ${pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-orange-500' : 'bg-green-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-900/40 dark:to-yellow-900/40 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
                <h3 className="font-bold text-sm mb-2 flex items-center gap-1.5 text-amber-900 dark:text-amber-100">
                  <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400" /> Saran AI
                </h3>
                <div className="space-y-1.5">
                  {generateAdvice().map((a, i) => <p key={i} className="text-xs text-amber-900 dark:text-amber-100 leading-relaxed">{a}</p>)}
                </div>
              </div>
            </div>
          )}

          {/* INPUT */}
          {activeTab === 'input' && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-md">
                <h2 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">{editingId ? '✏️ Edit' : '➕ Tambah'} Transaksi</h2>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  <button
                    onClick={() => { setTransactionType('expense'); setFormData(p => ({ ...p, type: 'expense', category: 'makanan' })); }}
                    className={`py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 ${transactionType === 'expense' ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
                  >💸 Pengeluaran</button>
                  <button
                    onClick={() => { setTransactionType('income'); setFormData(p => ({ ...p, type: 'income', category: 'gaji' })); }}
                    className={`py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 ${transactionType === 'income' ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
                  >💰 Pemasukan</button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 text-slate-600 dark:text-slate-300">Tanggal</label>
                    <input type="date" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))}
                      className="w-full bg-slate-100 dark:bg-slate-700 border-2 border-transparent rounded-xl px-3 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 text-slate-600 dark:text-slate-300">Kategori</label>
                    <select value={formData.category} onChange={e => setFormData(p => ({ ...p, category: e.target.value }))}
                      className="w-full bg-slate-100 dark:bg-slate-700 border-2 border-transparent rounded-xl px-3 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500">
                      {Object.entries(getCategories()).map(([k, c]) => <option key={k} value={k}>{c.icon} {c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 text-slate-600 dark:text-slate-300">Deskripsi</label>
                    <input type="text" value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                      placeholder={`Contoh: ${currentCategory?.name || ''}`}
                      className="w-full bg-slate-100 dark:bg-slate-700 border-2 border-transparent rounded-xl px-3 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 text-slate-600 dark:text-slate-300">Nominal</label>
                    <input type="text" value={formatNominalDisplay(formData.amount)} onChange={handleNominalChange} placeholder="Rp 0" inputMode="numeric"
                      className="w-full bg-slate-100 dark:bg-slate-700 border-2 border-transparent rounded-xl px-3 py-3 text-base font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 text-slate-600 dark:text-slate-300">Catatan</label>
                    <textarea value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} placeholder="Opsional"
                      className="w-full bg-slate-100 dark:bg-slate-700 border-2 border-transparent rounded-xl px-3 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 h-20 resize-none" />
                  </div>

                  <button onClick={handleAddTransaction}
                    className={`w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all active:scale-95 shadow-lg ${transactionType === 'income' ? 'bg-green-500 shadow-green-500/30' : 'bg-red-500 shadow-red-500/30'}`}>
                    {editingId ? '✏️ Update' : '➕ Simpan'} Transaksi
                  </button>

                  {editingId && (
                    <button onClick={() => { setEditingId(null); setFormData({ date: new Date().toISOString().split('T')[0], type: 'expense', category: 'makanan', description: '', amount: '', notes: '' }); }}
                      className="w-full py-3 rounded-xl font-semibold text-sm bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 active:scale-95">❌ Batal</button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">📅 Riwayat</h2>

              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500" />
                <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500">
                  <option value="">Semua</option>
                  {Object.entries({ ...incomeCategories, ...expenseCategories }).map(([k, c]) => <option key={k} value={k}>{c.icon} {c.name}</option>)}
                </select>
              </div>

              {filteredTransactions.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center">
                  <p className="text-slate-500 dark:text-slate-400 text-sm">Belum ada transaksi</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTransactions.map(t => {
                    const cats = t.type === 'income' ? incomeCategories : expenseCategories;
                    const cat = cats[t.category];
                    return (
                      <div key={t.id} className="bg-white dark:bg-slate-800 rounded-2xl p-3.5 shadow-sm active:scale-[0.99] transition-transform">
                        <div className="flex items-center gap-3">
                          <div className={`text-xl w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${cat?.bgColor || 'bg-slate-100'}`}>{cat?.icon || '💰'}</div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm text-slate-900 dark:text-white truncate">{cat?.name || 'Transaksi'}</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{t.description}</p>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{format(new Date(t.date), 'dd MMM yyyy', { locale: id })}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className={`text-sm font-bold ${t.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                              {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount).replace('Rp', '').trim()}
                            </p>
                            <div className="flex gap-1 mt-1.5 justify-end">
                              <button onClick={() => handleEdit(t)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg active:scale-90 transition-transform">
                                <Edit2 className="w-3.5 h-3.5 text-blue-500" />
                              </button>
                              <button onClick={() => handleDelete(t.id)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg active:scale-90 transition-transform">
                                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* MORE - Contains: Analisis, Budget, Goals, Recurring, Settings */}
          {activeTab === 'more' && (
            <div className="space-y-4">
              {/* Submenu Navigation */}
              <div className="bg-white dark:bg-slate-800 p-1 rounded-2xl shadow-md">
                <div className="grid grid-cols-5 gap-0.5">
                  {([
                    { id: 'analisis' as MoreTab, label: '📊', name: 'Analisis' },
                    { id: 'budget' as MoreTab, label: '💰', name: 'Budget' },
                    { id: 'goals' as MoreTab, label: '🎯', name: 'Goals' },
                    { id: 'recurring' as MoreTab, label: '🔄', name: 'Auto' },
                    { id: 'settings' as MoreTab, label: '⚙️', name: 'Set' },
                  ]).map(tab => (
                    <button key={tab.id} onClick={() => setActiveMoreTab(tab.id)}
                      className={`flex flex-col items-center py-2 rounded-xl text-[10px] font-semibold transition-all active:scale-95 ${
                        activeMoreTab === tab.id
                          ? 'bg-blue-500 text-white shadow-md'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}>
                      <span className="text-base mb-0.5">{tab.label}</span>
                      <span>{tab.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ANALISIS */}
              {activeMoreTab === 'analisis' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-3 shadow-sm">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">Total Transaksi</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-white">{transactions.length}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-3 shadow-sm">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">Avg Pengeluaran</p>
                      <p className="text-sm font-bold text-red-500">
                        {formatCurrency(transactions.filter(t => t.type === 'expense').length > 0 ? transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0) / transactions.filter(t => t.type === 'expense').length : 0)}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-md">
                    <h3 className="font-bold text-sm mb-3 text-slate-900 dark:text-white">📈 6 Bulan</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={barData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }}
                          axisLine={{ stroke: isDark ? '#475569' : '#cbd5e1' }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 9, fill: isDark ? '#94a3b8' : '#64748b' }}
                          axisLine={{ stroke: isDark ? '#475569' : '#cbd5e1' }}
                          tickLine={false}
                          tickFormatter={v => formatCompact(v)}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend content={renderBarLegend} />
                        <Bar dataKey="Pemasukan" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Pengeluaran" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {monthlyIncome > 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-md">
                      <h3 className="font-bold text-sm mb-2 text-slate-900 dark:text-white">🎯 Tingkat Tabungan</h3>
                      <div className="flex justify-between mb-1.5">
                        <span className="text-xs text-slate-600 dark:text-slate-400">Progress</span>
                        <span className="text-xs font-bold text-purple-500">{((savings / monthlyIncome) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                        <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full" style={{ width: `${Math.min(((savings / monthlyIncome) * 100), 100)}%` }} />
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">Target ideal: 20-30%</p>
                    </div>
                  )}

                  {/* STATUS BOX - FIXED LIGHT/DARK CONTRAST */}
                  <div className={`rounded-2xl p-4 border-2 ${
                    savings > 0
                      ? 'bg-green-500 dark:bg-green-900/40 border-green-600 dark:border-green-700'
                      : 'bg-red-500 dark:bg-red-900/40 border-red-600 dark:border-red-700'
                  }`}>
                    <div className="flex items-start gap-2">
                      <div className="text-2xl">{savings > 0 ? '✅' : '⚠️'}</div>
                      <div className="flex-1">
                        <h3 className="font-bold text-white mb-1 text-sm">
                          {savings > 0 ? 'Status Keuangan Sehat' : 'Status Perlu Perhatian'}
                        </h3>
                        <p className="text-xs text-white/95 leading-relaxed">
                          {savings > 0
                            ? `Surplus ${formatCurrency(savings)} bulan ini. Pertahankan!`
                            : `Defisit ${formatCurrency(Math.abs(savings))}. Tinjau pengeluaran Anda.`
                          }
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-md">
                    <h3 className="font-bold text-sm mb-2 text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Lightbulb className="w-4 h-4 text-amber-500" /> Saran AI
                    </h3>
                    <div className="space-y-1.5">
                      {generateAdvice().map((a, i) => <p key={i} className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{a}</p>)}
                    </div>
                  </div>
                </div>
              )}

              {/* BUDGET */}
              {activeMoreTab === 'budget' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">💰 Budget</h2>
                    <button onClick={() => setShowBudgetForm(!showBudgetForm)}
                      className="bg-blue-500 text-white px-3 py-2 rounded-xl text-xs font-semibold active:scale-95 transition-transform flex items-center gap-1 shadow-md shadow-blue-500/30">
                      <Plus className="w-3.5 h-3.5" /> Baru
                    </button>
                  </div>

                  {showBudgetForm && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-md space-y-3">
                      <select value={budgetForm.category} onChange={e => setBudgetForm({ ...budgetForm, category: e.target.value })}
                        className="w-full bg-slate-100 dark:bg-slate-700 rounded-xl px-3 py-3 text-sm text-slate-900 dark:text-white">
                        {Object.entries(expenseCategories).map(([k, c]) => <option key={k} value={k}>{c.icon} {c.name}</option>)}
                      </select>
                      <input type="text" value={formatNominalDisplay(budgetForm.limit)} onChange={e => setBudgetForm({ ...budgetForm, limit: parseNominal(e.target.value).toString() })}
                        placeholder="Rp 0" className="w-full bg-slate-100 dark:bg-slate-700 rounded-xl px-3 py-3 text-base font-bold text-slate-900 dark:text-white" />
                      <div className="flex gap-2">
                        <button onClick={handleAddBudget} className="flex-1 bg-green-500 text-white py-3 rounded-xl font-semibold active:scale-95">Simpan</button>
                        <button onClick={() => setShowBudgetForm(false)} className="px-4 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-white rounded-xl active:scale-95">Batal</button>
                      </div>
                    </div>
                  )}

                  {budgets.length === 0 ? (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center">
                      <p className="text-slate-500 dark:text-slate-400 text-sm">Belum ada budget</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {budgets.map(b => {
                        const spent = monthlySpending[b.category] || 0;
                        const pct = (spent / b.limit) * 100;
                        const remaining = b.limit - spent;
                        const cat = expenseCategories[b.category];
                        return (
                          <div key={b.id} className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-md">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-2xl">{cat?.icon}</span>
                                <div>
                                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">{cat?.name}</h3>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{formatCurrency(spent)} / {formatCurrency(b.limit)}</p>
                                </div>
                              </div>
                              <button onClick={() => { setBudgets(budgets.filter(x => x.id !== b.id)); notify.info('Budget dihapus'); }}
                                className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg active:scale-90">
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </button>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden mb-2">
                              <div className={`h-full rounded-full ${pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-orange-500' : 'bg-green-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                            </div>
                            <div className="flex justify-between items-center text-[11px]">
                              <span className={`font-semibold flex items-center gap-1 ${pct >= 100 ? 'text-red-500' : pct >= 80 ? 'text-orange-500' : 'text-green-500'}`}>
                                {pct >= 100 ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                                {pct >= 100 ? 'Over!' : pct >= 80 ? 'Hampir habis' : pct >= 50 ? 'Normal' : 'Aman'}
                              </span>
                              <span className={`font-bold ${remaining < 0 ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'}`}>
                                {remaining < 0 ? `Over ${formatCurrency(Math.abs(remaining))}` : `Sisa ${formatCurrency(remaining)}`}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* GOALS */}
              {activeMoreTab === 'goals' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">🎯 Goals</h2>
                    <button onClick={() => setShowGoalForm(!showGoalForm)}
                      className="bg-blue-500 text-white px-3 py-2 rounded-xl text-xs font-semibold active:scale-95 flex items-center gap-1 shadow-md shadow-blue-500/30">
                      <Plus className="w-3.5 h-3.5" /> Baru
                    </button>
                  </div>

                  {showGoalForm && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-md space-y-3">
                      <div>
                        <label className="block text-xs font-semibold mb-1.5 text-slate-600 dark:text-slate-300">Icon</label>
                        <div className="flex gap-2 flex-wrap">
                          {['🏠', '🚗', '✈️', '💻', '📱', '💍', '🎓', '💰', '🎯', '🏖️'].map(icon => (
                            <button key={icon} onClick={() => setGoalForm({ ...goalForm, icon })}
                              className={`text-xl w-11 h-11 rounded-xl active:scale-90 transition-transform ${goalForm.icon === icon ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-700'}`}>{icon}</button>
                          ))}
                        </div>
                      </div>
                      <input type="text" value={goalForm.name} onChange={e => setGoalForm({ ...goalForm, name: e.target.value })} placeholder="Nama goal"
                        className="w-full bg-slate-100 dark:bg-slate-700 rounded-xl px-3 py-3 text-sm text-slate-900 dark:text-white" />
                      <input type="text" value={formatNominalDisplay(goalForm.targetAmount)} onChange={e => setGoalForm({ ...goalForm, targetAmount: parseNominal(e.target.value).toString() })}
                        placeholder="Target" className="w-full bg-slate-100 dark:bg-slate-700 rounded-xl px-3 py-3 text-base font-bold text-slate-900 dark:text-white" />
                      <input type="date" value={goalForm.deadline} onChange={e => setGoalForm({ ...goalForm, deadline: e.target.value })}
                        className="w-full bg-slate-100 dark:bg-slate-700 rounded-xl px-3 py-3 text-sm text-slate-900 dark:text-white" />
                      <input type="text" value={formatNominalDisplay(goalForm.monthlyContribution)} onChange={e => setGoalForm({ ...goalForm, monthlyContribution: parseNominal(e.target.value).toString() })}
                        placeholder="Kontribusi/bulan" className="w-full bg-slate-100 dark:bg-slate-700 rounded-xl px-3 py-3 text-sm text-slate-900 dark:text-white" />
                      <div className="flex gap-2">
                        <button onClick={handleAddGoal} className="flex-1 bg-green-500 text-white py-3 rounded-xl font-semibold active:scale-95">Simpan</button>
                        <button onClick={() => setShowGoalForm(false)} className="px-4 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-white rounded-xl active:scale-95">Batal</button>
                      </div>
                    </div>
                  )}

                  {goals.length === 0 ? (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center">
                      <p className="text-slate-500 dark:text-slate-400 text-sm">Belum ada goal</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {goals.map(g => {
                        const pct = (g.currentAmount / g.targetAmount) * 100;
                        const remaining = g.targetAmount - g.currentAmount;
                        const daysLeft = g.deadline ? differenceInDays(new Date(g.deadline), new Date()) : null;
                        const months = g.monthlyContribution ? Math.ceil(remaining / g.monthlyContribution) : null;
                        return (
                          <div key={g.id} className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-md">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-3xl">{g.icon}</span>
                                <div>
                                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">{g.name}</h3>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{formatCurrency(g.currentAmount)} / {formatCurrency(g.targetAmount)}</p>
                                </div>
                              </div>
                              <button onClick={() => { if (confirm('Hapus goal?')) { setGoals(goals.filter(x => x.id !== g.id)); notify.info('Goal dihapus'); } }}
                                className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg active:scale-90">
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </button>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden mb-2">
                              <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full flex items-center justify-end pr-2" style={{ width: `${Math.min(pct, 100)}%` }}>
                                {pct > 15 && <span className="text-white text-[10px] font-bold">{pct.toFixed(0)}%</span>}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[11px] mb-3">
                              <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-2">
                                <p className="text-slate-500 dark:text-slate-400">Sisa</p>
                                <p className="font-bold text-slate-900 dark:text-white">{formatCurrency(remaining)}</p>
                              </div>
                              {daysLeft !== null ? (
                                <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-2">
                                  <p className="text-slate-500 dark:text-slate-400">Sisa waktu</p>
                                  <p className="font-bold text-slate-900 dark:text-white">{daysLeft} hari</p>
                                </div>
                              ) : months !== null ? (
                                <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-2">
                                  <p className="text-slate-500 dark:text-slate-400">Tercapai</p>
                                  <p className="font-bold text-slate-900 dark:text-white">{months} bln</p>
                                </div>
                              ) : null}
                            </div>
                            <button onClick={() => addFundsToGoal(g.id)}
                              className="w-full bg-blue-500 text-white py-2.5 rounded-xl text-xs font-semibold active:scale-95 transition-transform">
                              + Tambah Dana
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* RECURRING */}
              {activeMoreTab === 'recurring' && (
                <div className="space-y-3">
                  <button onClick={() => setShowRecurringForm(!showRecurringForm)}
                    className="w-full bg-blue-500 text-white py-3 rounded-xl font-semibold active:scale-95 flex items-center justify-center gap-1 shadow-md shadow-blue-500/30">
                    <Plus className="w-4 h-4" /> Tambah Recurring
                  </button>

                  {showRecurringForm && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-md space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setRecurringForm({ ...recurringForm, type: 'expense', category: 'utilitas' })}
                          className={`py-3 rounded-xl font-semibold text-sm ${recurringForm.type === 'expense' ? 'bg-red-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>💸 Keluar</button>
                        <button onClick={() => setRecurringForm({ ...recurringForm, type: 'income', category: 'gaji' })}
                          className={`py-3 rounded-xl font-semibold text-sm ${recurringForm.type === 'income' ? 'bg-green-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>💰 Masuk</button>
                      </div>
                      <input type="text" value={recurringForm.name} onChange={e => setRecurringForm({ ...recurringForm, name: e.target.value })}
                        placeholder="Nama (Listrik, Gaji...)" className="w-full bg-slate-100 dark:bg-slate-700 rounded-xl px-3 py-3 text-sm text-slate-900 dark:text-white" />
                      <select value={recurringForm.category} onChange={e => setRecurringForm({ ...recurringForm, category: e.target.value })}
                        className="w-full bg-slate-100 dark:bg-slate-700 rounded-xl px-3 py-3 text-sm text-slate-900 dark:text-white">
                        {Object.entries(recurringForm.type === 'income' ? incomeCategories : expenseCategories).map(([k, c]) => <option key={k} value={k}>{c.icon} {c.name}</option>)}
                      </select>
                      <input type="text" value={formatNominalDisplay(recurringForm.amount)} onChange={e => setRecurringForm({ ...recurringForm, amount: parseNominal(e.target.value).toString() })}
                        placeholder="Rp 0" className="w-full bg-slate-100 dark:bg-slate-700 rounded-xl px-3 py-3 text-base font-bold text-slate-900 dark:text-white" />
                      <select value={recurringForm.frequency} onChange={e => setRecurringForm({ ...recurringForm, frequency: e.target.value as any })}
                        className="w-full bg-slate-100 dark:bg-slate-700 rounded-xl px-3 py-3 text-sm text-slate-900 dark:text-white">
                        <option value="daily">Harian</option><option value="weekly">Mingguan</option>
                        <option value="monthly">Bulanan</option><option value="yearly">Tahunan</option>
                      </select>
                      <input type="date" value={recurringForm.nextDate} onChange={e => setRecurringForm({ ...recurringForm, nextDate: e.target.value })}
                        className="w-full bg-slate-100 dark:bg-slate-700 rounded-xl px-3 py-3 text-sm text-slate-900 dark:text-white" />
                      <div className="flex gap-2">
                        <button onClick={handleAddRecurring} className="flex-1 bg-green-500 text-white py-3 rounded-xl font-semibold active:scale-95">Simpan</button>
                        <button onClick={() => setShowRecurringForm(false)} className="px-4 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-white rounded-xl active:scale-95">Batal</button>
                      </div>
                    </div>
                  )}

                  {recurringTransactions.length === 0 ? (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center">
                      <p className="text-slate-500 dark:text-slate-400 text-sm">Belum ada recurring</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {recurringTransactions.map(r => {
                        const daysLeft = differenceInDays(new Date(r.nextDate), new Date());
                        const isUrgent = daysLeft <= r.reminderDays && daysLeft >= 0;
                        const cats = r.type === 'income' ? incomeCategories : expenseCategories;
                        const cat = cats[r.category];
                        return (
                          <div key={r.id} className={`bg-white dark:bg-slate-800 rounded-2xl p-3.5 shadow-sm ${isUrgent ? 'ring-2 ring-orange-400' : ''}`}>
                            <div className="flex items-center gap-3">
                              <span className="text-xl w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">{cat?.icon}</span>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-sm text-slate-900 dark:text-white truncate">{r.name}</h3>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">{cat?.name} • {r.frequency === 'daily' ? 'Harian' : r.frequency === 'weekly' ? 'Mingguan' : r.frequency === 'monthly' ? 'Bulanan' : 'Tahunan'}</p>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <Calendar className="w-3 h-3 text-slate-400" />
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{daysLeft === 0 ? 'Hari ini' : daysLeft > 0 ? `${daysLeft} hari lagi` : 'Terlewat'}</p>
                                  {isUrgent && <Bell className="w-3 h-3 text-orange-500 animate-pulse" />}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={`text-sm font-bold ${r.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                                  {r.type === 'income' ? '+' : '-'}{formatCurrency(r.amount).replace('Rp', '').trim()}
                                </p>
                                <button onClick={() => { setRecurringTransactions(recurringTransactions.filter(x => x.id !== r.id)); notify.info('Dihapus'); }}
                                  className="p-1 mt-1 active:scale-90">
                                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* SETTINGS */}
              {activeMoreTab === 'settings' && (
                <div className="space-y-3">
                  <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-md space-y-3">
                    <h3 className="font-bold text-sm flex items-center gap-1.5 text-slate-900 dark:text-white"><Cloud className="w-4 h-4" /> Google Sheets</h3>
                    <input type="text" value={scriptUrl} onChange={e => { setScriptUrl(e.target.value); localStorage.setItem('keuangan_scriptUrl', e.target.value); }}
                      placeholder="URL Apps Script" className="w-full bg-slate-100 dark:bg-slate-700 rounded-xl px-3 py-3 text-xs text-slate-900 dark:text-white" />
                    <details>
                      <summary className="cursor-pointer text-xs text-blue-500">Lihat Script Code</summary>
                      <pre className="bg-slate-900 text-green-400 p-3 rounded-lg text-[10px] overflow-auto max-h-40 mt-2">{APPS_SCRIPT_CODE}</pre>
                    </details>
                  </div>

                  <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-md space-y-2">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">📁 Data</h3>
                    <button onClick={handleExport} className="w-full flex items-center justify-center gap-2 bg-green-500 text-white py-3 rounded-xl font-semibold active:scale-95">
                      <Download className="w-4 h-4" /> Export JSON
                    </button>
                    <button onClick={handleClearAll} className="w-full flex items-center justify-center gap-2 bg-red-500 text-white py-3 rounded-xl font-semibold active:scale-95">
                      <Trash2 className="w-4 h-4" /> Hapus Semua
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </main>

        {/* BOTTOM NAVIGATION - 4 TABS ONLY */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shadow-2xl z-30 pb-[env(safe-area-inset-bottom)]">
          <div className="grid grid-cols-4 max-w-4xl mx-auto">
            {[
              { id: 'dashboard' as TabType, label: 'Home', icon: Home },
              { id: 'input' as TabType, label: 'Input', icon: Plus },
              { id: 'history' as TabType, label: 'Riwayat', icon: Calendar },
              { id: 'more' as TabType, label: 'Lainnya', icon: Menu },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center justify-center py-2.5 transition-all active:scale-90 ${
                    isActive ? 'text-blue-500' : 'text-slate-400 dark:text-slate-500'
                  }`}>
                  <div className={`w-12 h-8 rounded-xl flex items-center justify-center transition-all ${isActive ? 'bg-blue-100 dark:bg-blue-900/40' : ''}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-medium mt-0.5">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}