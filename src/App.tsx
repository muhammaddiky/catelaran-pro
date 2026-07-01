import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus, Trash2, Edit2, TrendingUp, Calendar, BarChart3,
  Home, Cloud, CheckCircle, DollarSign, Zap, Lightbulb, AlertTriangle,
  Target, Repeat, Bell, Sun, Moon, Download, Settings as SettingsIcon,
  ArrowUpRight, ArrowDownLeft, Menu, LogOut, ChevronRight, X, Eye, Clock,
  EyeOff
} from 'lucide-react';
import {
  PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line
} from 'recharts';
import toast, { Toaster } from 'react-hot-toast';
import { format, differenceInDays } from 'date-fns';
import { id } from 'date-fns/locale';
import { useAuth } from './contexts/AuthContext';
import { AuthScreen } from './components/AuthScreen';
import { useSupabaseData } from './hooks/useSupabaseData';
import { supabase } from './lib/supabase';
import { SplashScreen } from './components/SplashScreen';
import { addMonths } from 'date-fns'; // ✅ TAMBAHKAN IMPORT
import { ErrorBoundary } from './components/ErrorBoundary';

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
  book_id?: string;
  payment_method?: string;
}

interface CategoryConfig {
  id: string;
  name: string;
  shortName: string;
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
  description?: string; // ✅ TAMBAHKAN INI
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
const PIE_COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']; // ✅ HARUS DI SINI


const incomeCategories: Record<string, CategoryConfig> = {
  gaji: { id: 'gaji', name: 'Gaji', shortName: 'Gaji', icon: '💼', color: 'text-green-600', bgColor: 'bg-green-100', type: 'income' },
  usaha: { id: 'usaha', name: 'Usaha', shortName: 'Usaha', icon: '🏪', color: 'text-blue-600', bgColor: 'bg-blue-100', type: 'income' },
  investasi: { id: 'investasi', name: 'Investasi', shortName: 'Invest', icon: '📈', color: 'text-purple-600', bgColor: 'bg-purple-100', type: 'income' },
  lainnya: { id: 'lainnya', name: 'Lainnya', shortName: 'Lain', icon: '🎁', color: 'text-yellow-600', bgColor: 'bg-yellow-100', type: 'income' },
};

const expenseCategories: Record<string, CategoryConfig> = {
  rumah_tangga: { id: 'rumah_tangga', name: 'Rumah Tangga', shortName: 'Rumah Tangga', icon: '🏠', color: 'text-orange-600', bgColor: 'bg-orange-100', type: 'expense' },
  utilitas: { id: 'utilitas', name: 'Utilitas', shortName: 'Util', icon: '⚡', color: 'text-yellow-600', bgColor: 'bg-yellow-100', type: 'expense' },
  makanan: { id: 'makanan', name: 'Makanan', shortName: 'Mkn', icon: '🍜', color: 'text-orange-500', bgColor: 'bg-orange-50', type: 'expense' },
  transportasi: { id: 'transportasi', name: 'Transport', shortName: 'Trans', icon: '🚗', color: 'text-red-600', bgColor: 'bg-red-100', type: 'expense' },
  perawatan_diri: { id: 'perawatan_diri', name: 'Perawatan Diri', shortName: 'Perwt', icon: '💇', color: 'text-pink-600', bgColor: 'bg-pink-100', type: 'expense' },
  hiburan: { id: 'hiburan', name: 'Hiburan', shortName: 'Hbr', icon: '🎬', color: 'text-pink-600', bgColor: 'bg-pink-100', type: 'expense' },
  belanja: { id: 'belanja', name: 'Belanja', shortName: 'Blnj', icon: '🛍️', color: 'text-rose-600', bgColor: 'bg-rose-100', type: 'expense' },
  belanja_online: { id: 'belanja_online', name: 'Belanja Online', shortName: 'OlShop', icon: '📦', color: 'text-orange-600', bgColor: 'bg-orange-100', type: 'expense' },
  rekreasi: { id: 'rekreasi', name: 'Rekreasi', shortName: 'Rek', icon: '✈️', color: 'text-cyan-600', bgColor: 'bg-cyan-100', type: 'expense' },
  sosial: { id: 'sosial', name: 'Sosial', shortName: 'Sos', icon: '🤝', color: 'text-purple-600', bgColor: 'bg-purple-100', type: 'expense' },
  anak: { id: 'anak', name: 'Anak', shortName: 'Anak', icon: '👶', color: 'text-pink-500', bgColor: 'bg-pink-50', type: 'expense' },
  cadangan: { id: 'cadangan', name: 'Cadangan', shortName: 'Cdg', icon: '🔐', color: 'text-slate-600', bgColor: 'bg-slate-100', type: 'expense' },
  pendidikan: { id: 'pendidikan', name: 'Pendidikan', shortName: 'Pend', icon: '📚', color: 'text-indigo-600', bgColor: 'bg-indigo-100', type: 'expense' },
  kesehatan: { id: 'kesehatan', name: 'Kesehatan', shortName: 'Kes', icon: '🏥', color: 'text-red-500', bgColor: 'bg-red-50', type: 'expense' },
  cicilan: { id: 'cicilan', name: 'Cicilan', shortName: 'Ccl', icon: '💳', color: 'text-blue-700', bgColor: 'bg-blue-100', type: 'expense' },
  asuransi: { id: 'asuransi', name: 'Asuransi', shortName: 'Asr', icon: '🛡️', color: 'text-indigo-500', bgColor: 'bg-indigo-50', type: 'expense' },
  investasi_exp: { id: 'investasi_exp', name: 'Investasi', shortName: 'Inv', icon: '💰', color: 'text-green-600', bgColor: 'bg-green-100', type: 'expense' },
  lainnya_exp: { id: 'lainnya_exp', name: 'Lainnya', shortName: 'Lain', icon: '🤷‍♂️', color: 'text-yellow-600', bgColor: 'bg-yellow-100', type: 'expense' },
};

// ✅ KONFIGURASI METODE PEMBAYARAN (3 KATEGORI)
const paymentMethods: Record<string, { 
  name: string; 
  icon: string; 
  color: string; 
  bg: string;
  description: string;  // Tambahkan deskripsi untuk detail
}> = {
  cash: { 
    name: 'Tunai', 
    icon: '💵', 
    color: 'text-green-600', 
    bg: 'bg-green-100 dark:bg-green-900/30',
    description: 'Uang tunai, dompet fisik'
  },
  qris: { 
    name: 'QRIS', 
    icon: '📱', 
    color: 'text-blue-600', 
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    description: 'Pembayaran digital via QRIS'
  },
  transfer: { 
    name: 'Transfer', 
    icon: '🏦', 
    color: 'text-indigo-600', 
    bg: 'bg-indigo-100 dark:bg-indigo-900/30',
    description: 'Transfer bank, virtual account'
  },
};

// ✅ CONTOH DESKRIPSI PER KATEGORI (untuk placeholder)
const categoryExamples: Record<string, string[]> = {
  // === PEMASUKAN ===
  gaji: ['Gaji bulanan', 'Bonus akhir tahun', 'Tunjangan lain-lain'],
  usaha: ['Penjualan hari ini', 'Profit bisnis online', 'Order customer'],
  investasi: ['Dividen saham', 'Bunga deposito', 'Profit crypto'],
  lainnya: ['Hadiah ulang tahun', 'Angpao Lebaran', 'Cashback'],
  
  // === PENGELUARAN ===
  rumah_tangga: ['Beli sabun & deterjen', 'Kantong sampah', 'Gas elpiji'],
  utilitas: ['Bayar listrik PLN', 'Bayar air PDAM', 'Internet & WiFi'],
  makanan: ['Makan siang', 'Beli sayur pasar', 'Minuman & snack'],
  transportasi: ['Isi bensin motor', 'Ojek online', 'Tol & parkir'],
  pendidikan: ['Beli buku kuliah', 'Kursus online', 'SPP anak'],
  kesehatan: ['Beli obat apotek', 'Konsultasi dokter', 'Vitamin & suplemen'],
  cicilan: ['Bayar Paylater', 'Cicilan motor', 'Cicilan rumah KPR'],
  asuransi: ['Premi asuransi jiwa', 'BPJS Kesehatan', 'Asuransi mobil'],
  lainnya_exp: ['beli apa??..', 'bayar apa??', 'Biaya tak terduga'],
  investasi_exp: ['Beli saham BBCA', 'Top up reksadana', 'Nabung emas'],
  hiburan: ['Nonton bioskop', 'Netflix/Spotify', 'Game & langganan'],
  belanja: ['Baju baru', 'Sepatu kerja', 'Tas'],
  belanja_online: ['Checkout Shopee', 'Tokped', 'TikTok Shop'],
  rekreasi: ['Tiket wisata', 'Staycation', 'Jalan-jalan keluarga'],
  sosial: ['Sedekah', 'Kondangan pernikahan', 'Sumbangan'],
  anak: ['Susu & popok', 'Mainan anak', 'Uang saku sekolah'],
  cadangan: ['Dana darurat', 'Tabungan masa depan', 'Alokasi risiko'],
  perawatan_diri: ['Potong rambut', 'Skincare & kosmetik', 'Salon & spa'],
};


// ==================== UTILS ====================
// ✅ HELPER: Parse tanggal string ke Date LOKAL (bukan UTC)
// Mencegah bug timezone dimana "2024-01-01" jadi bulan sebelumnya di zona negatif
const parseLocalDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  // ✅ PENTING: Parse sebagai LOCAL date, bukan UTC
  // Tambahkan waktu siang (12:00) untuk menghindari masalah timezone
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (isNaN(d.getTime())) return new Date(dateStr);
  return d;
};
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

const APPS_SCRIPT_CODE = `function doPost(e) { try { const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet(); const data = JSON.parse(e.postData.contents); sheet.appendRow([new Date(), data.date, data.type, data.category, data.description, data.amount, data.notes || '']); return ContentService.createTextOutput(JSON.stringify({status:'success'})).setMimeType(ContentService.MimeType.JSON); } catch (error) { return ContentService.createTextOutput(JSON.stringify({status:'error'})).setMimeType(ContentService.MimeType.JSON); } }`;

// ==================== MAIN COMPONENT ====================
export default function CatanKeuangan() {
  const { user, profile, signOut, loading: authLoading } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const [showIncome, setShowIncome] = useState(false);
  const [showSavings, setShowSavings] = useState(false);
  const [isFamilyMode, setIsFamilyMode] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isHistoryCategoryDropdownOpen, setIsHistoryCategoryDropdownOpen] = useState(false);
  const [isBudgetCategoryDropdownOpen, setIsBudgetCategoryDropdownOpen] = useState(false);
  const [isRecurringCategoryDropdownOpen, setIsRecurringCategoryDropdownOpen] = useState(false);
  const [isRecurringFrequencyDropdownOpen, setIsRecurringFrequencyDropdownOpen] = useState(false);
  // ✅ STATE BARU: Rincian Item Transaksi
const [transactionItems, setTransactionItems] = useState<Array<{ name: string; qty: number; price: number }>>([]);
const [showItemDetails, setShowItemDetails] = useState(false);
// ✅ STATE UNTUK CHART READY (menghilangkan warning Recharts)
const [chartReady, setChartReady] = useState(false);
const bookManagerRef = useRef<HTMLDivElement>(null);
const [loadingTimeout, setLoadingTimeout] = useState(false);
// ✅ STATE BARU: Pajak
const [includeTax, setIncludeTax] = useState(false);
const [taxRate, setTaxRate] = useState<'10' | '11'>('11');




// ✅ HELPER: Parse items dari notes (ULTIMATE SAFE VERSION)
const parseItemsFromNotes = (notes?: string | null): Array<{ name: string; qty: number; price: number }> => {
  if (!notes) return [];
  try {
    // Cari pola [items: ... ] dengan regex yang lebih toleran
    const match = notes.match(/\[items:([\s\S]*?)\]/);
    if (match && match[1]) {
      let jsonStr = match[1].trim();
      
      // 🛠️ STEP 1: Coba parse normal
      try {
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed)) return parsed;
      } catch (e1) {
        // 🛠️ STEP 2: Recovery Heuristics untuk data rusak/terpotong
        // 1. Ganti single quote dengan double quote
        jsonStr = jsonStr.replace(/'/g, '"');
        
        // 2. Hapus koma trailing sebelum ]
        jsonStr = jsonStr.replace(/,\s*\]/g, ']');
        
        // 3. PERBAIKAN KRUSIAL: Jika JSON terpotong (tidak ada ] di akhir), tambahkan ]
        if (!jsonStr.endsWith(']')) {
          const fixedJson = jsonStr + ']';
          try {
            const recovered = JSON.parse(fixedJson);
            if (Array.isArray(recovered)) {
              return recovered;
            }
          } catch (e2) {
            // Jika masih gagal, abaikan saja agar app tidak crash
            console.warn('️ Items JSON unrecoverable even after fix');
          }
        }
      }
    }
  } catch (e) {
    // Silent fail agar UI tidak blank
  }
  return [];
};

// ✅ HELPER: Serialize items ke notes (CLEAN BEFORE SAVE)
const serializeItemsToNotes = (
  items: Array<{ name: string; qty: number; price: number }>, 
  originalNotes?: string | null
): string | null => {
  //  LANGKAH PENTING: Hapus SEMUA tag items lama (valid ATAU rusak) SEBELUM menambah yang baru
  // Regex ini dirancang khusus untuk menangkap tag yang terpotong atau formatnya salah
  let base = (originalNotes || '')
    .replace(/\[items:[\s\S]*?\]/g, '')   // Hapus tag valid
    .replace(/\[items:[\s\S]*$/g, '')     // Hapus tag rusak/terpotong di akhir
    .replace(/\]\s*$/, '')                // Hapus kurung siku tutup yatim
    .replace(/^\]\s*/, '')                // Hapus kurung siku buka yatim
    .trim();
  
  if (items.length > 0) {
    try {
      const itemsJson = JSON.stringify(items);
      // Validasi ganda sebelum disimpan
      JSON.parse(itemsJson); 
      base = `${base} [items:${itemsJson}]`.trim();
    } catch (e) {
      console.error('❌ Gagal serialize items:', e);
      return base || null;
    }
  }
  
  return base || null;
};

// ✅ HELPER: Hitung total items (memoized)
const itemsTotal = useMemo(() => {
  const subtotal = transactionItems.reduce((sum, item) => sum + (item.qty * item.price), 0);
  if (includeTax && subtotal > 0) {
    const rate = taxRate === '10' ? 0.10 : 0.11;
    return Math.round(subtotal * (1 + rate));
  }
  return subtotal;
}, [transactionItems, includeTax, taxRate]);

// ✅ HITUNG PAJAK SAJA (untuk display)
const taxAmount = useMemo(() => {
  const subtotal = transactionItems.reduce((sum, item) => sum + (item.qty * item.price), 0);
  if (includeTax && subtotal > 0) {
    const rate = taxRate === '10' ? 0.10 : 0.11;
    return Math.round(subtotal * rate);
  }
  return 0;
}, [transactionItems, includeTax, taxRate]);

  // ✅ TAMBAHKAN INI: State untuk filter buku (Default: Semua buku terpilih)
const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);
  // ========== SUPABASE DATA ==========
const {
books, activeBook, transactions: rawTransactions, budgets: rawBudgets,
goals: rawGoals, recurring: rawRecurring, loading: dataLoading,
switchBook, createBook, renameBook, deleteBook,
addTransaction, updateTransaction, deleteTransaction,
addBudget, updateBudget, deleteBudget,
addGoal, updateGoal, deleteGoal,
addRecurring, updateRecurring, deleteRecurring,
goalContributions, addGoalContribution, updateGoalContribution, deleteGoalContribution, 
refresh// ✅ TAMBAHKAN BARIS INI
} = useSupabaseData(isFamilyMode);


// Map Supabase data → App types
const transactions: Transaction[] = rawTransactions.map(t => ({
  id: t.id, date: t.date, type: t.type, category: t.category,
  description: t.description, amount: t.amount, notes: t.notes || undefined, createdAt: t.created_at,
  book_id: t.book_id, payment_method: t.payment_method, // ✅ TAMBAHKAN BARIS INI
}));

const budgets: Budget[] = rawBudgets.map(b => ({
  id: b.id, category: b.category, limit: b.limit_amount,
  period: b.period as 'monthly' | 'yearly',
  description: b.description || undefined, // ✅ TAMBAHKAN INI
  createdAt: '',
  notified: {
    threshold50: b.notified_threshold_50,
    threshold80: b.notified_threshold_80,
    threshold100: b.notified_threshold_100,
  },
}));

const goals: FinancialGoal[] = rawGoals.map(g => ({
  id: g.id, name: g.name, icon: g.icon, targetAmount: g.target_amount,
  currentAmount: g.current_amount, deadline: g.deadline || undefined,
  monthlyContribution: g.monthly_contribution || undefined, createdAt: '',
}));

const recurringTransactions: RecurringTransaction[] = rawRecurring.map(r => ({
  id: r.id, name: r.name, amount: r.amount, type: r.type, category: r.category,
  frequency: r.frequency, nextDate: r.next_date, reminderDays: r.reminder_days, isActive: r.is_active,
}));

// ✅ SAFETY: Pastikan array tidak undefined
const safeTransactions = transactions || [];
const safeBudgets = budgets || [];
const safeGoals = goals || [];
const safeRecurring = recurringTransactions || [];

// ✅ EFFECT: Set isReady saat data sudah dimuat
useEffect(() => {
  if (!authLoading && !dataLoading && user && activeBook) {
    setIsReady(true);
  } else if (!user && !authLoading) {
    setIsReady(false);
  }
}, [authLoading, dataLoading, user, activeBook]);

// ✅ AUTO-UPDATE NOMINAL DARI RINCIAN
useEffect(() => {
  if (showItemDetails && transactionItems.length > 0 && itemsTotal > 0) {
    setFormData(prev => ({ ...prev, amount: itemsTotal.toString() }));
  }
}, [itemsTotal, showItemDetails, transactionItems.length]);


// State untuk Book Manager
const [showBookManager, setShowBookManager] = useState(false);
const [newBookName, setNewBookName] = useState('');
const [newBookIcon, setNewBookIcon] = useState('📗');
const [newBookColor, setNewBookColor] = useState('green');
const [editingBookId, setEditingBookId] = useState<string | null>(null);
const [editingBookName, setEditingBookName] = useState('');
  
  
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [activeMoreTab, setActiveMoreTab] = useState<MoreTab>('analisis');
  const [periodFilter, setPeriodFilter] = useState<'all' | 'today' | 'week' | 'month' | 'year' | 'custom'>('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  // ✅ STATE BARU: Search Query untuk Riwayat
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  // State untuk Budget
const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
const [viewingBudget, setViewingBudget] = useState<Budget | null>(null);

// State untuk Goals
const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null);
const [viewingGoal, setViewingGoal] = useState<FinancialGoal | null>(null);
const [viewingGoalHistory, setViewingGoalHistory] = useState<string | null>(null);
const [fundingGoalId, setFundingGoalId] = useState<string | null>(null);
const [fundingAmount, setFundingAmount] = useState('');
const [fundingDate, setFundingDate] = useState(format(new Date(), 'yyyy-MM-dd'));
const [fundingTime, setFundingTime] = useState(format(new Date(), 'HH:mm')); 
const [fundingNote, setFundingNote] = useState('');
const [fundingAsExpense, setFundingAsExpense] = useState(false);
const [editingContributionId, setEditingContributionId] = useState<string | null>(null);
const [editingContributionAmount, setEditingContributionAmount] = useState('');
const [editingContributionDate, setEditingContributionDate] = useState('');
const [editingContributionTime, setEditingContributionTime] = useState('');
const [editingContributionNote, setEditingContributionNote] = useState('');

// State untuk Recurring
const [editingRecurring, setEditingRecurring] = useState<RecurringTransaction | null>(null);
const [viewingRecurring, setViewingRecurring] = useState<RecurringTransaction | null>(null);

  const [viewingTransaction, setViewingTransaction] = useState<Transaction | null>(null);
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
    payment_method: 'cash',
  });
  const [budgetForm, setBudgetForm] = useState({ category: 'makanan', limit: '', description: '' });
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [goalForm, setGoalForm] = useState({ name: '', targetAmount: '', deadline: '', monthlyContribution: '', icon: '🎯' });
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [recurringForm, setRecurringForm] = useState({
    name: '', amount: '', type: 'expense' as 'income' | 'expense', category: 'utilitas',
    frequency: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'yearly',
    nextDate: format(new Date(), 'yyyy-MM-dd'), reminderDays: 3,
  });
  const [showRecurringForm, setShowRecurringForm] = useState(false);

  // ✅ REF UNTUK DROPDOWN KATEGORI
const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // ✅ TARUH DI SINI: Ref untuk mencegah notifikasi budget spam & error
const notifiedBudgetsRef = useRef<Set<string>>(new Set());
// ✅ STATE BARU: Month key untuk tracking bulan aktif (format: "2026-06")
const [currentMonthKey, setCurrentMonthKey] = useState(() => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
});

// ✅ AUTO-RESET NOTIFIKASI SAAT GANTI BULAN
useEffect(() => {
  const checkMonthChange = () => {
    const now = new Date();
    const newMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    if (newMonthKey !== currentMonthKey) {
      console.log(`📅 Bulan berganti: ${currentMonthKey} → ${newMonthKey}, reset notifikasi budget`);
      notifiedBudgetsRef.current.clear(); // 🔄 RESET SEMUA NOTIFIKASI
      setCurrentMonthKey(newMonthKey);
    }
  };
  
  // Cek setiap menit (untuk kasus user buka app melewati tengah malam)
  const interval = setInterval(checkMonthChange, 60000);
  
  // Cek juga saat window focus (user kembali ke app)
  const handleFocus = () => checkMonthChange();
  window.addEventListener('focus', handleFocus);
  
  return () => {
    clearInterval(interval);
    window.removeEventListener('focus', handleFocus);
  };
}, [currentMonthKey]);

 
/// ========== THEME ==========
useEffect(() => {
  if (theme === 'dark') document.documentElement.classList.add('dark');
  else document.documentElement.classList.remove('dark');
  localStorage.setItem('theme', theme);
}, [theme]);

// ✅ EFFECT UNTUK CHART READY (delay 100ms agar container ter-render dulu)
useEffect(() => {
  const timer = setTimeout(() => setChartReady(true), 100);
  return () => clearTimeout(timer);
}, []);

// ✅ CONSOLE LOG UNTUK DEBUG PAYMENT METHOD
useEffect(() => {
  console.log('💳 Payment Method berubah:', formData.payment_method);
}, [formData.payment_method]);

// ✅ AUTO-SAVE: Simpan state ke localStorage saat ada perubahan (DIPINDAHKAN KE ATAS)
useEffect(() => {
  const saveState = () => {
    localStorage.setItem('catelaran_state', JSON.stringify({
      activeBook: activeBook,
      isFamilyMode: isFamilyMode,
      theme: theme,
      timestamp: new Date().toISOString()
    }));
  };
  const timer = setTimeout(saveState, 1000);
  return () => clearTimeout(timer);
}, [activeBook, isFamilyMode, theme]);


// ✅ UBAH FUNGSI handlePayRecurring
const handlePayRecurring = async (r: RecurringTransaction) => {
  if (!window.confirm(`💰 Bayar "${r.name}" sebesar ${formatCurrency(r.amount)} sekarang?`)) {
    return;
  }
  
  const now = new Date();
  
  // ✅ LANGKAH 1: Catat transaksi
  const result = await addTransaction({
    date: now.toISOString().split('T')[0],
    type: r.type,
    category: r.category,
    description: r.name,
    amount: r.amount,
    notes: `[recurring:${r.id}]`,
    payment_method: 'cash',
  });
  
  if (result) {
    // ✅ LANGKAH 2: Update next_date dengan addMonths (handle end-of-month)
    const n = new Date(r.nextDate);
    let nextDate: string;
    
    switch (r.frequency) {
      case 'daily':
        n.setDate(n.getDate() + 1);
        nextDate = n.toISOString().split('T')[0];
        break;
      case 'weekly':
        n.setDate(n.getDate() + 7);
        nextDate = n.toISOString().split('T')[0];
        break;
      case 'monthly':
        // ✅ PAKAI addMonths YANG HANDLE END-OF-MONTH
        nextDate = format(addMonths(n, 1), 'yyyy-MM-dd');
        break;
      case 'yearly':
        n.setFullYear(n.getFullYear() + 1);
        nextDate = n.toISOString().split('T')[0];
        break;
      default:
        nextDate = n.toISOString().split('T')[0];
    }
    
    await updateRecurring(r.id, {
      next_date: nextDate,
    });
    
    notify.success(`✅ "${r.name}" tercatat & jadwal diperbarui!`);
    
    if (refresh) await refresh();
  }
};

  /// ========== BUDGET ALERTS (FIXED - 3 THRESHOLD + MONTHLY RESET) ==========
useEffect(() => {
  if (budgets.length === 0) return;
  
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  
  // Hitung spending per kategori untuk bulan ini
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
    
    // ✅ KEY UNIK: Sertakan monthKey agar notifikasi bisa muncul lagi di bulan berikutnya
    const key100 = `${b.id}-${currentMonthKey}-100`;
    const key80 = `${b.id}-${currentMonthKey}-80`;
    const key50 = `${b.id}-${currentMonthKey}-50`;
    
    // ✅ THRESHOLD 100% - Prioritas tertinggi
    if (pct >= 100 && !notifiedBudgetsRef.current.has(key100)) {
      toast(`${catName} sudah ${pct.toFixed(0)}%! 🚨 Melebihi budget!`, {
        duration: 5000,
        icon: '🚨',
        style: { background: '#dc2626', color: '#fff', fontSize: '14px' },
      });
      notifiedBudgetsRef.current.add(key100);
      notifiedBudgetsRef.current.add(key80); // Jangan notif 80% lagi jika sudah 100%
      notifiedBudgetsRef.current.add(key50); // Jangan notif 50% lagi
    } 
    // ✅ THRESHOLD 80% - Peringatan
    else if (pct >= 80 && pct < 100 && !notifiedBudgetsRef.current.has(key80)) {
      toast(`${catName} sudah ${pct.toFixed(0)}%! ⚠️ Hampir habis!`, {
        duration: 4000,
        icon: '⚠️',
        style: { background: '#f59e0b', color: '#fff', fontSize: '14px' },
      });
      notifiedBudgetsRef.current.add(key80);
      notifiedBudgetsRef.current.add(key50); // Jangan notif 50% lagi
    }
    // ✅ THRESHOLD 50% - Info awal (BARU!)
    else if (pct >= 50 && pct < 80 && !notifiedBudgetsRef.current.has(key50)) {
      toast(`${catName} sudah ${pct.toFixed(0)}% terpakai 💡`, {
        duration: 3000,
        icon: '💡',
        style: { background: '#3b82f6', color: '#fff', fontSize: '14px' },
      });
      notifiedBudgetsRef.current.add(key50);
    }
  });
}, [transactions, budgets, currentMonthKey]); // ✅ Tambahkan currentMonthKey sebagai dependency

  // ========== COMPUTED ==========
  const monthlyIncome = useMemo(() => {
    const now = new Date();
    return transactions.filter(t => {
    const d = parseLocalDate(t.date);
    return t.type === 'income' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((s, t) => s + t.amount, 0);
  }, [transactions]);

  const monthlyExpense = useMemo(() => {
    const now = new Date();
    return transactions.filter(t => {
      const d = parseLocalDate(t.date);
      return t.type === 'expense' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((s, t) => s + t.amount, 0);
  }, [transactions]);

    const savings = useMemo(() => monthlyIncome - monthlyExpense, [monthlyIncome, monthlyExpense]);

  // ✅ HITUNG PENGELUARAN BERDASARKAN METODE BAYAR (BULAN INI) - 3 KATEGORI
const paymentSummary = useMemo(() => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  
  let tunaiTotal = 0;
  let qrisTotal = 0;
  let transferTotal = 0;
  
  transactions.forEach(t => {
  if (t.type !== 'expense') return;
  const d = parseLocalDate(t.date);
  if (d < monthStart || d > monthEnd) return;
    
    if (t.payment_method === 'qris') {
      qrisTotal += t.amount;
    } else if (t.payment_method === 'transfer') {
      transferTotal += t.amount;
    } else {
      tunaiTotal += t.amount; // Default ke tunai jika undefined (data lama)
    }
  });
  
  const total = tunaiTotal + qrisTotal + transferTotal;
  const tunaiPct = total > 0 ? (tunaiTotal / total) * 100 : 0;
  const qrisPct = total > 0 ? (qrisTotal / total) * 100 : 0;
  const transferPct = total > 0 ? (transferTotal / total) * 100 : 0;
  
  return { tunaiTotal, qrisTotal, transferTotal, total, tunaiPct, qrisPct, transferPct };
}, [transactions]);

  const monthlySpending = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const s: Record<string, number> = {};
    transactions.forEach(t => {
    const d = parseLocalDate(t.date);
    if (t.type === 'expense' && d >= start && d <= end) s[t.category] = (s[t.category] || 0) + t.amount;
    });
    return s;
  }, [transactions]);

  // ✅ SORT SEKALI DI SINI, AGAR CHART & LEGEND PAKAI URUTAN SAMA
const pieData = useMemo(() =>
  Object.entries(monthlySpending)
    .map(([k, v]) => ({
      name: expenseCategories[k]?.shortName || k,
      fullName: expenseCategories[k]?.name || k,
      icon: expenseCategories[k]?.icon || '',
      value: v,
    }))
    .sort((a, b) => b.value - a.value), // ✅ SORT DESCENDING
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
    const d = parseLocalDate(t.date);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (m[k]) { if (t.type === 'income') m[k].income += t.amount; else m[k].expense += t.amount; }
    });
    return Object.entries(m).map(([k, v]) => ({
      name: format(new Date(k + '-01'), 'MMM', { locale: id }),
      Pemasukan: v.income, Pengeluaran: v.expense,
    }));
  }, [transactions]);

  // ✅ DATA STACKED BAR CHART: METODE PEMBAYARAN 6 BULAN (3 KATEGORI)
const paymentBarData = useMemo(() => {
  const now = new Date();
  const m: Record<string, { tunai: number; qris: number; transfer: number }> = {};
  
  // Inisialisasi 6 bulan terakhir
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    m[k] = { tunai: 0, qris: 0, transfer: 0 };
  }
  
  // Isi data dari transaksi pengeluaran
  transactions.forEach(t => {
    if (t.type !== 'expense') return;
    const d = parseLocalDate(t.date);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (m[k]) {
      if (t.payment_method === 'qris') {
        m[k].qris += t.amount;
      } else if (t.payment_method === 'transfer') {
        m[k].transfer += t.amount;
      } else {
        m[k].tunai += t.amount; // Default ke tunai jika undefined
      }
    }
  });
  
  return Object.entries(m).map(([k, v]) => ({
    name: format(new Date(k + '-01'), 'MMM', { locale: id }),
    Tunai: v.tunai,
    QRIS: v.qris,
    Transfer: v.transfer,
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

  // ========== HANDLERS ==========
  const handleNominalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, amount: e.target.value.replace(/\D/g, '') }));
  };

  const syncToSheets = async (t: Transaction) => {
  if (!scriptUrl) return false;
  try {
    const response = await fetch(scriptUrl, {
      method: 'POST',
      // ✅ HAPUS mode: 'no-cors' - Apps Script mendukung CORS
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        date: t.date, 
        type: t.type, 
        category: t.category, 
        description: t.description, 
        amount: t.amount, 
        notes: t.notes || '' 
      }),
    });
    
    // ✅ VERIFIKASI response
    if (response.ok) {
      console.log('✅ Synced to Google Sheets');
      return true;
    } else {
      console.error('❌ Sync failed:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Sync error:', error);
    return false;
  }
};

  const handleAddTransaction = async () => {
  if (!formData.description || !formData.amount) { notify.error('Deskripsi & nominal wajib diisi!'); return; }
    // ✅ Gabungkan items + tax info ke notes
let finalNotes = serializeItemsToNotes(transactionItems, formData.notes);

// Tambah tax info jika includeTax aktif
if (includeTax && transactionItems.length > 0) {
  finalNotes = (finalNotes || '') + ` [tax:${taxRate}%]`.trim();
}

// ✅ Pastikan format tanggal YYYY-MM-DD tanpa timezone
const payload = {
  date: formData.date, // Sudah format YYYY-MM-DD dari input
  type: formData.type, 
  category: formData.category,
  description: formData.description, 
  amount: parseInt(formData.amount), 
  notes: finalNotes,
  payment_method: formData.payment_method,
};
    if (editingId) {
      const result = await updateTransaction(editingId, payload);
      if (result) { setEditingId(null); notify.success('Transaksi diupdate! ☁️'); }
    } else {
      const result = await addTransaction(payload);
      if (result) {
        notify.success('Transaksi ditambahkan! ☁️');
        if (scriptUrl) syncToSheets({ ...result, syncedToSheets: false } as any);
      }
    }
    // ✅ Reset termasuk items
    setFormData({ date: new Date().toISOString().split('T')[0], type: 'expense', category: 'makanan', description: '', amount: '', notes: '', payment_method: 'cash' });
    setTransactionItems([]);
    setShowItemDetails(false);
    setIncludeTax(false);
    setTaxRate('11');
    setActiveTab('history');
};

 const handleDelete = async (id: string) => {
  if (!window.confirm('⚠️ Hapus transaksi ini?\n\nData tidak dapat dikembalikan.')) return;
  
  // ✅ LANGKAH 1: Cari transaksi yang akan dihapus untuk cek apakah terkait Goal
  const transactionToDelete = transactions.find(t => t.id === id);
  
  if (transactionToDelete) {
    // ✅ LANGKAH 2: Cek apakah transaksi ini adalah "Tabungan Goal" dengan tag [ref:xxx]
    const refMatch = transactionToDelete.notes?.match(/\[ref:([a-zA-Z0-9-]+)\]/);
    
    if (refMatch && refMatch[1]) {
      const contributionId = refMatch[1];
      
      // ✅ LANGKAH 3: Hapus goal contribution terkait (ini akan otomatis kurangi current_amount)
      const contribDeleted = await deleteGoalContribution(contributionId);
      
      if (contribDeleted) {
        notify.success('Transaksi & riwayat tabungan Goal berhasil dihapus 🗑️');
        // ✅ Refresh agar progress bar langsung update
        if (refresh) await refresh();
        return; // Keluar karena deleteGoalContribution sudah hapus transaksi juga
      }
    }
  }
  
  // ✅ LANGKAH 4: Jika bukan transaksi Goal, hapus seperti biasa
  const ok = await deleteTransaction(id);
  if (ok) {
    notify.success('Transaksi berhasil dihapus 🗑️');
  }
};

  const handleEdit = (t: Transaction) => {
  const extractedItems = parseItemsFromNotes(t.notes);
  setFormData({
    date: t.date,
    type: t.type,
    category: t.category,
    description: t.description,
    amount: t.amount.toString(),
    notes: (t.notes || '').replace(/\[items:[\s\S]*?\]/g, '').replace(/\[tax:[\s\S]*?\]/g, '').trim(),
    payment_method: t.payment_method || 'cash'
  });
  setTransactionItems(extractedItems);
  setShowItemDetails(extractedItems.length > 0);
  
  // ✅ LOAD TAX INFO DARI NOTES (jika ada)
  const taxMatch = t.notes?.match(/\[tax:(\d+)%\]/);
  if (taxMatch) {
    setIncludeTax(true);
    setTaxRate(taxMatch[1] as '10' | '11');
  } else {
    setIncludeTax(false);
    setTaxRate('11');
  }
  
  setEditingId(t.id);
  setActiveTab('input');
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
  const filteredTransactions = useMemo(() => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let startDate: Date | null = null;
  let endDate: Date | null = null;
  
  switch (periodFilter) {
    case 'today':
      startDate = today;
      endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
      break;
    case 'week':
      const dayOfWeek = today.getDay();
      const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      startDate = new Date(today);
      startDate.setDate(today.getDate() - diffToMonday);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;
    case 'custom':
      if (customStartDate) startDate = new Date(customStartDate);
      if (customEndDate) endDate = new Date(customEndDate + 'T23:59:59.999');
      break;
    case 'all':
    default:
      startDate = null;
      endDate = null;
  }
  
      return transactions
    .filter(t => t != null) // ✅ SAFETY: Buang data null/rusak agar tidak crash
    .filter(t => {
  const d = parseLocalDate(t.date);
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;
      return true;
    })
    
        // ✅ FILTER BUKU (DIPERBAIKI)
    .filter(t => {
      if (!isFamilyMode) return true; 
      // Jika array kosong ATAU panjangnya sama dengan total buku, tampilkan semua
      if (selectedBookIds.length === 0 || selectedBookIds.length === books.length) return true;
      return selectedBookIds.includes(t.book_id);
    })
    
        .filter(t => !filterCategory || t.category === filterCategory)
    // ✅ FILTER SEARCH (CASE & SPACE INSENSITIVE)
    .filter(t => {
      if (!searchQuery) return true;
      
      // Normalisasi: huruf kecil & hapus semua spasi
      const q = searchQuery.toLowerCase().replace(/\s+/g, '');
      if (!q) return true;

      const targetDesc = (t.description || '').toLowerCase().replace(/\s+/g, '');
      const targetNotes = (t.notes || '').toLowerCase().replace(/\s+/g, '');
      const targetCat = (incomeCategories[t.category]?.name || expenseCategories[t.category]?.name || t.category || '').toLowerCase().replace(/\s+/g, '');
      const targetPay = (paymentMethods[t.payment_method || 'cash']?.name || '').toLowerCase().replace(/\s+/g, '');

      return targetDesc.includes(q) || targetNotes.includes(q) || targetCat.includes(q) || targetPay.includes(q);
    })
    .sort((a, b) => {
    // ✅ PRIORITAS: Urutkan berdasarkan tanggal transaksi (date)
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();

    // Primary sort: tanggal transaksi (terbaru di atas)
    if (dateB !== dateA) return dateB - dateA;

    // Secondary sort: jika tanggal sama, urutkan berdasarkan waktu input (createdAt)
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeB - timeA;
    });
    
}, [transactions, periodFilter, customStartDate, customEndDate, filterCategory, isFamilyMode, selectedBookIds, books, searchQuery]);
// ⚠️ PENTING: Pastikan 3 variabel terakhir (isFamilyMode, selectedBookIds, books) ada di dalam kurung siku ini!
  

  const getCategories = () => formData.type === 'income' ? incomeCategories : expenseCategories;
  const currentCategory = getCategories()[formData.category] || expenseCategories['makanan'];
// ✅ JOIN SEMUA CONTOH DESKRIPSI DENGAN KOMA
const currentExamples = categoryExamples[formData.category]?.join(', ') || '';
  const handleAddBudget = async () => {
  const limit = parseNominal(budgetForm.limit);
  if (limit <= 0) { notify.error('Nominal tidak valid'); return; }
  if (budgets.some(b => b.category === budgetForm.category)) { notify.error('Budget sudah ada'); return; }
  const result = await addBudget({ 
    category: budgetForm.category, 
    limit_amount: limit,
    description: budgetForm.description.trim() || undefined // ✅ TAMBAHKAN INI
  });
  if (result) {
    notify.success(`Budget ${expenseCategories[budgetForm.category].name} ditambahkan`);
    setBudgetForm({ category: 'makanan', limit: '', description: '' }); // ✅ RESET description
    setShowBudgetForm(false);
  }
};

const handleEditBudget = (budget: Budget) => {
  setEditingBudget(budget);
  setBudgetForm({
    category: budget.category,
    limit: budget.limit.toString(),
    description: budget.description || '' // ✅ TAMBAHKAN INI
  });
  setShowBudgetForm(true);
};

const handleViewBudget = (budget: Budget) => {
  setViewingBudget(budget);
};

const handleUpdateBudget = async () => {
  try {
    if (!editingBudget || !budgetForm.category || !budgetForm.limit) {
      notify.error('Data tidak lengkap');
      return;
    }
    const limit = parseNominal(budgetForm.limit);
    if (limit <= 0) { 
      notify.error('Nominal tidak valid'); 
      return; 
    }
    const result = await updateBudget(editingBudget.id, {
  category: budgetForm.category,
  limit_amount: limit,
  description: budgetForm.description.trim() || undefined // ✅ TAMBAHKAN INI
  });
  if (result) {
  notify.success('Budget berhasil diupdate');
  setEditingBudget(null);
  setShowBudgetForm(false);
      setBudgetForm({ category: 'makanan', limit: '', description: '' });
    } else {
      notify.error('Gagal memperbarui budget. Cek koneksi atau RLS Policy.');
    }
  } catch (error) {
    console.error('Budget Update Error:', error);
    notify.error('Terjadi kesalahan saat memperbarui budget.');
  }
};

  const handleAddGoal = async () => {
  if (!goalForm.name || !goalForm.targetAmount) { notify.error('Nama & target wajib'); return; }
  const result = await addGoal({
    name: goalForm.name, icon: goalForm.icon, target_amount: parseNominal(goalForm.targetAmount),
    deadline: goalForm.deadline || undefined,
    monthly_contribution: goalForm.monthlyContribution ? parseNominal(goalForm.monthlyContribution) : undefined,
  });
  if (result) {
    notify.success('Goal ditambahkan!');
    setGoalForm({ name: '', targetAmount: '', deadline: '', monthlyContribution: '', icon: '🎯' });
    setShowGoalForm(false);
  }
};

const handleEditGoal = (goal: FinancialGoal) => {
  setEditingGoal(goal);
  setGoalForm({
    name: goal.name,
    targetAmount: goal.targetAmount.toString(),
    deadline: goal.deadline || '',
    monthlyContribution: goal.monthlyContribution ? goal.monthlyContribution.toString() : '',
    icon: goal.icon
  });
  setShowGoalForm(true);
};

const handleViewGoal = (goal: FinancialGoal) => {
  setViewingGoal(goal);
};

const handleUpdateGoal = async () => {
  if (!editingGoal || !goalForm.name || !goalForm.targetAmount) { 
    notify.error('Data tidak lengkap'); 
    return; 
  }
  const result = await updateGoal(editingGoal.id, {
    name: goalForm.name,
    icon: goalForm.icon,
    target_amount: parseInt(goalForm.targetAmount),
    deadline: goalForm.deadline || undefined,
    monthly_contribution: goalForm.monthlyContribution ? parseInt(goalForm.monthlyContribution) : undefined,
  });
  if (result) {
    notify.success('Goal berhasil diupdate');
    setEditingGoal(null);
    setShowGoalForm(false);
    setGoalForm({ name: '', targetAmount: '', deadline: '', monthlyContribution: '', icon: '🎯' });
  }
};

// Helper untuk mencari transaksi yang terhubung dengan riwayat tabungan
const findLinkedTransaction = (contributionId: string, amount: number, dateStr: string) => {
    return transactions.find(t => 
        t.type === 'expense' && 
        t.category === 'investasi_exp' &&
        (
            (t.notes && t.notes.includes(`[ref:${contributionId}]`)) ||
            (t.amount === amount && t.date === dateStr.substring(0, 10)) // Fallback untuk data lama
        )
    );
};

const handleAddFundsToGoal = async () => {
  // ✅ VALIDASI WAJIB
  if (!fundingGoalId || !fundingAmount) {
    notify.error('Nominal wajib diisi');
    return;
  }
  
  // ✅ VALIDASI TANGGAL & JAM
  if (!fundingDate || !fundingTime) {
    notify.error('Tanggal & jam wajib diisi');
    return;
  }
  
  const amount = parseNominal(fundingAmount);
  if (amount <= 0) {
    notify.error('Nominal tidak valid');
    return;
  }
  
  // ✅ GABUNGKAN TANGGAL + WAKTU (AMAN KARENA SUDAH DIVALIDASI)
  const dateTimeStr = new Date(`${fundingDate}T${fundingTime}:00`).toISOString();

  // ✅ FIX 2: Simpan ke riwayat kontribusi dulu
  const result = await addGoalContribution({
    goal_id: fundingGoalId,
    amount,
    date: dateTimeStr,
    note: fundingNote.trim() || undefined,
  });

  if (result) {
    

    // Opsional: Catat sebagai transaksi pengeluaran jika dicentang
if (fundingAsExpense) {
  const goal = goals.find(g => g.id === fundingGoalId);
  await addTransaction({
    date: fundingDate,
    type: 'expense',
    category: 'investasi_exp',
    description: `Tabungan Goal: ${goal?.name || 'Goal'}${fundingNote ? ` - ${fundingNote}` : ''}`,
    amount,
    // ✅ PENTING: Sisipkan ID Kontribusi sebagai referensi agar bisa disinkronkan saat hapus/edit
    notes: `Auto dari Goal "${goal?.name}" [ref:${result.id}]`, 
  });
  notify.success(`+${formatCurrency(amount)} ditambahkan & tercatat sebagai pengeluaran `);
} else {
  notify.success(`+${formatCurrency(amount)} ditambahkan ke ${goals.find(g => g.id === fundingGoalId)?.name} 🎉`);
}

    // ✅ Refresh data agar progress bar & riwayat langsung sinkron
    if (refresh) await refresh();
// Reset Form
    setFundingGoalId(null);
    setFundingAmount('');
    setFundingDate(format(new Date(), 'yyyy-MM-dd'));
    setFundingTime(format(new Date(), 'HH:mm'));
    setFundingNote('');
    setFundingAsExpense(false);
  }
};

const handleUpdateContribution = async () => {
  // ✅ VALIDASI WAJIB
  if (!editingContributionId || !editingContributionAmount) {
    notify.error('Nominal wajib diisi');
    return;
  }
  
  // ✅ VALIDASI TANGGAL & JAM
  if (!editingContributionDate || !editingContributionTime) {
    notify.error('Tanggal & jam wajib diisi');
    return;
  }
  
  const amount = parseNominal(editingContributionAmount);
  if (amount <= 0) {
    notify.error('Nominal tidak valid');
    return;
  }
  
  const oldContribution = goalContributions.find(c => c.id === editingContributionId);
  
  // ✅ GABUNGKAN TANGGAL + WAKTU (AMAN KARENA SUDAH DIVALIDASI)
  const dateTimeStr = new Date(`${editingContributionDate}T${editingContributionTime}:00`).toISOString();
    
    
    const result = await updateGoalContribution(editingContributionId, {
        amount,
        date: dateTimeStr,
        note: editingContributionNote.trim() || undefined,
    });
    if (result) {
        notify.success('Riwayat berhasil diperbarui ✅');
        
        // ✅ SINKRONISASI: Update transaksi terkait jika ada
        const goal = goals.find(g => g.id === result.goal_id);
        if (goal && oldContribution) {
            const linkedTx = findLinkedTransaction(
                editingContributionId, 
                oldContribution.amount, 
                oldContribution.date
            );
            
            if (linkedTx) {
                await updateTransaction(linkedTx.id, {
                    amount,
                    date: editingContributionDate,
                    description: `Tabungan Goal: ${goal.name}${editingContributionNote ? ` - ${editingContributionNote}` : ''}`,
                    notes: `Auto dari Goal "${goal.name}" [ref:${editingContributionId}]`,
                });
            }
        }
        
        // ✅ PENTING: Refresh semua data dari Supabase agar progress bar sinkron
        if (refresh) await refresh(); 

        setEditingContributionId(null);

    setEditingContributionAmount('');
    setEditingContributionDate('');
    setEditingContributionTime('');
    setEditingContributionNote('');
  }
};

  const handleAddRecurring = async () => {
  if (!recurringForm.name || !recurringForm.amount) { notify.error('Nama & nominal wajib'); return; }
  const result = await addRecurring({
    name: recurringForm.name, amount: parseNominal(recurringForm.amount),
    type: recurringForm.type, category: recurringForm.category,
    frequency: recurringForm.frequency, next_date: recurringForm.nextDate,
    reminder_days: recurringForm.reminderDays, is_active: true,
  });
  if (result) {
    notify.success('Recurring ditambahkan');
    setRecurringForm({ name: '', amount: '', type: 'expense', category: 'utilitas', frequency: 'monthly', nextDate: format(new Date(), 'yyyy-MM-dd'), reminderDays: 3 });
    setShowRecurringForm(false);
  }
};

const handleEditRecurring = (recurring: RecurringTransaction) => {
  setEditingRecurring(recurring);
  setRecurringForm({
    name: recurring.name,
    amount: recurring.amount.toString(),
    type: recurring.type,
    category: recurring.category,
    frequency: recurring.frequency,
    nextDate: recurring.nextDate,
    reminderDays: recurring.reminderDays
  });
  setShowRecurringForm(true);
};

const handleViewRecurring = (recurring: RecurringTransaction) => {
  setViewingRecurring(recurring);
};

const handleUpdateRecurring = async () => {
  try {
    if (!editingRecurring || !recurringForm.name || !recurringForm.amount) {
      notify.error('Data tidak lengkap');
      return;
    }
    const result = await updateRecurring(editingRecurring.id, {
      name: recurringForm.name,
      amount: parseNominal(recurringForm.amount),
      type: recurringForm.type,
      category: recurringForm.category,
      frequency: recurringForm.frequency,
      next_date: recurringForm.nextDate,
      reminder_days: recurringForm.reminderDays,
    });
    if (result) {
      notify.success('Recurring berhasil diupdate');
      setEditingRecurring(null);
      setShowRecurringForm(false);
      setRecurringForm({ name: '', amount: '', type: 'expense', category: 'utilitas', frequency: 'monthly', nextDate: format(new Date(), 'yyyy-MM-dd'), reminderDays: 3 });
    } else {
      notify.error('Gagal memperbarui recurring. Cek koneksi atau RLS Policy.');
    }
  } catch (error) {
    console.error('Recurring Update Error:', error);
    notify.error('Terjadi kesalahan saat memperbarui recurring.');
  }
};

 const handleExport = () => {
  const data = { 
    books,                                    // ✅ DAFTAR BUKU
    transactions, 
    budgets, 
    goals, 
    recurringTransactions, 
    goalContributions,                        // ✅ RIWAYAT TABUNGAN GOAL
    exportDate: new Date().toISOString(),
    appVersion: '1.0.0',                      // ✅ UNTUK KOMPATIBILITAS KE DEPAN
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; 
  a.download = `catat-keuangan-backup-${new Date().toISOString().split('T')[0]}.json`; 
  a.click();
  URL.revokeObjectURL(url);                   // ✅ CLEANUP MEMORY
  notify.success('✅ Backup lengkap berhasil di-download!');
  };

  const handleClearAll = async () => {
  if (!activeBook) {
    notify.error('Pilih buku terlebih dahulu!');
    return;
  }
  
  // ✅ VALIDASI: Cek apakah buku ini milik user di mode keluarga
  if (isFamilyMode) {
    const isOwner = books.find(b => b.id === activeBook.id)?.user_id === user?.id;
    if (!isOwner) {
      notify.error('Anda tidak memiliki izin untuk menghapus buku ini!');
      return;
    }
  }
  
  if (window.confirm(`⚠️ Yakin hapus SEMUA TRANSAKSI di buku "${activeBook.name}"?\n\n(Buku lain & data Goals/Budget/Auto akan tetap aman).`)) {
    try {
      // ✅ GUNAKAN METHOD DARI HOOK (bukan direct supabase call)
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('book_id', activeBook.id);
      
      if (error) {
        console.error('Supabase Delete Error:', error);
        notify.error('Gagal menghapus. Pastikan RLS Delete Policy untuk transactions sudah aktif.');
      } else {
        notify.success(`Transaksi di "${activeBook.name}" berhasil dibersihkan! 🗑️`);
        // ✅ REFRESH DATA tanpa reload halaman
        if (refresh) await refresh();
      }
    } catch (error) {
      console.error('System Error:', error);
      notify.error('Terjadi kesalahan sistem saat menghapus data.');
    }
  }
};

  const isDark = theme === 'dark';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 11) return 'Pagi';
    if (hour < 15) return 'Siang';
    if (hour < 18) return 'Sore';
    return 'Malam';
  };

  const getGreetingEmoji = () => {
    const hour = new Date().getHours();
    if (hour < 11) return '🌅';
    if (hour < 15) return '☀️';
    if (hour < 18) return '🌇';
    return '🌙';
  };

  const getMotivationalQuote = () => {
    const quotes = [
      'Catat pengeluaranmu hari ini, masa depanmu berterima kasih! 💰',
      'Setiap rupiah yang dicatat adalah langkah menuju kebebasan finansial',
      'Kontrol uangmu, atau uang yang akan mengontrolmu',
      'Financial freedom dimulai dari kebiasaan kecil hari ini',
      'Tabungan kecil hari ini, senyum lebar di masa depan',
      'Investasi terbaik adalah investasi pada diri sendiri',
    ];
    return quotes[new Date().getDate() % quotes.length];
  };

  // Chart helpers
  const renderCustomizedLabel = (props: any) => {
    const { x, y, value } = props;
    const total = pieData.reduce((sum, d) => sum + d.value, 0);
    const percentage = total > 0 ? ((value / total) * 100).toFixed(0) : 0;
    if (parseInt(percentage) < 8) return null;
    return (
      <text x={x} y={y} fill={isDark ? '#fff' : '#1e293b'} textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="700" style={{ textShadow: isDark ? '0 1px 2px rgba(0,0,0,0.8)' : '0 1px 2px rgba(255,255,255,0.8)' }}>{percentage}%</text>
    );
  };

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


useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (!target.closest('.relative')) {
      setIsCategoryDropdownOpen(false);
      setIsHistoryCategoryDropdownOpen(false); // ✅ Tutup dropdown history juga
      setIsBudgetCategoryDropdownOpen(false); // ✅ TAMBAHKAN
      setIsRecurringCategoryDropdownOpen(false); // ✅ TAMBAHKAN
      setIsRecurringFrequencyDropdownOpen(false); // ✅ TAMBAHKAN
      setShowBookManager(false);
    }
  };
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, []);



// ✅ DEBUG LOG (Taruh di dalam komponen utama)
useEffect(() => {
  console.log('📊 Loading States:', {
    authLoading,
    dataLoading,
    isReady,
    hasUser: !!user,
    hasActiveBook: !!activeBook,
    transactionCount: transactions.length,
  });
}, [authLoading, dataLoading, isReady, user, activeBook, transactions.length]);



// ✅ KODE BARU
if (!user && !authLoading) return <AuthScreen />;

// ✅ TIMEOUT: Jika loading terlalu lama, tampilkan opsi reset
if (loadingTimeout && (authLoading || dataLoading || !isReady)) {
  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${
      theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'
    }`}>
      <div className={`max-w-sm w-full rounded-2xl p-6 shadow-xl text-center ${
        theme === 'dark' ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'
      }`}>
        <div className="text-5xl mb-4 animate-bounce">⏳</div>
        <h2 className="text-lg font-bold mb-2">Loading Terlalu Lama</h2>
        <p className={`text-sm mb-4 ${
          theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
        }`}>
          Aplikasi kesulitan memuat data. Coba muat ulang atau reset cache.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="w-full bg-blue-500 text-white py-3 rounded-xl font-semibold mb-2 active:scale-95"
        >
          🔄 Muat Ulang
        </button>
        <button
          onClick={() => {
            localStorage.clear();
            window.location.reload();
          }}
          className={`w-full py-3 rounded-xl font-semibold active:scale-95 ${
            theme === 'dark' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'
          }`}
        >
          🗑️ Hapus Cache & Muat Ulang
        </button>
      </div>
    </div>
  );
}

if (user && (authLoading || dataLoading || !isReady || !activeBook)) {
  return <SplashScreen isDark={theme === 'dark'} />;  // ✅ Pass isDark
}


  // ✅ MAIN RENDER - FIXED!
  return (
    <ErrorBoundary isDark={theme === 'dark'}>
    <div className={`${isDark ? 'dark' : ''}`}>
      <div className="min-h-[100dvh] bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white transition-colors">
        <Toaster position="top-center" />
        
        {/* HEADER */}
        <header 
  className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 sticky top-0 z-20 shadow-sm"
  style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)', paddingBottom: '12px' }}>
  <div className="max-w-4xl mx-auto">
    {/* Row 1: Book Switcher + User Info */}
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2 flex-1 min-w-0">
  {/* Book Switcher Button */}
  {!isFamilyMode && (
    <button
      onClick={() => setShowBookManager(!showBookManager)}
      className="flex items-center gap-1.5 bg-gradient-to-br from-blue-500 to-purple-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-md active:scale-95 transition-transform flex-shrink-0"
    >
      <span className="text-base">{activeBook?.icon || '📘'}</span>
      <span className="truncate max-w-[120px]">{activeBook?.name || 'Pilih Buku'}</span>
      <ChevronRight className={`w-3 h-3 transition-transform ${showBookManager ? 'rotate-90' : ''}`} />
    </button>
  )}

  {/* ✅ MODE KELUARGA TOGGLE */}
  <button
    onClick={() => {
      setIsFamilyMode(!isFamilyMode);
      if (!isFamilyMode) setShowBookManager(false); // Tutup book manager saat masuk mode keluarga
    }}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-md active:scale-95 transition-all flex-shrink-0 ${
      isFamilyMode
        ? 'bg-gradient-to-br from-pink-500 to-rose-500 text-white ring-2 ring-pink-300 dark:ring-pink-700'
        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
    }`}
  >
    <span className="text-base">👨‍👩‍👧</span>
    <span className="hidden sm:inline">{isFamilyMode ? 'Mode Keluarga' : 'Keluarga'}</span>
  </button>
</div>
      
      {/* User Info + Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="text-right block">
          <h1 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
            Halo, {profile?.full_name?.split(' ')[0] || 'User'}👋
          </h1>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}
          </p>
        </div>
        <button
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center active:scale-95"
        >
          {isDark ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>
      </div>
    </div>

    {/* Row 2: Book Manager Panel (Collapsible) */}
    {showBookManager && (
      <div className="relative bg-slate-50 dark:bg-slate-900 rounded-xl p-3 mt-2 border border-slate-200 dark:border-slate-700 animate-in slide-in-from-top-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">📚 Kelola Buku</h3>
          <button onClick={() => setShowBookManager(false)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Book List */}
        <div className="space-y-1.5 mb-3 max-h-48 overflow-y-auto">
          {books.map(book => (
            <div
              key={book.id}
              className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
                activeBook?.id === book.id
                  ? 'bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <button
                onClick={() => { switchBook(book); setShowBookManager(false); }}
                className="flex-1 flex items-center gap-2 text-left min-w-0"
              >
                <span className="text-lg">{book.icon}</span>
                <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
                  {book.name}
                </span>
                {book.is_default && (
                  <span className="text-[9px] bg-blue-500 text-white px-1.5 py-0.5 rounded-full">Utama</span>
                )}
              </button>
              {!book.is_default && (
                <div className="flex gap-1">
                  <button
                    onClick={() => { setEditingBookId(book.id); setEditingBookName(book.name); }}
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                  >
                    <Edit2 className="w-3 h-3 text-blue-500" />
                  </button>
                  <button
                    onClick={() => { 
                    if (window.confirm(`⚠️ Hapus buku "${book.name}"?\n\nSemua transaksi di buku ini juga akan hilang!`)) {
                      deleteBook(book.id);
                    }
                  }}
                    className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                  >
                    <Trash2 className="w-3 h-3 text-red-500" />
                  </button>
                </div>
              )}
              {book.is_default && (
                <button
                  onClick={() => { setEditingBookId(book.id); setEditingBookName(book.name); }}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                >
                  <Edit2 className="w-3 h-3 text-blue-500" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Edit Book Name */}
        {editingBookId && (
          <div className="bg-white dark:bg-slate-800 rounded-lg p-2 mb-2 border border-blue-300 dark:border-blue-700">
            <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1">✏️ Rename Buku</p>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={editingBookName}
                onChange={e => setEditingBookName(e.target.value)}
                className="flex-1 bg-slate-100 dark:bg-slate-700 rounded px-2 py-1 text-xs text-slate-900 dark:text-white"
                autoFocus
              />
              <button
                onClick={async () => {
                  if (editingBookName.trim()) {
                    await renameBook(editingBookId, editingBookName.trim());
                    setEditingBookId(null);
                    setEditingBookName('');
                  }
                }}
                className="bg-green-500 text-white px-2 py-1 rounded text-xs font-semibold"
              >
                ✓
              </button>
              <button
                onClick={() => { setEditingBookId(null); setEditingBookName(''); }}
                className="bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-white px-2 py-1 rounded text-xs"
              >
                ✗
              </button>
            </div>
          </div>
        )}

        {/* Create New Book */}
        {books.length < 10 && (
          <div className="bg-white dark:bg-slate-800 rounded-lg p-2 border border-slate-200 dark:border-slate-700">
            <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5">➕ Buat Buku Baru</p>
            <div className="flex gap-1 mb-1.5 flex-wrap">
              {['📘', '📗', '📕', '💼', '🏠', '💰', '🏪', '✈️'].map(icon => (
                <button
                  key={icon}
                  onClick={() => setNewBookIcon(icon)}
                  className={`text-base w-7 h-7 rounded ${newBookIcon === icon ? 'bg-blue-500' : 'bg-slate-100 dark:bg-slate-700'}`}
                >
                  {icon}
                </button>
              ))}
            </div>
              <div className="flex gap-1">
              <input
                type="text"
                value={newBookName}
                onChange={e => setNewBookName(e.target.value)}
                placeholder="Nama buku (contoh: Bisnis, Rumah)"
                className="flex-1 bg-slate-100 dark:bg-slate-700 rounded px-2 py-1.5 text-xs text-slate-900 dark:text-white"
              />
              <button
                onClick={async () => {
                  if (newBookName.trim()) {
                    await createBook(newBookName.trim(), newBookIcon, newBookColor);
                    setNewBookName('');
                    setNewBookIcon('📗');
                  }
                }}
                className="bg-blue-500 text-white px-3 py-1.5 rounded text-xs font-semibold"
              >
                Buat
              </button>
            </div>
          </div>
        )}

        {books.length >= 10 && (
          <p className="text-[10px] text-slate-500 dark:text-slate-400 text-center">
            ⚠️ Maksimal 10 buku (upgrade ke Premium untuk lebih)
          </p>
        )}
      </div>
    )}
  </div>
</header>

        <main className="max-w-4xl mx-auto px-4 pt-4 pb-28">
                {/* ONBOARDING: JIKA USER BELUM MEMILIH / MEMBUAT BUKU */}
      {!activeBook && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center shadow-lg border border-slate-200 dark:border-slate-700 mt-4 animate-in fade-in zoom-in duration-500">
          <div className="text-6xl mb-4 animate-bounce">📚</div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            {books.length === 0 ? 'Selamat Datang di CatanKeuangan!' : 'Pilih Buku Anda'}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-xs mx-auto">
            {books.length === 0 
              ? 'Anda belum memiliki buku catatan. Silakan buat buku pertama Anda untuk mulai mencatat keuangan.' 
              : 'Silakan pilih buku yang ingin Anda buka, atau buat buku baru.'}
          </p>
          <button 
            onClick={() => setShowBookManager(true)}
            className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-8 py-3 rounded-xl font-bold active:scale-95 shadow-lg shadow-blue-500/30 transition-transform"
          >
            ➕ {books.length === 0 ? 'Buat Buku Pertama' : 'Buka Kelola Buku'}
          </button>
        </div>
      )}
          {/* DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl p-4 shadow-lg shadow-blue-500/20 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-xl">
                    {getGreetingEmoji()}
                  </div>
                  <div>
                    <h2 className="font-bold text-lg leading-tight">{getGreeting()}, {profile?.full_name?.split(' ')[0] || 'User'}!</h2>
                    <p className="text-[11px] text-white/80">{getMotivationalQuote()}</p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
               <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-4 shadow-lg shadow-green-500/20">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <ArrowDownLeft className="w-3.5 h-3.5 text-green-100" />
                  <p className="text-[11px] text-green-50 font-medium">Pemasukan</p>
                </div>
                <button
                  onClick={() => setShowIncome(!showIncome)}
                  className="p-1.5 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-full"
                >
                  {showIncome ? (
                    <Eye className="w-4 h-4 text-green-100" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-green-100" />
                  )}
                </button>
              </div>
              <p className="text-sm font-bold text-white break-words">
                {showIncome 
                  ? formatCurrency(monthlyIncome).replace('Rp', 'Rp ') 
                  : '••••••••'}
              </p>
            </div> 
                <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl p-4 shadow-lg shadow-red-500/20">
                  <div className="flex items-center gap-1.5 mb-1">
                    <ArrowUpRight className="w-3.5 h-3.5 text-red-100" />
                    <p className="text-[11px] text-red-50 font-medium">Pengeluaran</p>
                  </div>
                  <p className="text-sm font-bold text-white break-words">{formatCurrency(monthlyExpense).replace('Rp', 'Rp ')}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-4 shadow-lg shadow-purple-500/20">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-purple-100" />
                      <p className="text-[11px] text-purple-50 font-medium">Tabungan</p>
                    </div>
                    <button
                      onClick={() => setShowSavings(!showSavings)}
                      className="p-1.5 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-full"
                    >
                      {showSavings ? (
                        <Eye className="w-4 h-4 text-purple-100" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-purple-100" />
                      )}
                    </button>
                  </div>
                  <p className="text-sm font-bold text-white break-words">
                    {showSavings 
                      ? formatCurrency(savings).replace('Rp', 'Rp ') 
                      : '••••••••'}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl p-4 shadow-lg shadow-blue-500/20">
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingUp className="w-3.5 h-3.5 text-blue-100" />
                    <p className="text-[11px] text-blue-50 font-medium">Status</p>
                  </div>
                  <p className="text-sm font-bold text-white">{savings > 0 ? '✅ Positif' : '⚠️ Negatif'}</p>
                </div>
              </div>

              {/* ✅ KARTU RINGKASAN METODE PEMBAYARAN (3 KATEGORI) */}
{paymentSummary.total > 0 && (
  <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-md">
    <h3 className="font-bold text-sm mb-3 text-slate-900 dark:text-white flex items-center gap-1.5">
      💳 Metode Bayar Bulan Ini
    </h3>
    
    {/* Progress Bar 3 Warna */}
    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden mb-3 flex">
      <div 
        className="h-full bg-gradient-to-r from-green-400 to-green-500 transition-all duration-500" 
        style={{ width: `${paymentSummary.tunaiPct}%` }}
      />
      <div 
        className="h-full bg-gradient-to-r from-blue-400 to-blue-500 transition-all duration-500" 
        style={{ width: `${paymentSummary.qrisPct}%` }}
      />
      <div 
        className="h-full bg-gradient-to-r from-indigo-400 to-indigo-500 transition-all duration-500" 
        style={{ width: `${paymentSummary.transferPct}%` }}
      />
    </div>

    {/* Detail Angka - 3 Kolom */}
    <div className="grid grid-cols-3 gap-2">
      <div className="flex flex-col items-center gap-1">
        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <span className="text-base">💵</span>
        </div>
        <p className="text-[10px] text-slate-500 dark:text-slate-400">Tunai</p>
        <p className="text-xs font-bold text-slate-900 dark:text-white">
          {formatCompact(paymentSummary.tunaiTotal)}
        </p>
        <p className="text-[10px] text-green-600 dark:text-green-400 font-semibold">
          {paymentSummary.tunaiPct.toFixed(0)}%
        </p>
      </div>
      
      <div className="flex flex-col items-center gap-1">
        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <span className="text-base">📱</span>
        </div>
        <p className="text-[10px] text-slate-500 dark:text-slate-400">QRIS</p>
        <p className="text-xs font-bold text-slate-900 dark:text-white">
          {formatCompact(paymentSummary.qrisTotal)}
        </p>
        <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
          {paymentSummary.qrisPct.toFixed(0)}%
        </p>
      </div>
      
      <div className="flex flex-col items-center gap-1">
        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
          <span className="text-base">🏦</span>
        </div>
        <p className="text-[10px] text-slate-500 dark:text-slate-400">Transfer</p>
        <p className="text-xs font-bold text-slate-900 dark:text-white">
          {formatCompact(paymentSummary.transferTotal)}
        </p>
        <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
          {paymentSummary.transferPct.toFixed(0)}%
        </p>
      </div>
    </div>

    {/* Insight FA */}
    {(() => {
      const digitalPct = paymentSummary.qrisPct + paymentSummary.transferPct;
      if (digitalPct > 60) {
        return (
          <div className="mt-3 p-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
            <p className="text-[10px] text-orange-700 dark:text-orange-300 leading-relaxed">
              ⚠️ <span className="font-bold">FA Insight:</span> {digitalPct.toFixed(0)}% pengeluaran Anda via digital (QRIS + Transfer)! 
              Pertimbangkan batasi maksimal 50% untuk kontrol lebih baik.
            </p>
          </div>
        );
      }
      return null;
    })()}
  </div>
)}

                        {/* BREAKDOWN BULAN INI - DONUT CHART + LIST */}
          {pieData.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-md">
              <h3 className="font-bold text-sm mb-4 px-1 text-slate-900 dark:text-white uppercase tracking-wide">
                Pengeluaran Per Kategori
              </h3>
              
              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* Bagian Kiri: Donut Chart */}
                <div className="relative w-40 h-40 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={150} minHeight={150}>
                    <RePieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <Pie 
                        data={pieData} 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={55} 
                        outerRadius={75} 
                        paddingAngle={2} 
                        dataKey="value" 
                        stroke="none"
                      >
                        {pieData.map((_, i) => (
                        <Cell key={`cell-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    </RePieChart>
                  </ResponsiveContainer>
                  
                  {/* Text Total di Tengah Donut */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Total</span>
                    <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                      {formatCompact(pieData.reduce((sum, d) => sum + d.value, 0))}
                    </span>
                  </div>
                </div>

                {/* Bagian Kanan: List Detail */}
                <div className="flex-1 w-full space-y-3">
                  {pieData.map((entry, index) => {  // ✅ HAPUS .toSorted(), KARENA SUDAH SORT DI ATAS
                  const total = pieData.reduce((sum, d) => sum + d.value, 0);
                  const pct = total > 0 ? ((entry.value / total) * 100).toFixed(0) : 0;
                    
                    return (
                      <div key={index} className="flex items-center justify-between group">
                        <div className="flex items-center gap-2.5">
                          {/* Warna Indikator */}
                          <div 
                            className="w-3 h-3 rounded-full shadow-sm" 
                            style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} 
                          />
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-tight">
                              {entry.fullName}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">
                              {pct}%
                            </span>
                          </div>
                        </div>
                        
                        {/* Nominal */}
                        <span className="text-xs font-bold text-slate-900 dark:text-white tabular-nums">
                          {formatCurrency(entry.value)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-md">
                <h3 className="font-bold text-sm mb-3 text-slate-900 dark:text-white">📈 6 Bulan Terakhir</h3>
                <ResponsiveContainer width="100%" height={200} minWidth={200}>
                  <BarChart data={barData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: isDark ? '#94a3b8' : '#64748b' }} tickLine={false} tickFormatter={v => formatCompact(v)} />
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
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                              {expenseCategories[b.category]?.icon} {expenseCategories[b.category]?.name}
                            </span>
                            <span className={`text-xs font-bold ${pct >= 100 ? 'text-red-500' : pct >= 80 ? 'text-orange-500' : 'text-green-500'}`}>
                              {pct.toFixed(0)}%
                            </span>
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
                onClick={() => { setFormData(p => ({ ...p, type: 'expense', category: 'makanan' })); }}
                className={`py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 ${formData.type === 'expense' ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
               >
                💸 Pengeluaran
               </button>
               <button
                onClick={() => { setFormData(p => ({ ...p, type: 'income', category: 'gaji' })); }}
                className={`py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 ${formData.type === 'income' ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
               >
                💰 Pemasukan
               </button>
             </div>
              
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 text-slate-600 dark:text-slate-300">Tanggal</label>
                    <input type="date" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))}
                      className="w-full min-w-0 bg-slate-100 dark:bg-slate-700 border-2 border-transparent rounded-xl px-3 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                <label className="block text-xs font-semibold mb-1.5 text-slate-600 dark:text-slate-300">Kategori</label>
                <div className="relative" ref={categoryDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                    className="w-full bg-slate-100 dark:bg-slate-700 border-2 border-transparent rounded-xl px-3 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 flex justify-between items-center"
                  >
                    {currentCategory ? (
                      <span className="flex items-center gap-2">
                        <span>{currentCategory.icon}</span>
                        <span>{currentCategory.name}</span>
                      </span>
                    ) : (
                      'Pilih kategori'
                    )}
                    <span className="text-slate-400">
                      {isCategoryDropdownOpen ? '▲' : '▼'}
                    </span>
                  </button>
                  
                  {isCategoryDropdownOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 max-h-60 overflow-y-auto">
                      {Object.entries(getCategories())
                        .sort(([, a], [, b]) => {
                          if (a.name === 'Lainnya') return 1;
                          if (b.name === 'Lainnya') return -1;
                          return a.name.localeCompare(b.name);
                        })
                        .map(([key, category]) => (
                        <button
                          key={key}
                          onClick={() => {
                            setFormData(prev => ({ ...prev, category: key }));
                            setIsCategoryDropdownOpen(false);
                          }}
                          className="w-full px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors"
                        >
                          <span>{category.icon}</span>
                          <span>{category.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 text-slate-600 dark:text-slate-300">Deskripsi</label>
                    <input type="text" value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                      placeholder={`Contoh: ${currentExamples || currentCategory?.name || ''}`}
                      className="w-full bg-slate-100 dark:bg-slate-700 border-2 border-transparent rounded-xl px-3 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500" />
                  </div>
                                 <div>
                 <label className="block text-xs font-semibold mb-1.5 text-slate-600 dark:text-slate-300">Nominal</label>
                 <input type="text" value={formatNominalDisplay(formData.amount)} onChange={handleNominalChange} placeholder="Rp 0" inputMode="numeric" pattern="[0-9]*"
                  className="w-full bg-slate-100 dark:bg-slate-700 border-2 border-transparent rounded-xl px-3 py-3 text-base font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500" />
                 
                 {/* ✅ TOMBOL TOGGLE RINCIAN ITEM */}
                 <button
                   type="button"
                   onClick={() => setShowItemDetails(!showItemDetails)}
                   className="mt-2 text-xs font-semibold text-blue-500 hover:text-blue-600 flex items-center gap-1"
                 >
                   {showItemDetails ? '▼ Sembunyikan Rincian' : '+ Tambah Rincian Item'}
                 </button>
               </div>

               {/* ✅ PANEL RINCIAN ITEM (COLLAPSIBLE) - RESPONSIVE */}
{showItemDetails && (
  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 space-y-2 border border-slate-200 dark:border-slate-600">
    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Rincian Belanja</p>
    
    {transactionItems.map((item, idx) => (
      <div key={idx} className="space-y-1.5">
        {/* Row 1: Nama Item */}
        <input
          type="text"
          value={item.name}
          onChange={(e) => {
            const newItems = [...transactionItems];
            newItems[idx].name = e.target.value;
            setTransactionItems(newItems);
          }}
          placeholder="Nama item (contoh: Nasi Padang)"
          className="w-full bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600"
        />
        
        {/* Row 2: Qty & Harga (Side by Side) */}
        <div className="flex gap-2">
          <div className="flex-1">
            <input
              type="number"
              value={item.qty || ''}
              onChange={(e) => {
                const newItems = [...transactionItems];
                const value = e.target.value;
                // ✅ Izinkan kosong saat mengetik, parse hanya jika ada angka
                newItems[idx].qty = value === '' ? 0 : parseInt(value) || 0;
                setTransactionItems(newItems);
              }}
              onBlur={(e) => {
                // ✅ Saat blur, pastikan minimal 1 jika kosong atau 0
                const newItems = [...transactionItems];
                if (!newItems[idx].qty || newItems[idx].qty < 1) {
                  newItems[idx].qty = 1;
                  setTransactionItems(newItems);
                }
              }}
              placeholder="Qty"
              min="1"
              className="w-full bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 text-center"
            />
          </div>
          <div className="flex-[2]">
            <input
              type="text"
              value={item.price ? formatNominalDisplay(item.price.toString()) : ''}
              onChange={(e) => {
                const newItems = [...transactionItems];
                newItems[idx].price = parseNominal(e.target.value);
                setTransactionItems(newItems);
              }}
              placeholder="Harga"
              inputMode="numeric"
              className="w-full bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 text-right"
            />
          </div>
          <button
            onClick={() => setTransactionItems(transactionItems.filter((_, i) => i !== idx))}
            className="px-3 py-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 rounded-lg transition-colors flex items-center justify-center"
          >
            <X className="w-4 h-4 text-red-500" />
          </button>
        </div>
      </div>
    ))}

    <button
      type="button"
      onClick={() => setTransactionItems([...transactionItems, { name: '', qty: 1, price: 0 }])}
      className="w-full py-2.5 text-sm font-semibold text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors border border-dashed border-blue-300 dark:border-blue-700"
    >
      + Tambah Item
    </button>

    {/* ✅ CHECKBOX PAJAK */}
    <div className="bg-slate-100 dark:bg-slate-700/50 rounded-lg p-3 space-y-2">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={includeTax}
          onChange={(e) => setIncludeTax(e.target.checked)}
          className="w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
        />
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          🧾 Include Pajak
        </span>
      </label>

      {/* Pilihan Rate Pajak (hanya muncul jika checkbox dicentang) */}
      {includeTax && (
        <div className="flex gap-2 pl-6">
          <button
            type="button"
            onClick={() => setTaxRate('10')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
              taxRate === '10'
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-white dark:bg-slate-600 text-slate-700 dark:text-slate-300'
            }`}
          >
            10%
          </button>
          <button
            type="button"
            onClick={() => setTaxRate('11')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
              taxRate === '11'
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-white dark:bg-slate-600 text-slate-700 dark:text-slate-300'
            }`}
          >
            11%
          </button>
        </div>
      )}

      {/* Display Pajak */}
      {includeTax && taxAmount > 0 && (
        <div className="flex justify-between items-center pl-6 pt-1">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Pajak ({taxRate}%):
          </span>
          <span className="text-xs font-bold text-orange-600 dark:text-orange-400">
            +{formatCurrency(taxAmount)}
          </span>
        </div>
      )}
    </div>

    {/* Total Akhir (Subtotal + Pajak) */}
    {includeTax && taxAmount > 0 && (
      <div className="flex justify-between items-center bg-green-50 dark:bg-green-900/20 rounded-lg px-3 py-2 border-2 border-green-300 dark:border-green-700">
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
          💰 Total (Termasuk Pajak):
        </span>
        <span className="text-sm font-extrabold text-green-600 dark:text-green-400">
          {formatCurrency(itemsTotal)}
        </span>
      </div>
    )}
  </div>
)}
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 text-slate-600 dark:text-slate-300">Catatan</label>
                    <textarea value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} placeholder="Opsional"
                      className="w-full bg-slate-100 dark:bg-slate-700 border-2 border-transparent rounded-xl px-3 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 h-20 resize-none" />
                  </div>
                 
                 {/* ✅ METODE PEMBAYARAN - DIPERBAIKI */}
<div className="space-y-2">
  <label className="block text-xs font-semibold mb-1.5 text-slate-600 dark:text-slate-300">
    Pilih Metode Bayar
  </label>
  
  <div className="grid grid-cols-3 gap-2">
    {Object.entries(paymentMethods).map(([key, pm]) => (
      <button
        key={key}
        type="button"
        onClick={() => {
          console.log('Payment method selected:', key);
          setFormData(p => ({ ...p, payment_method: key }));
        }}
        className={`
          relative px-3 py-3 rounded-xl font-semibold text-sm 
          transition-all duration-200 
          flex flex-col items-center justify-center gap-1
          min-h-[80px]
          ${formData.payment_method === key
            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 scale-105'
            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
          }
          active:scale-95
          cursor-pointer
          touch-manipulation
        `}
        style={{ 
          WebkitTapHighlightColor: 'transparent',
          zIndex: formData.payment_method === key ? 10 : 1
        }}
      >
        <span className="text-2xl">{pm.icon}</span>
        <span className="text-xs text-center leading-tight">{pm.name}</span>
      </button>
    ))}
  </div>
  
  {/* Deskripsi metode yang dipilih */}
  {paymentMethods[formData.payment_method]?.description && (
    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 px-1">
      {paymentMethods[formData.payment_method].description}
    </p>
  )}
</div>

                  <button onClick={handleAddTransaction}
                    className={`w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all active:scale-95 shadow-lg ${formData.type === 'income' ? 'bg-green-500 shadow-green-500/30' : 'bg-red-500 shadow-red-500/30'}`}>
                    {editingId ? '✏️ Update' : '➕ Simpan'} Transaksi
                  </button>
                  {editingId && (
                    <button onClick={() => { setEditingId(null); setFormData({ date: new Date().toISOString().split('T')[0], type: 'expense', category: 'makanan', description: '', amount: '', notes: '', payment_method: 'cash' }); }}
                      className="w-full py-3 rounded-xl font-semibold text-sm bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 active:scale-95">❌ Batal
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">📅 Riwayat</h2>
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-3 shadow-md">
                <p className="text-xs font-semibold mb-2 text-slate-600 dark:text-slate-300">📆 Periode</p>
                <div className="grid grid-cols-3 gap-1.5 mb-2">
                  {[
                    { id: 'all', label: 'Semua' },
                    { id: 'today', label: 'Hari Ini' },
                    { id: 'week', label: 'Minggu Ini' },
                    { id: 'month', label: 'Bulan Ini' },
                    { id: 'year', label: 'Tahun Ini' },
                    { id: 'custom', label: 'Custom' },
                  ].map(p => (
                    <button
                      key={p.id}
                      onClick={() => { setPeriodFilter(p.id as any); if (p.id !== 'custom') { setCustomStartDate(''); setCustomEndDate(''); } }}
                      className={`py-2 rounded-lg text-[11px] font-semibold transition-all active:scale-95 ${periodFilter === p.id ? 'bg-blue-500 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                {periodFilter === 'custom' && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <div>
                      <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-1">Dari</label>
                      <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)}
                        className="w-full bg-slate-100 dark:bg-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-1">Sampai</label>
                      <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)}
                        className="w-full bg-slate-100 dark:bg-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-white" />
                    </div>
                  </div>
                )}
              </div>
              
              {/* ✅ SEARCH BAR BARU */}
           <div className="relative">
             <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
             <input
               type="text"
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               placeholder="Cari deskripsi, kategori, catatan..."
               className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-10 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 shadow-sm placeholder:text-slate-400"
             />
             {searchQuery && (
               <button
                 onClick={() => setSearchQuery('')}
                 className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
               >
                 <X className="w-4 h-4 text-slate-400" />
               </button>
             )}
           </div>

              {/* ✅ CUSTOM DROPDOWN KATEGORI - HISTORY (SAMA SEPERTI TAB INPUT) */}
<div className="relative">
  <button
    type="button"
    onClick={() => setIsHistoryCategoryDropdownOpen(!isHistoryCategoryDropdownOpen)}
    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 flex justify-between items-center"
  >
    {filterCategory ? (
      <span className="flex items-center gap-2">
        <span>{({ ...incomeCategories, ...expenseCategories }[filterCategory])?.icon || '📋'}</span>
        <span>{({ ...incomeCategories, ...expenseCategories }[filterCategory])?.name || 'Semua Kategori'}</span>
      </span>
    ) : (
      <span className="text-slate-500 dark:text-slate-400">Semua Kategori</span>
    )}
    <span className="text-slate-400">
      {isHistoryCategoryDropdownOpen ? '▲' : '▼'}
    </span>
  </button>

  {isHistoryCategoryDropdownOpen && (
    <div className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 max-h-60 overflow-y-auto">
      {/* Opsi: Semua Kategori */}
      <button
        onClick={() => {
          setFilterCategory('');
          setIsHistoryCategoryDropdownOpen(false);
        }}
        className={`w-full px-3 py-2.5 text-sm flex items-center gap-2 transition-colors ${
          !filterCategory 
            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold' 
            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
        }`}
      >
        <span>📋</span>
        <span>Semua Kategori</span>
      </button>

      {/* Kategori Pemasukan */}
      <div className="px-3 py-1.5 text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-t border-slate-100 dark:border-slate-700">
        💰 PEMASUKAN
      </div>
      {Object.entries(incomeCategories)
            .sort(([, a], [, b]) => {
              if (a.name === 'Lainnya') return 1;
              if (b.name === 'Lainnya') return -1;
              return a.name.localeCompare(b.name);
            })
            .map(([key, cat]) => (
        <button
          key={key}
          onClick={() => {
            setFilterCategory(key);
            setIsHistoryCategoryDropdownOpen(false);
          }}
          className={`w-full px-3 py-2.5 text-sm flex items-center gap-2 transition-colors ${
            filterCategory === key 
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold' 
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          <span>{cat.icon}</span>
          <span>{cat.name}</span>
        </button>
      ))}

      {/* Kategori Pengeluaran */}
      <div className="px-3 py-1.5 text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-t border-slate-100 dark:border-slate-700">
        💸 PENGELUARAN
      </div>
      {Object.entries(expenseCategories)
          .sort(([, a], [, b]) => {
            if (a.name === 'Lainnya') return 1;
            if (b.name === 'Lainnya') return -1;
            return a.name.localeCompare(b.name);
          })
          .map(([key, cat]) => (
        <button
          key={key}
          onClick={() => {
            setFilterCategory(key);
            setIsHistoryCategoryDropdownOpen(false);
          }}
          className={`w-full px-3 py-2.5 text-sm flex items-center gap-2 transition-colors ${
            filterCategory === key 
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold' 
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          <span>{cat.icon}</span>
          <span>{cat.name}</span>
        </button>
      ))}
    </div>
  )}
</div>
              
              {/* ✅ FILTER BUKU (HANYA MUNCUL SAAT MODE KELUARGA) */}
{isFamilyMode && books.length > 0 && (
  <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
    <button
      onClick={() => setSelectedBookIds(books.map(b => b.id))}
      className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
  selectedBookIds.length === 0 || selectedBookIds.length === books.length
    ? 'bg-purple-500 text-white shadow-md shadow-purple-500/30'
    : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
}`}
    >
      📚 Semua Buku
    </button>
    {books.map(book => {
      const isSelected = selectedBookIds.includes(book.id);
      return (
        <button
          key={book.id}
          onClick={() => {
            if (isSelected) {
              const newIds = selectedBookIds.filter(id => id !== book.id);
              setSelectedBookIds(newIds.length > 0 ? newIds : books.map(b => b.id));
            } else {
              setSelectedBookIds([...selectedBookIds, book.id]);
            }
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
            isSelected
              ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
          }`}
        >
          <span>{book.icon}</span>
          <span>{book.name}</span>
        </button>
      );
    })}
  </div>
)}

              {filteredTransactions.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-3 shadow-md">
                    <p className="text-[10px] text-green-50 font-medium mb-0.5">💰 Pemasukan</p>
                    <p className="text-sm font-bold text-white break-words">
                      {formatCurrency(filteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)).replace('Rp', 'Rp ')}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-xl p-3 shadow-md">
                    <p className="text-[10px] text-red-50 font-medium mb-0.5">💸 Pengeluaran</p>
                    <p className="text-sm font-bold text-white break-words">
                      {formatCurrency(filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)).replace('Rp', 'Rp ')}
                    </p>
                  </div>
                </div>
              )}
              {filteredTransactions.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center">
                  <p className="text-slate-500 dark:text-slate-400 text-sm">Tidak ada transaksi di periode ini</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500 dark:text-slate-400 px-1">📋 {filteredTransactions.length} transaksi ditemukan</p>
                 {filteredTransactions.map(t => {
  if (!t) return null; // ✅ Safety check ekstra
  const cats = t.type === 'income' ? incomeCategories : expenseCategories;
  const cat = cats[t.category];
  return (
    <div key={t.id} className="bg-white dark:bg-slate-800 rounded-2xl p-3.5 shadow-sm active:scale-[0.99] transition-transform">
      <div className="flex items-center gap-3">
        <div className={`text-xl w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${cat?.bgColor || 'bg-slate-100'}`}>
          {cat?.icon || '💰'}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-slate-900 dark:text-white truncate">{cat?.name || 'Transaksi'}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{t.description}</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
            {format(parseLocalDate(t.date), 'dd MMM yyyy', { locale: id })}
          </p>

          {/* ✅ BADGE METODE PEMBAYARAN (DENGAN OPTIONAL CHAINING) */}
          {t?.payment_method && paymentMethods[t.payment_method] && (
            <span className={`inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${paymentMethods[t.payment_method].bg} ${paymentMethods[t.payment_method].color}`}>
              {paymentMethods[t.payment_method].icon} {paymentMethods[t.payment_method].name}
            </span>
          )}
          
          {/* ✅ BADGE SUMBER BUKU */}
          {isFamilyMode && t?.book_id && (
            <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-[10px] font-bold text-blue-700 dark:text-blue-300 w-fit border border-blue-200 dark:border-blue-800">
              {books.find(b => b.id === t.book_id)?.icon || '📘'} 
              {books.find(b => b.id === t.book_id)?.name || 'Buku'}
            </span>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className={`text-sm font-bold ${t.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
            {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount).replace('Rp', '').trim()}
          </p>
          <div className="flex gap-1 mt-1.5 justify-end">
            <button onClick={() => setViewingTransaction(t)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg active:scale-90 transition-transform">
              <Eye className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            </button>
            <button onClick={() => handleEdit(t)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg active:scale-90 transition-transform">
              <Edit2 className="w-3 h-3 text-blue-500" />
            </button>
            <button onClick={() => handleDelete(t.id)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg active:scale-90 transition-transform">
              <Trash2 className="w-3 h-3 text-red-500" />
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

          {/* MORE TAB */}
          {activeTab === 'more' && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-800 p-1 rounded-2xl shadow-md">
                <div className="grid grid-cols-5 gap-0.5">
                  {[
                    { id: 'analisis' as MoreTab, label: '📊', name: 'Analisis' },
                    { id: 'budget' as MoreTab, label: '💰', name: 'Budget' },
                    { id: 'goals' as MoreTab, label: '🎯', name: 'Goals' },
                    { id: 'recurring' as MoreTab, label: '🔄', name: 'Auto' },
                    { id: 'settings' as MoreTab, label: '⚙️', name: 'Set' },
                  ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveMoreTab(tab.id)}
                      className={`flex flex-col items-center py-2 rounded-xl text-[10px] font-semibold transition-all active:scale-95 ${activeMoreTab === tab.id ? 'bg-blue-500 text-white shadow-md' : 'text-slate-600 dark:text-slate-400'}`}>
                      <span className="text-base mb-0.5">{tab.label}</span>
                      <span>{tab.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ANALISIS */}
              {activeMoreTab === 'analisis' && (
                <div className="space-y-3">
                  {/* Financial Health Score */}
                  {(() => {
                    const savingsRate = monthlyIncome > 0 ? (savings / monthlyIncome) * 100 : 0;
                    const budgetCompliance = budgets.length > 0
                      ? (budgets.filter(b => (monthlySpending[b.category] || 0) <= b.limit).length / budgets.length) * 100
                      : 50;
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                    const activeDays = new Set(transactions.filter(t => parseLocalDate(t.date) >= thirtyDaysAgo).map(t => t.date)).size;
                    const consistencyScore = (activeDays / 30) * 100;
                    const score = Math.min(100, Math.round(savingsRate * 0.4 + budgetCompliance * 0.35 + consistencyScore * 0.25));
                    const getScoreInfo = (s: number) => {
                      if (s >= 80) return { label: 'Excellent', color: 'text-green-500', bg: 'from-green-500 to-emerald-500', emoji: '🏆' };
                      if (s >= 60) return { label: 'Baik', color: 'text-blue-500', bg: 'from-blue-500 to-cyan-500', emoji: '✨' };
                      if (s >= 40) return { label: 'Cukup', color: 'text-yellow-500', bg: 'from-yellow-500 to-orange-500', emoji: '⚡' };
                      return { label: 'Perlu Perhatian', color: 'text-red-500', bg: 'from-red-500 to-pink-500', emoji: '⚠️' };
                    };
                    const info = getScoreInfo(score);
                    return (
                      <div className={`bg-gradient-to-br ${info.bg} rounded-2xl p-4 shadow-lg`}>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                            <span className="text-xl">{info.emoji}</span> Skor Finansial
                          </h3>
                          <span className="text-[10px] bg-white/20 backdrop-blur px-2 py-0.5 rounded-full text-white font-medium">Bulan Ini</span>
                        </div>
                        <div className="flex items-center gap-3 mb-3">
                          <div className="relative w-20 h-20 flex-shrink-0">
                            <svg className="w-20 h-20 transform -rotate-90">
                              <circle cx="40" cy="40" r="32" stroke="rgba(255,255,255,0.2)" strokeWidth="6" fill="none" />
                              <circle cx="40" cy="40" r="32" stroke="white" strokeWidth="6" fill="none"
                                strokeDasharray={`${2 * Math.PI * 32}`}
                                strokeDashoffset={`${2 * Math.PI * 32 * (1 - score / 100)}`}
                                strokeLinecap="round"
                                className="transition-all duration-1000"
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-2xl font-bold text-white">{score}</span>
                            </div>
                          </div>
                          <div className="flex-1">
                            <p className="text-white font-bold text-lg">{info.label}</p>
                            <p className="text-white/80 text-[11px] leading-snug">
                              {score >= 80 ? 'Keuangan Anda sangat sehat!' :
                               score >= 60 ? 'Terus pertahankan kebiasaan baik!' :
                               score >= 40 ? 'Ada ruang untuk improvement.' :
                               'Saatnya evaluasi keuangan.'}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-1.5 bg-white/10 backdrop-blur rounded-xl p-2.5">
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-white/90">💰 Savings Rate</span>
                            <span className="font-bold text-white">{savingsRate.toFixed(0)}%</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-white/90">📊 Budget Compliance</span>
                            <span className="font-bold text-white">{budgetCompliance.toFixed(0)}%</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-white/90">📅 Konsistensi</span>
                            <span className="font-bold text-white">{activeDays}/30 hari</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Month-over-Month Comparison */}
                  {(() => {
                    const now = new Date();
                    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    const getMonthData = (date: Date) => {
                      const month = date.getMonth();
                      const year = date.getFullYear();
                      const monthTrans = transactions.filter(t => {
                      const d = parseLocalDate(t.date);
                      return d.getMonth() === month && d.getFullYear() === year;
                      });
                      return {
                        income: monthTrans.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
                        expense: monthTrans.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
                      };
                    };
                    const thisMonth = getMonthData(now);
                    const prevMonth = getMonthData(lastMonth);
                    const calcChange = (curr: number, prev: number) => {
                      if (prev === 0) return curr > 0 ? 100 : 0;
                      return ((curr - prev) / prev) * 100;
                    };
                    const incomeChange = calcChange(thisMonth.income, prevMonth.income);
                    const expenseChange = calcChange(thisMonth.expense, prevMonth.expense);
                    const savingsChange = calcChange(thisMonth.income - thisMonth.expense, prevMonth.income - prevMonth.expense);
                    const ChangeIndicator = ({ value, invert = false }: { value: number; invert?: boolean }) => {
                      const isPositive = value > 0;
                      const good = invert ? !isPositive : isPositive;
                      return (
                        <span className={`flex items-center gap-0.5 text-[11px] font-bold ${good ? 'text-green-500' : 'text-red-500'}`}>
                          {isPositive ? '▲' : value < 0 ? '▼' : '•'}
                          {Math.abs(value).toFixed(0)}%
                        </span>
                      );
                    };
                    return (
                      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-md">
                        <h3 className="font-bold text-sm mb-3 text-slate-900 dark:text-white flex items-center gap-1.5">📈 Perbandingan Bulan Lalu</h3>
                        <div className="space-y-2.5 mb-3">
                          <div className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                            <div>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400">Pemasukan</p>
                              <p className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(thisMonth.income)}</p>
                            </div>
                            <ChangeIndicator value={incomeChange} />
                          </div>
                          <div className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                            <div>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400">Pengeluaran</p>
                              <p className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(thisMonth.expense)}</p>
                            </div>
                            <ChangeIndicator value={expenseChange} invert />
                          </div>
                          <div className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                            <div>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400">Tabungan</p>
                              <p className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(thisMonth.income - thisMonth.expense)}</p>
                            </div>
                            <ChangeIndicator value={savingsChange} />
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* ✅ STACKED BAR CHART: METODE PEMBAYARAN 6 BULAN */}
<div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-md">
  <h3 className="font-bold text-sm mb-3 text-slate-900 dark:text-white flex items-center gap-1.5">
    💳 Tren Metode Bayar (6 Bulan)
  </h3>
  <ResponsiveContainer width="100%" height={200} minWidth={200}>
    <BarChart data={paymentBarData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
      <XAxis 
        dataKey="name" 
        tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }} 
        tickLine={false} 
      />
      <YAxis 
        tick={{ fontSize: 9, fill: isDark ? '#94a3b8' : '#64748b' }} 
        tickLine={false} 
        tickFormatter={v => formatCompact(v)} 
      />
      <Tooltip content={<CustomTooltip />} />
      <Legend 
        wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
        iconType="square"
      />
      // Dalam file App.tsx, di bagian chart "Tren Metode Bayar (6 Bulan)"
      <Bar 
        dataKey="Tunai" 
        stackId="payment" 
        fill="#10b981" 
        radius={[0, 0, 0, 0]}
      />
      <Bar 
        dataKey="QRIS" 
        stackId="payment" 
        fill="#3b82f6" 
        radius={[4, 4, 0, 0]}
      />
      <Bar 
        dataKey="Transfer" 
        stackId="payment" 
        fill="#8b5cf6" 
        radius={[4, 4, 0, 0]}
      />
    </BarChart>
  </ResponsiveContainer>
  
 {/* 💡 INSIGHT FA OTOMATIS (3 KATEGORI) */}
{(() => {
  if (paymentBarData.length < 2) return null;
  
  const thisMonth = paymentBarData[paymentBarData.length - 1];
  const lastMonth = paymentBarData[paymentBarData.length - 2];
  
  const thisTotal = thisMonth.Tunai + thisMonth.QRIS + thisMonth.Transfer;
  const lastTotal = lastMonth.Tunai + lastMonth.QRIS + lastMonth.Transfer;
  
  if (thisTotal === 0) return null;
  
  const thisDigitalPct = ((thisMonth.QRIS + thisMonth.Transfer) / thisTotal) * 100;
  const lastDigitalPct = lastTotal > 0 ? ((lastMonth.QRIS + lastMonth.Transfer) / lastTotal) * 100 : 0;
  const trend = thisDigitalPct - lastDigitalPct;
  
  let insight = '';
  let insightColor = '';
  let insightIcon = '';
  
  if (thisDigitalPct > 70) {
    insight = `${thisDigitalPct.toFixed(0)}% pengeluaran via digital (QRIS + Transfer)! Sangat tinggi, pertimbangkan tarik tunai mingguan untuk kontrol lebih baik.`;
    insightColor = 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
    insightIcon = '🚨';
  } else if (thisDigitalPct > 50 && trend > 10) {
    insight = `Pengeluaran digital naik ${trend.toFixed(0)}% dari bulan lalu! Waspada kebocoran halus via e-wallet/QRIS/transfer.`;
    insightColor = 'text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
    insightIcon = '⚠️';
  } else if (thisDigitalPct < 40) {
    insight = `Pola sehat! ${thisDigitalPct.toFixed(0)}% digital. Anda punya kontrol bagus atas pengeluaran digital.`;
    insightColor = 'text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
    insightIcon = '✨';
  } else {
    insight = `Rasio seimbang: ${thisDigitalPct.toFixed(0)}% digital. Pertahankan!`;
    insightColor = 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    insightIcon = '💡';
  }
  
  return (
    <div className={`mt-3 p-2.5 border rounded-lg ${insightColor}`}>
      <p className="text-[11px] leading-relaxed">
        <span className="font-bold">{insightIcon} FA Insight:</span> {insight}
      </p>
    </div>
  );
})()}
</div>

                  {/* Calendar Heatmap */}
                  {(() => {
                    const now = new Date();
                    const daysToShow = 35;
                    const days: { date: Date; amount: number; count: number }[] = [];
                    for (let i = daysToShow - 1; i >= 0; i--) {
                      const date = new Date(now);
                      date.setDate(date.getDate() - i);
                      date.setHours(0, 0, 0, 0);
                      const dateStr = date.toISOString().split('T')[0];
                      const dayTrans = transactions.filter(t => t.date === dateStr && t.type === 'expense');
                      days.push({ date, amount: dayTrans.reduce((s, t) => s + t.amount, 0), count: dayTrans.length });
                    }
                    const maxAmount = Math.max(...days.map(d => d.amount), 1);
                    const getColor = (amount: number) => {
                      if (amount === 0) return isDark ? 'bg-slate-700' : 'bg-slate-200';
                      const ratio = amount / maxAmount;
                      if (ratio < 0.25) return 'bg-green-300 dark:bg-green-700';
                      if (ratio < 0.5) return 'bg-yellow-300 dark:bg-yellow-600';
                      if (ratio < 0.75) return 'bg-orange-400 dark:bg-orange-600';
                      return 'bg-red-500 dark:bg-red-600';
                    };
                    const dayTotals = [0, 0, 0, 0, 0, 0, 0];
                    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
                    transactions.filter(t => t.type === 'expense').forEach(t => {
                      const day = parseLocalDate(t.date).getDay();
                      dayTotals[day] += t.amount;
                      dayCounts[day]++;
                    });
                    const dayAvg = dayTotals.map((t, i) => dayCounts[i] > 0 ? t / dayCounts[i] : 0);
                    const maxDayAvg = Math.max(...dayAvg);
                    const mostExpensiveDay = dayAvg.indexOf(maxDayAvg);
                    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
                    return (
                      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-md">
                        <h3 className="font-bold text-sm mb-3 text-slate-900 dark:text-white flex items-center gap-1.5">🗓️ Pola Pengeluaran (35 Hari)</h3>
                        <div className="grid grid-cols-7 gap-1 mb-2">
                          {['M', 'S', 'S', 'R', 'K', 'J', 'S'].map((d, i) => (
                            <div key={i} className="text-[9px] text-center text-slate-500 dark:text-slate-400 font-medium">{d}</div>
                          ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                          {days.map((day, i) => (
                            <div key={i} className={`aspect-square rounded ${getColor(day.amount)} transition-all`} title={`${format(day.date, 'dd MMM')}: ${formatCurrency(day.amount)} (${day.count} trans)`} />
                          ))}
                        </div>
                        <div className="flex items-center justify-between mt-3 text-[10px]">
                          <div className="flex items-center gap-1">
                            <span className="text-slate-500 dark:text-slate-400">Hemat</span>
                            <div className="w-3 h-3 rounded bg-green-300 dark:bg-green-700" />
                            <div className="w-3 h-3 rounded bg-yellow-300 dark:bg-yellow-600" />
                            <div className="w-3 h-3 rounded bg-orange-400 dark:bg-orange-600" />
                            <div className="w-3 h-3 rounded bg-red-500 dark:bg-red-600" />
                            <span className="text-slate-500 dark:text-slate-400">Boros</span>
                          </div>
                        </div>
                        {transactions.length > 0 && (
                          <div className="mt-3 p-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <p className="text-[11px] text-blue-700 dark:text-blue-300 font-semibold mb-0.5">💡 Insight Pola</p>
                            <p className="text-xs text-blue-900 dark:text-blue-200">
                              Anda paling boros di hari <span className="font-bold">{dayNames[mostExpensiveDay]}</span> (rata-rata {formatCurrency(maxDayAvg)}/transaksi)
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Smart Anomaly Detection */}
                  {(() => {
                    const expenseTrans = transactions.filter(t => t.type === 'expense');
                    if (expenseTrans.length < 5) {
                      return (
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-md">
                          <h3 className="font-bold text-sm mb-2 text-slate-900 dark:text-white flex items-center gap-1.5">🔍 Deteksi Anomali</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-4">Butuh minimal 5 transaksi untuk analisis anomali</p>
                        </div>
                      );
                    }
                    const avgAmount = expenseTrans.reduce((s, t) => s + t.amount, 0) / expenseTrans.length;
                    const outliers = expenseTrans.filter(t => t.amount > avgAmount * 2.5).sort((a, b) => b.amount - a.amount).slice(0, 3);
                    const anomalies = outliers.map(o => ({
                      title: 'Transaksi Tidak Biasa',
                      desc: `${expenseCategories[o.category]?.icon || '💸'} ${o.description} - ${formatCurrency(o.amount)} (${(o.amount / avgAmount).toFixed(1)}x rata-rata)`,
                      severity: o.amount > avgAmount * 4 ? 'high' : 'medium',
                    }));
                    if (anomalies.length === 0) {
                      return (
                        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-4 shadow-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">🎯</span>
                            <h3 className="font-bold text-sm text-white">Pola Keuangan Normal</h3>
                          </div>
                          <p className="text-xs text-white/90 leading-relaxed">Tidak ada anomali terdeteksi. Pola pengeluaran Anda stabil dan terprediksi!</p>
                        </div>
                      );
                    }
                    return (
                      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-md">
                        <h3 className="font-bold text-sm mb-3 text-slate-900 dark:text-white flex items-center gap-1.5">
                          🚨 Deteksi Anomali
                          <span className="ml-auto bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full">{anomalies.length} ditemukan</span>
                        </h3>
                        <div className="space-y-2">
                          {anomalies.map((a, i) => (
                            <div key={i} className={`p-2.5 rounded-lg border-l-4 ${a.severity === 'high' ? 'bg-red-50 dark:bg-red-900/20 border-red-500' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-500'}`}>
                              <p className="text-[11px] font-bold text-slate-900 dark:text-white mb-0.5">{a.severity === 'high' ? '🚨' : '⚠️'} {a.title}</p>
                              <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-snug">{a.desc}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* 12-Month Trend */}
                  {(() => {
                    const now = new Date();
                    const monthsData: Record<string, { income: number; expense: number; savings: number }> = {};
                    for (let i = 11; i >= 0; i--) {
                      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                      monthsData[key] = { income: 0, expense: 0, savings: 0 };
                    }
                    transactions.forEach(t => {
                    const d = parseLocalDate(t.date);
                    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                      if (monthsData[key]) {
                        if (t.type === 'income') monthsData[key].income += t.amount;
                        else monthsData[key].expense += t.amount;
                      }
                    });
                    const trendData = Object.entries(monthsData).map(([k, v]) => ({
                      name: format(new Date(k + '-01'), 'MMM', { locale: id }),
                      Tabungan: v.income - v.expense,
                      Pemasukan: v.income,
                      Pengeluaran: v.expense,
                    }));
                    return (
                      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-md">
                        <h3 className="font-bold text-sm mb-3 text-slate-900 dark:text-white flex items-center gap-1.5">📊 Tren 12 Bulan Terakhir</h3>
                        <ResponsiveContainer width="100%" height={200} minWidth={200}>
                          <LineChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
                            <XAxis dataKey="name" tick={{ fontSize: 9, fill: isDark ? '#94a3b8' : '#64748b' }} tickLine={false} />
                            <YAxis tick={{ fontSize: 9, fill: isDark ? '#94a3b8' : '#64748b' }} tickLine={false} tickFormatter={v => formatCompact(v)} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ fontSize: 10 }} />
                            <Line type="monotone" dataKey="Pemasukan" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} />
                            <Line type="monotone" dataKey="Pengeluaran" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} />
                            <Line type="monotone" dataKey="Tabungan" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 2 }} strokeDasharray="5 5" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    );
                  })()}

                  {/* AI Advice */}
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
                    <button onClick={() => { setShowBudgetForm(true); setEditingBudget(null); }}
              className="bg-blue-500 text-white px-3 py-2 rounded-xl text-xs font-semibold active:scale-95 transition-transform flex items-center gap-1 shadow-md shadow-blue-500/30">
              <Plus className="w-3.5 h-3.5" /> Baru
            </button>
                  </div>
                 {(showBudgetForm || editingBudget) && (
  <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-md space-y-3">
    {/* ✅ CUSTOM DROPDOWN KATEGORI BUDGET */}
<div className="relative">
  <button
    type="button"
    onClick={() => setIsBudgetCategoryDropdownOpen(!isBudgetCategoryDropdownOpen)}
    className="w-full bg-slate-100 dark:bg-slate-700 rounded-xl px-3 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 flex justify-between items-center"
  >
    <span className="flex items-center gap-2">
      <span>{expenseCategories[budgetForm.category]?.icon || '📋'}</span>
      <span>{expenseCategories[budgetForm.category]?.name || 'Pilih Kategori'}</span>
    </span>
    <span className="text-slate-400">
      {isBudgetCategoryDropdownOpen ? '▲' : '▼'}
    </span>
  </button>

  {isBudgetCategoryDropdownOpen && (
    <div className="absolute z-30 w-full mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 max-h-60 overflow-y-auto">
      {Object.entries(expenseCategories)
      .sort(([, a], [, b]) => {
        if (a.name === 'Lainnya') return 1;
        if (b.name === 'Lainnya') return -1;
        return a.name.localeCompare(b.name);
          })
          .map(([key, cat]) => (
  <button
    key={key}
    onClick={() => {
      // ✅ RESET LIMIT JIKA INI BUDGET BARU (bukan edit)
      if (!editingBudget) {
        setBudgetForm(prev => ({ ...prev, category: key, limit: '' }));
      } else {
        setBudgetForm(prev => ({ ...prev, category: key }));
      }
      setIsBudgetCategoryDropdownOpen(false);
    }}
    className={`w-full px-3 py-2.5 text-sm flex items-center gap-2 transition-colors ${
      budgetForm.category === key ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
    }`}
        >
          <span>{cat.icon}</span>
          <span>{cat.name}</span>
        </button>
      ))}
    </div>
  )}
</div>
    <input type="text" value={formatNominalDisplay(budgetForm.limit)} onChange={e => setBudgetForm({ ...budgetForm, limit: parseNominal(e.target.value).toString() })}
  placeholder="Rp 0" inputMode="numeric" pattern="[0-9]*"
  className="w-full bg-slate-100 dark:bg-slate-700 rounded-xl px-3 py-3 text-base font-bold text-slate-900 dark:text-white" />
    {/* ✅ INPUT KETERANGAN BUDGET (OPSIONAL) */}
<div>
  <label className="block text-xs font-semibold mb-1.5 text-slate-600 dark:text-slate-300">
    Keterangan <span className="text-slate-400 font-normal">(opsional)</span>
  </label>
  <input 
    type="text" 
    value={budgetForm.description} 
    onChange={e => setBudgetForm({ ...budgetForm, description: e.target.value })}
    placeholder={`Contoh: ${budgetForm.category === 'rekreasi' ? 'Liburan luar kota' : budgetForm.category === 'makanan' ? 'Makan siang kantor' : 'Keterangan budget...'}`}
    className="w-full bg-slate-100 dark:bg-slate-700 rounded-xl px-3 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
  />
</div>

    <div className="flex gap-2">
      <button onClick={editingBudget ? handleUpdateBudget : handleAddBudget} className="flex-1 bg-green-500 text-white py-3 rounded-xl font-semibold active:scale-95">
          {editingBudget ? 'Update' : 'Simpan'}
        </button>
      <button onClick={() => { setShowBudgetForm(false); setEditingBudget(null); }} className="px-4 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-white rounded-xl active:scale-95">Batal</button>
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
                                {/* ✅ TAMPILKAN KETERANGAN JIKA ADA */}
                                {b.description && (
                                  <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5 italic truncate">
                                    📝 {b.description}
                                  </p>
                                )}
                              </div> 
                              </div>
                              <div className="flex gap-1.5">
                              <button onClick={() => handleEditBudget(b)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg active:scale-90">
                                <Edit2 className="w-4 h-4 text-blue-500" />
                              </button>
                              <button onClick={() => handleViewBudget(b)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg active:scale-90">
                                <Eye className="w-4 h-4 text-slate-500" />
                              </button>
                              <button onClick={async () => { 
                          if (window.confirm(`⚠️ Hapus budget "${expenseCategories[b.category]?.name}"?\n\nTindakan ini tidak dapat dibatalkan.`)) {
                            const ok = await deleteBudget(b.id); 
                            if (ok) notify.success('Budget berhasil dihapus 🗑️'); 
                          }
                        }}
                          className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg active:scale-90">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                            </div>
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
      <button onClick={() => { setShowGoalForm(true); setEditingGoal(null); }}
        className="bg-blue-500 text-white px-3 py-2 rounded-xl text-xs font-semibold active:scale-95 flex items-center gap-1 shadow-md shadow-blue-500/30">
        <Plus className="w-3.5 h-3.5" /> Baru
      </button>
    </div>
    {(showGoalForm || editingGoal) && (
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
  placeholder="Target" inputMode="numeric" pattern="[0-9]*" className="w-full bg-slate-100 dark:bg-slate-700 rounded-xl px-3 py-3 text-base font-bold text-slate-900 dark:text-white" />
        <input type="date" value={goalForm.deadline} onChange={e => setGoalForm({ ...goalForm, deadline: e.target.value })}
          className="w-full bg-slate-100 dark:bg-slate-700 rounded-xl px-3 py-3 text-sm text-slate-900 dark:text-white" />
        <input type="text" value={formatNominalDisplay(goalForm.monthlyContribution)} onChange={e => setGoalForm({ ...goalForm, monthlyContribution: parseNominal(e.target.value).toString() })}
  placeholder="Kontribusi/bulan" inputMode="numeric" pattern="[0-9]*" className="w-full bg-slate-100 dark:bg-slate-700 rounded-xl px-3 py-3 text-sm text-slate-900 dark:text-white" />
        <div className="flex gap-2">
          <button onClick={editingGoal ? handleUpdateGoal : handleAddGoal} className="flex-1 bg-green-500 text-white py-3 rounded-xl font-semibold active:scale-95">
            {editingGoal ? 'Update' : 'Simpan'}
          </button>
          <button onClick={() => { setShowGoalForm(false); setEditingGoal(null); }} className="px-4 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-white rounded-xl active:scale-95">Batal</button>
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
                <div className="flex gap-1.5">
                  <button onClick={() => handleEditGoal(g)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg active:scale-90">
                    <Edit2 className="w-4 h-4 text-blue-500" />
                  </button>
                  <button onClick={() => handleViewGoal(g)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg active:scale-90">
                    <Eye className="w-4 h-4 text-slate-500" />
                  </button>
                  <button onClick={async () => { if (confirm('Hapus goal?')) { const ok = await deleteGoal(g.id); if (ok) notify.info('Goal dihapus'); } }}
                    className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg active:scale-90">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
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
              <button onClick={() => setFundingGoalId(g.id)}
                className="w-full bg-blue-500 text-white py-2.5 rounded-xl text-xs font-semibold active:scale-95 transition-transform">
                + Tambah Dana
              </button>
              <button 
              onClick={() => setViewingGoalHistory(g.id)}
              className="w-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-2 rounded-xl text-xs font-semibold active:scale-95 transition-transform mt-2"
            >
              📊 Lihat Riwayat ({(goalContributions || []).filter(c => c.goal_id === g.id).length})
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
               {/* PERBAIKAN: Tombol Baru sekarang mereset editingRecurring */}
               <button onClick={() => { setShowRecurringForm(true); setEditingRecurring(null); }}
                className="w-full bg-blue-500 text-white py-3 rounded-xl font-semibold active:scale-95 flex items-center justify-center gap-1 shadow-md shadow-blue-500/30">
                 <Plus className="w-4 h-4" /> Tambah Recurring
               </button>

               {/* PERBAIKAN: Tambahkan || editingRecurring agar form muncul saat edit */}
              {(showRecurringForm || editingRecurring) && (
                 <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-md space-y-3">
                   <div className="grid grid-cols-2 gap-2">
                     <button onClick={() => setRecurringForm({ ...recurringForm, type: 'expense', category: 'utilitas' })}
                      className={`py-3 rounded-xl font-semibold text-sm ${recurringForm.type === 'expense' ? 'bg-red-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>💸 Keluar</button>
                     <button onClick={() => setRecurringForm({ ...recurringForm, type: 'income', category: 'gaji' })}
                      className={`py-3 rounded-xl font-semibold text-sm ${recurringForm.type === 'income' ? 'bg-green-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>💰 Masuk</button>
                   </div>
                   <input type="text" value={recurringForm.name} onChange={e => setRecurringForm({ ...recurringForm, name: e.target.value })}
                    placeholder="Nama (Listrik, Gaji...)" className="w-full bg-slate-100 dark:bg-slate-700 rounded-xl px-3 py-3 text-sm text-slate-900 dark:text-white" />
                   {/* ✅ CUSTOM DROPDOWN KATEGORI RECURRING */}
<div className="relative">
  <button
    type="button"
    onClick={() => setIsRecurringCategoryDropdownOpen(!isRecurringCategoryDropdownOpen)}
    className="w-full bg-slate-100 dark:bg-slate-700 rounded-xl px-3 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 flex justify-between items-center"
  >
    <span className="flex items-center gap-2">
      <span>{(recurringForm.type === 'income' ? incomeCategories : expenseCategories)[recurringForm.category]?.icon || '📋'}</span>
      <span>{(recurringForm.type === 'income' ? incomeCategories : expenseCategories)[recurringForm.category]?.name || 'Pilih Kategori'}</span>
    </span>
    <span className="text-slate-400">
      {isRecurringCategoryDropdownOpen ? '▲' : '▼'}
    </span>
  </button>

  {isRecurringCategoryDropdownOpen && (
    <div className="absolute z-30 w-full mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 max-h-60 overflow-y-auto">
      {Object.entries(recurringForm.type === 'income' ? incomeCategories : expenseCategories)
          .sort(([, a], [, b]) => {
            if (a.name === 'Lainnya') return 1;
            if (b.name === 'Lainnya') return -1;
            return a.name.localeCompare(b.name);
          })
          .map(([key, cat]) => (
        <button
          key={key}
          onClick={() => {
            setRecurringForm(prev => ({ ...prev, category: key }));
            setIsRecurringCategoryDropdownOpen(false);
          }}
          className={`w-full px-3 py-2.5 text-sm flex items-center gap-2 transition-colors ${
            recurringForm.category === key
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          <span>{cat.icon}</span>
          <span>{cat.name}</span>
        </button>
      ))}
    </div>
  )}
</div>
                   <input type="text" value={formatNominalDisplay(recurringForm.amount)} onChange={e => setRecurringForm({ ...recurringForm, amount: parseNominal(e.target.value).toString() })}
                    placeholder="Rp 0" inputMode="numeric" pattern="[0-9]*"
                    className="w-full bg-slate-100 dark:bg-slate-700 rounded-xl px-3 py-3 text-base font-bold text-slate-900 dark:text-white" />
                   {/* ✅ CUSTOM DROPDOWN FREKUENSI RECURRING */}
<div className="relative">
  <button
    type="button"
    onClick={() => setIsRecurringFrequencyDropdownOpen(!isRecurringFrequencyDropdownOpen)}
    className="w-full bg-slate-100 dark:bg-slate-700 rounded-xl px-3 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 flex justify-between items-center"
  >
    <span>
      {recurringForm.frequency === 'daily' ? '📅 Harian' :
       recurringForm.frequency === 'weekly' ? '📆 Mingguan' :
       recurringForm.frequency === 'monthly' ? '🗓️ Bulanan' :
       '🎂 Tahunan'}
    </span>
    <span className="text-slate-400">
      {isRecurringFrequencyDropdownOpen ? '▲' : '▼'}
    </span>
  </button>

  {isRecurringFrequencyDropdownOpen && (
    <div className="absolute z-30 w-full mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 max-h-60 overflow-y-auto">
      {[
        { value: 'daily', label: 'Harian', icon: '📅' },
        { value: 'weekly', label: 'Mingguan', icon: '📆' },
        { value: 'monthly', label: 'Bulanan', icon: '🗓️' },
        { value: 'yearly', label: 'Tahunan', icon: '🎂' },
      ].map((freq) => (
        <button
          key={freq.value}
          onClick={() => {
            setRecurringForm(prev => ({ ...prev, frequency: freq.value as any }));
            setIsRecurringFrequencyDropdownOpen(false);
          }}
          className={`w-full px-3 py-2.5 text-sm flex items-center gap-2 transition-colors ${
            recurringForm.frequency === freq.value
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          <span>{freq.icon}</span>
          <span>{freq.label}</span>
        </button>
      ))}
    </div>
  )}
</div>
                   <input type="date" value={recurringForm.nextDate} onChange={e => setRecurringForm({ ...recurringForm, nextDate: e.target.value })}
                    className="w-full bg-slate-100 dark:bg-slate-700 rounded-xl px-3 py-3 text-sm text-slate-900 dark:text-white" />
                   <div className="flex gap-2">
                     {/* PERBAIKAN: Tombol Simpan sekarang mendukung Update */}
                     <button onClick={editingRecurring ? handleUpdateRecurring : handleAddRecurring} className="flex-1 bg-green-500 text-white py-3 rounded-xl font-semibold active:scale-95">
                       {editingRecurring ? 'Update' : 'Simpan'}
                     </button>
                     {/* PERBAIKAN: Tombol Batal sekarang mereset state edit */}
                     <button onClick={() => { setShowRecurringForm(false); setEditingRecurring(null); }} className="px-4 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-white rounded-xl active:scale-95">Batal</button>
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
                             <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              {cat?.name} • {r.frequency === 'daily' ? 'Harian' : r.frequency === 'weekly' ? 'Mingguan' : r.frequency === 'monthly' ? 'Bulanan' : 'Tahunan'}
                             </p>
                             <div className="flex items-center gap-1 mt-0.5">
                               <Calendar className="w-3 h-3 text-slate-400" />
                               <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                {daysLeft === 0 ? 'Hari ini' : daysLeft > 0 ? `${daysLeft} hari lagi` : 'Terlewat'}
                               </p>
                              {isUrgent && <Bell className="w-3 h-3 text-orange-500 animate-pulse" />}
                             </div>
                           </div>
                           <div className="text-right">
                             <p className={`text-sm font-bold ${r.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                              {r.type === 'income' ? '+' : '-'}{formatCurrency(r.amount).replace('Rp', '').trim()}
                             </p>
                             {/* ✅ TOMBOL BAYAR SEKARANG - MUNCUL JIKA JATUH TEMPO */}
{(() => {
  const daysLeft = differenceInDays(new Date(r.nextDate), new Date());
  const isOverdue = daysLeft < 0;
  const isDueToday = daysLeft === 0;
  const isDueSoon = daysLeft >= 0 && daysLeft <= r.reminderDays;
  
  // Hanya tampilkan tombol bayar jika sudah waktunya
  if (!isOverdue && !isDueToday && !isDueSoon) return null;
  
  return (
    <button
      onClick={() => handlePayRecurring(r)}
      className={`w-full mt-2 py-2 rounded-lg text-xs font-bold active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-md ${
        isOverdue 
          ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-red-500/30 animate-pulse' 
          : isDueToday
          ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-orange-500/30'
          : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-green-500/30'
      }`}
    >
      <span className="text-sm">{isOverdue ? '🚨' : isDueToday ? '⚡' : '💰'}</span>
      <span>
        {isOverdue 
          ? `Bayar Sekarang (Terlewat ${Math.abs(daysLeft)} hari)` 
          : isDueToday 
          ? 'Bayar Hari Ini' 
          : `Bayar Sekarang (${daysLeft} hari lagi)`}
      </span>
    </button>
  );
})()}

{/* Info Status Jadwal */}
{(() => {
  const daysLeft = differenceInDays(new Date(r.nextDate), new Date());
  if (daysLeft > recurringTransactions.find(x => x.id === r.id)?.reminderDays!) return null;
  
  const statusColor = daysLeft < 0 
    ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20' 
    : daysLeft === 0
    ? 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20'
    : 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20';
  
  return (
    <div className={`mt-2 px-2 py-1.5 rounded-lg text-[10px] font-semibold ${statusColor} flex items-center gap-1`}>
      <Bell className="w-3 h-3" />
      <span>
        {daysLeft < 0 
          ? `⚠️ Terlewat ${Math.abs(daysLeft)} hari - Segera bayar!` 
          : daysLeft === 0
          ? '⚡ Jatuh tempo hari ini'
          : `🔔 Jatuh tempo ${daysLeft} hari lagi`}
      </span>
    </div>
  );
})()}

{/* Tombol Aksi (Edit, View, Delete) */}
<div className="flex gap-1.5 mt-2 justify-end">
  <button onClick={() => handleEditRecurring(r)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg active:scale-90">
    <Edit2 className="w-3.5 h-3.5 text-blue-500" />
  </button>
  <button onClick={() => handleViewRecurring(r)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg active:scale-90">
    <Eye className="w-3.5 h-3.5 text-slate-500" />
  </button>
  <button onClick={async () => { 
    if (window.confirm(`⚠️ Hapus recurring "${r.name}"?\n\nTransaksi yang sudah tercatat TIDAK akan terhapus.`)) {
      const ok = await deleteRecurring(r.id); 
      if (ok) notify.success('Recurring berhasil dihapus 🗑️'); 
    }
  }}
  className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg active:scale-90">
    <Trash2 className="w-4 h-4 text-red-500" />
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

              {/* SETTINGS */}
              {activeMoreTab === 'settings' && (
                <div className="space-y-3">
                  <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-md space-y-3">
                    <h3 className="font-bold text-sm flex items-center gap-1.5 text-slate-900 dark:text-white">
                      <Cloud className="w-4 h-4" /> Google Sheets
                    </h3>
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
                  {/* ✅ TOMBOL LOGOUT BARU - PINDAH KE SINI */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-md">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                  🔐 Akun
                </h3>
                <button 
                  onClick={() => { 
                    if (window.confirm('⚠️ Yakin ingin logout?\n\nAnda harus login kembali untuk mengakses data.')) { 
                      signOut(); 
                      toast.success('Berhasil logout 👋'); 
                    } 
                  }} 
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-rose-600 text-white py-3.5 rounded-xl font-bold active:scale-95 shadow-lg shadow-red-500/30 transition-all"
                >
                  <LogOut className="w-4 h-4" /> 
                  Logout dari {profile?.full_name?.split(' ')[0] || 'Akun'}
                </button>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 text-center mt-2">
                  Data Anda tetap aman tersimpan di cloud ☁️
                </p>
              </div>
                </div>
              )}
            </div>
          )}
        </main>

      {/* MODAL DETAIL BUDGET */}
      {viewingBudget && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" 
          onClick={() => setViewingBudget(null)}
        >
          <div 
            className="bg-white dark:bg-slate-800 w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 space-y-4 animate-in slide-in-from-bottom-4 duration-300 border-t sm:border border-slate-200 dark:border-slate-700" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-2xl w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-blue-100 dark:bg-blue-900/40">
                  💰
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">
                    {expenseCategories[viewingBudget.category]?.name || 'Budget'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Bulan ini
                  </p>
                </div>
              </div>
              <button onClick={() => setViewingBudget(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Budget Details */}
            <div className="space-y-3">
              {/* ✅ KETERANGAN BUDGET */}
              {viewingBudget.description && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 border border-blue-200 dark:border-blue-800">
                  <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">📝 Keterangan</p>
                  <p className="text-sm text-slate-900 dark:text-white leading-relaxed">
                    {viewingBudget.description}
                  </p>
                </div>
              )}

              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Limit</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {formatCurrency(viewingBudget.limit)}
                </p>
              </div>
              
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Spent</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {formatCurrency(monthlySpending[viewingBudget.category] || 0)}
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Remaining</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {formatCurrency(viewingBudget.limit - (monthlySpending[viewingBudget.category] || 0))}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <button 
              onClick={() => {
              setEditingBudget(viewingBudget);
              setViewingBudget(null);
              setBudgetForm({
                category: viewingBudget.category,
                limit: viewingBudget.limit.toString(),
                description: viewingBudget.description || '' // ✅ TAMBAHKAN INI
              });
              setShowBudgetForm(true);
            }}
              className="w-full bg-blue-500 text-white py-3 rounded-xl font-semibold active:scale-95 transition-transform shadow-lg shadow-blue-500/20"
            >
              ✏️ Edit Budget
            </button>
          </div>
        </div>
      )}

      {/* MODAL DETAIL GOAL */}
      {viewingGoal && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" 
          onClick={() => setViewingGoal(null)}
        >
          <div 
            className="bg-white dark:bg-slate-800 w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 space-y-4 animate-in slide-in-from-bottom-4 duration-300 border-t sm:border border-slate-200 dark:border-slate-700" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-2xl w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-purple-100 dark:bg-purple-900/40">
                  {viewingGoal.icon}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">
                    {viewingGoal.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Target: {formatCurrency(viewingGoal.targetAmount)}
                  </p>
                </div>
              </div>
              <button onClick={() => setViewingGoal(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Goal Details */}
            <div className="space-y-3">
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Target</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {formatCurrency(viewingGoal.targetAmount)}
                </p>
              </div>
              
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Current</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {formatCurrency(viewingGoal.currentAmount)}
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Progress</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {((viewingGoal.currentAmount / viewingGoal.targetAmount) * 100).toFixed(0)}%
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <button 
              onClick={() => {
                setEditingGoal(viewingGoal);
                setViewingGoal(null);
                setGoalForm({
                  name: viewingGoal.name,
                  targetAmount: viewingGoal.targetAmount.toString(),
                  deadline: viewingGoal.deadline || '',
                  monthlyContribution: viewingGoal.monthlyContribution ? viewingGoal.monthlyContribution.toString() : '',
                  icon: viewingGoal.icon
                });
                setShowGoalForm(true);
              }}
              className="w-full bg-blue-500 text-white py-3 rounded-xl font-semibold active:scale-95 transition-transform shadow-lg shadow-blue-500/20"
            >
              ✏️ Edit Goal
            </button>
          </div>
        </div>
      )}

          {/* MODAL RIWAYAT GOAL (FIXED) */}
{viewingGoalHistory && (
  <div 
    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
    onClick={() => setViewingGoalHistory(null)}
  >
    <div 
      className="bg-white dark:bg-slate-800 w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 space-y-4 animate-in slide-in-from-bottom-4 max-h-[80vh] overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800 pb-2">
        <h3 className="font-bold text-lg text-slate-900 dark:text-white">📊 Riwayat Tabungan</h3>
        <button onClick={() => setViewingGoalHistory(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full">
          <X className="w-5 h-5 text-slate-500" />
        </button>
      </div>

      {/* Statistik */}
      {(() => {
        const contributions = (goalContributions || []).filter(c => c.goal_id === viewingGoalHistory);
        const total = contributions.reduce((sum, c) => sum + c.amount, 0);
        const monthsCount = Math.max(1, new Set(contributions.map(c => c.date.substring(0, 7))).size);
        const avgPerMonth = total / monthsCount;
        
        return (
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3">
              <p className="text-[10px] text-green-600 dark:text-green-400 mb-0.5">Total Terkumpul</p>
              <p className="text-sm font-bold text-green-700 dark:text-green-300">{formatCurrency(total)}</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3">
              <p className="text-[10px] text-blue-600 dark:text-blue-400 mb-0.5">Rata-rata/bulan</p>
              <p className="text-sm font-bold text-blue-700 dark:text-blue-300">{formatCurrency(avgPerMonth)}</p>
            </div>
          </div>
        );
      })()}

      {/* Timeline List */}
      <div className="space-y-3">
        {(() => {
          const contributions = (goalContributions || []).filter(c => c.goal_id === viewingGoalHistory);
          
          if (contributions.length === 0) {
            return <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-4">Belum ada riwayat tabungan.</p>;
          }

          const grouped = contributions.reduce((acc, c) => {
            const month = format(new Date(c.date), 'MMMM yyyy', { locale: id });
            if (!acc[month]) acc[month] = [];
            acc[month].push(c);
            return acc;
          }, {} as Record<string, any[]>);

          return Object.entries(grouped).map(([month, items]) => (
            <div key={month}>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">{month}</p>
              <div className="space-y-2">
                {items.map((c: any) => (
                  <div key={c.id} className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 flex justify-between items-start group">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-green-600 dark:text-green-400">
                        + {formatCurrency(c.amount)}
                      </p>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        <span>{format(new Date(c.date), 'dd MMM yyyy', { locale: id })}</span>
                        <span>•</span>
                        <Clock className="w-3 h-3" />
                        <span>{format(new Date(c.date), 'HH:mm')}</span>
                      </div>
                      {c.note && (
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 italic">"{c.note}"</p>
                      )}
                    </div>
                    
                    {/* Aksi Edit & Hapus */}
                <div className="flex gap-1 ml-2">
                  {/* ✅ TOMBOL EDIT BARU */}
                  <button
                    onClick={() => {
                      // Set state edit
                      setEditingContributionId(c.id);
                      setEditingContributionAmount(c.amount.toString());
                      
                      // Parse tanggal & waktu dari string ISO
                      const d = new Date(c.date);
                      setEditingContributionDate(format(d, 'yyyy-MM-dd'));
                      setEditingContributionTime(format(d, 'HH:mm'));
                      setEditingContributionNote(c.note || '');
                      
                      // Tutup modal riwayat agar modal edit langsung fokus
                      setViewingGoalHistory(null); 
                    }}
                    className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-blue-500" />
                  </button>

                  {/* TOMBOL HAPUS */}
                  <button
                onClick={async () => {
                  if (window.confirm('Hapus riwayat ini? Dana akan dikurangi dari Goal dan transaksi terkait (jika ada) juga akan dihapus.')) {
                    const goal = goals.find(g => g.id === viewingGoalHistory);
                    if (goal) {
                        // Cari dan hapus transaksi yang terhubung
                        const linkedTx = findLinkedTransaction(c.id, c.amount, c.date);
                        if (linkedTx) {
                            await deleteTransaction(linkedTx.id);
                        }
                    }
                    await deleteGoalContribution(c.id);
                  }
                 }}
                className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
               >
                 <Trash2 className="w-3.5 h-3.5 text-red-500" />
               </button>
                </div>
                  </div>
                ))}
              </div>
            </div>
          ));
        })()}
      </div>
    </div>
  </div>
)}

      {/* MODAL DETAIL RECURRING */}
      {viewingRecurring && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" 
          onClick={() => setViewingRecurring(null)}
        >
          <div 
            className="bg-white dark:bg-slate-800 w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 space-y-4 animate-in slide-in-from-bottom-4 duration-300 border-t sm:border border-slate-200 dark:border-slate-700" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-2xl w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-green-100 dark:bg-green-900/40">
                  {viewingRecurring.type === 'income' ? '💰' : '💸'}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">
                    {viewingRecurring.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {viewingRecurring.frequency === 'daily' ? 'Harian' : viewingRecurring.frequency === 'weekly' ? 'Mingguan' : viewingRecurring.frequency === 'monthly' ? 'Bulanan' : 'Tahunan'}
                  </p>
                </div>
              </div>
              <button onClick={() => setViewingRecurring(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Recurring Details */}
            <div className="space-y-3">
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Jumlah</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {viewingRecurring.type === 'income' ? '+' : '-'}{formatCurrency(viewingRecurring.amount)}
                </p>
              </div>
              
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Kategori</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {(viewingRecurring.type === 'income' ? incomeCategories : expenseCategories)[viewingRecurring.category]?.name}
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Tanggal Berikutnya</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {format(new Date(viewingRecurring.nextDate), 'dd MMM yyyy', { locale: id })}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <button 
              onClick={() => {
                setEditingRecurring(viewingRecurring);
                setViewingRecurring(null);
                setRecurringForm({
                  name: viewingRecurring.name,
                  amount: viewingRecurring.amount.toString(),
                  type: viewingRecurring.type,
                  category: viewingRecurring.category,
                  frequency: viewingRecurring.frequency,
                  nextDate: viewingRecurring.nextDate,
                  reminderDays: viewingRecurring.reminderDays
                });
                setShowRecurringForm(true);
              }}
              className="w-full bg-blue-500 text-white py-3 rounded-xl font-semibold active:scale-95 transition-transform shadow-lg shadow-blue-500/20"
            >
              ✏️ Edit Recurring
            </button>
          </div>
        </div>
      )}

        {/* BOTTOM NAVIGATION */}
        <nav 
  className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shadow-2xl z-30"
  style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
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
      className={`flex flex-col items-center justify-center py-2.5 transition-all active:scale-90 ${isActive ? 'text-blue-500' : 'text-slate-400 dark:text-slate-500'}`}>
      <div className={`w-12 h-8 rounded-xl flex items-center justify-center transition-all ${isActive ? 'bg-blue-100 dark:bg-blue-900/40' : ''}`}>
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-[10px] font-medium mt-0.5">{tab.label}</span>
    </button>
  );
})}
          </div>

{/* MODAL EDIT RIWAYAT GOAL CONTRIBUTION */}
{editingContributionId && (
  <div
    className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    onClick={() => setEditingContributionId(null)}
  >
    <div
      className="bg-white dark:bg-slate-800 w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 space-y-4 animate-in slide-in-from-bottom-4"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
          ✏️ Edit Riwayat
        </h3>
        <button onClick={() => setEditingContributionId(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full">
          <X className="w-5 h-5 text-slate-500" />
        </button>
      </div>

      {/* Input Nominal */}
      <div>
        <label className="block text-xs font-semibold mb-1.5 text-slate-600 dark:text-slate-300">Nominal</label>
        <input
          type="text"
          value={formatNominalDisplay(editingContributionAmount)}
          onChange={(e) => setEditingContributionAmount(parseNominal(e.target.value).toString())}
          placeholder="Rp 0"
          inputMode="numeric"
          pattern="[0-9]*"
          autoFocus
          className="w-full bg-slate-100 dark:bg-slate-700 rounded-xl px-3 py-3 text-base font-bold text-slate-900 dark:text-white"
        />
      </div>

      {/* Input Tanggal */}
      <div>
        <label className="block text-xs font-semibold mb-1.5 text-slate-600 dark:text-slate-300">Tanggal</label>
        <input
          type="date"
          value={editingContributionDate}
          onChange={(e) => setEditingContributionDate(e.target.value)}
          className="w-full bg-slate-100 dark:bg-slate-700 rounded-xl px-3 py-3 text-sm text-slate-900 dark:text-white"
        />
      </div>

      {/* Input Waktu */}
      <div>
        <label className="block text-xs font-semibold mb-1.5 text-slate-600 dark:text-slate-300">Waktu</label>
        <input
          type="time"
          value={editingContributionTime}
          onChange={(e) => setEditingContributionTime(e.target.value)}
          className="w-full bg-slate-100 dark:bg-slate-700 rounded-xl px-3 py-3 text-sm text-slate-900 dark:text-white"
        />
      </div>

      {/* Input Catatan */}
      <div>
        <label className="block text-xs font-semibold mb-1.5 text-slate-600 dark:text-slate-300">
          Catatan <span className="text-slate-400">(opsional)</span>
        </label>
        <input
          type="text"
          value={editingContributionNote}
          onChange={(e) => setEditingContributionNote(e.target.value)}
          placeholder="Misal: Bonus, sisa gaji, dll"
          className="w-full bg-slate-100 dark:bg-slate-700 rounded-xl px-3 py-3 text-sm text-slate-900 dark:text-white"
        />
      </div>

      {/* Tombol Simpan */}
      <button
        onClick={handleUpdateContribution}
        className="w-full bg-blue-500 text-white py-3.5 rounded-xl font-bold active:scale-95 transition-transform shadow-lg shadow-blue-500/20"
      >
        💾 Simpan Perubahan
      </button>
    </div>
  </div>
)}

      {/* MODAL TAMBAH DANA GOAL */}
      {fundingGoalId && (
  <div 
    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
    onClick={() => setFundingGoalId(null)}
  >
    <div 
      className="bg-white dark:bg-slate-800 w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 space-y-4 animate-in slide-in-from-bottom-4"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">
            💰 Tambah Dana
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {goals.find(g => g.id === fundingGoalId)?.name}
          </p>
        </div>
        <button onClick={() => setFundingGoalId(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full">
          <X className="w-5 h-5 text-slate-500" />
        </button>
      </div>

      {/* Info Goal */}
      {(() => {
        const goal = goals.find(g => g.id === fundingGoalId);
        if (!goal) return null;
        const pct = (goal.currentAmount / goal.targetAmount) * 100;
        return (
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-500 dark:text-slate-400">Progress</span>
              <span className="font-bold text-slate-900 dark:text-white">{pct.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full"
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
            </p>
          </div>
        );
      })()}

      {/* Input Nominal */}
      <div>
        <label className="block text-xs font-semibold mb-1.5 text-slate-600 dark:text-slate-300">
          Nominal
        </label>
        <input 
          type="text" 
          value={formatNominalDisplay(fundingAmount)} 
          onChange={(e) => setFundingAmount(parseNominal(e.target.value).toString())}
          placeholder="Rp 0" 
          inputMode="numeric" 
          pattern="[0-9]*"
          autoFocus
          className="w-full bg-slate-100 dark:bg-slate-700 rounded-xl px-3 py-3 text-base font-bold text-slate-900 dark:text-white" 
        />
      </div>

      {/* Input Tanggal */}
      <div>
        <label className="block text-xs font-semibold mb-1.5 text-slate-600 dark:text-slate-300">
          Tanggal
        </label>
        <input 
          type="date" 
          value={fundingDate} 
          onChange={(e) => setFundingDate(e.target.value)}
          max={format(new Date(), 'yyyy-MM-dd')}
          className="w-full bg-slate-100 dark:bg-slate-700 rounded-xl px-3 py-3 text-sm text-slate-900 dark:text-white" 
        />
      </div>

{/* Input Waktu - TAMBAH INI */}
<div>
  <label className="block text-xs font-semibold mb-1.5 text-slate-600 dark:text-slate-300">
    Waktu
  </label>
  <input 
    type="time" 
    value={fundingTime} 
    onChange={(e) => setFundingTime(e.target.value)}
    className="w-full bg-slate-100 dark:bg-slate-700 rounded-xl px-3 py-3 text-sm text-slate-900 dark:text-white" 
  />
</div>

      {/* Input Catatan */}
      <div>
        <label className="block text-xs font-semibold mb-1.5 text-slate-600 dark:text-slate-300">
          Catatan <span className="text-slate-400">(opsional)</span>
        </label>
        <input 
          type="text" 
          value={fundingNote} 
          onChange={(e) => setFundingNote(e.target.value)}
          placeholder="Misal: Bonus, sisa gaji, dll"
          className="w-full bg-slate-100 dark:bg-slate-700 rounded-xl px-3 py-3 text-sm text-slate-900 dark:text-white" 
        />
      </div>

      {/* ✅ CHECKBOX OPSIONAL - TAMBAH INI */}
<label className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl cursor-pointer active:scale-[0.98] transition-transform border border-transparent hover:border-blue-300 dark:hover:border-blue-600">
  <input 
    type="checkbox" 
    checked={fundingAsExpense} 
    onChange={(e) => setFundingAsExpense(e.target.checked)}
    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500" 
  />
  <div className="flex-1">
    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
      💰 Catat sebagai penarikan/tabungan terpisah
    </p>
    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
      Centang jika uang ini benar-benar keluar dari rekening utama (misal: transfer ke rekening tabungan terpisah). Jangan centang jika hanya mengalokasikan uang yang sudah ada.
    </p>
  </div>
</label>

      {/* Tombol Submit */}
      <button 
        onClick={handleAddFundsToGoal}
        className="w-full bg-green-500 text-white py-3.5 rounded-xl font-bold active:scale-95 transition-transform shadow-lg shadow-green-500/20"
      >
        ✅ Tambahkan Sekarang
      </button>
    </div>
  </div>
)}

                {/* MODAL DETAIL TRANSAKSI */}
      {viewingTransaction && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" 
          onClick={() => setViewingTransaction(null)}
        >
          <div 
            className="bg-white dark:bg-slate-800 w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 space-y-4 animate-in slide-in-from-bottom-4 duration-300 border-t sm:border border-slate-200 dark:border-slate-700" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`text-2xl w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${viewingTransaction.type === 'income' ? 'bg-green-100 dark:bg-green-900/40' : 'bg-red-100 dark:bg-red-900/40'}`}>
                  {(viewingTransaction.type === 'income' ? incomeCategories : expenseCategories)[viewingTransaction.category]?.icon || '💰'}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">
                    {(viewingTransaction.type === 'income' ? incomeCategories : expenseCategories)[viewingTransaction.category]?.name || 'Transaksi'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {format(new Date(viewingTransaction.date), 'dd MMMM yyyy', { locale: id })}
                  </p>
                  {/* ✅ BADGE METODE PEMBAYARAN DI MODAL VIEW */}
                  {viewingTransaction.payment_method && paymentMethods[viewingTransaction.payment_method] && (
                    <span className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${paymentMethods[viewingTransaction.payment_method].bg} ${paymentMethods[viewingTransaction.payment_method].color}`}>
                      {paymentMethods[viewingTransaction.payment_method].icon} {paymentMethods[viewingTransaction.payment_method].name}
                    </span>
                  )}
                  {!viewingTransaction.payment_method && (
                    <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                      💵 Tunai (default)
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => setViewingTransaction(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Nominal Besar */}
            <div className={`text-2xl sm:text-3xl font-extrabold text-center py-4 rounded-2xl ${viewingTransaction.type === 'income' ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'}`}>
              {viewingTransaction.type === 'income' ? '+' : '-'} {formatCurrency(viewingTransaction.amount).replace('Rp', 'Rp ')}
            </div>

                     {/* ✅ DETAIL DESKRIPSI & CATATAN (CLEAN VERSION) */}
          <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar">
            
            {/* 1. DESKRIPSI UTAMA */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Deskripsi</p>
              <p className="text-sm text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700 leading-relaxed">
                {viewingTransaction.description || '-'}
              </p>
            </div>

            {/* 2. RINCIAN ITEM (Single Source of Truth) */}
            {(() => {
              const items = parseItemsFromNotes(viewingTransaction.notes);
              const hasItemsTag = viewingTransaction.notes?.includes('[items:');
              
              // Jika ada tag tapi gagal parse -> Tampilkan Warning
              if (hasItemsTag && items.length === 0) {
                return (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex gap-2 items-start">
                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-red-600 dark:text-red-400">Data Rincian Rusak</p>
                      <p className="text-[10px] text-red-500 dark:text-red-300 mt-0.5">Format JSON tidak valid. Silakan Edit transaksi ini untuk memperbaiki rincian.</p>
                    </div>
                  </div>
                );
              }
              
              // Jika tidak ada items sama sekali -> Jangan render apa-apa
              if (items.length === 0) return null;
              
              const subtotal = items.reduce((s, i) => s + (i.qty * i.price), 0);
              
              return (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    📋 Rincian Item <span className="text-[9px] bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 px-1.5 py-0.5 rounded-full">{items.length} item</span>
                  </p>
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
                    {items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center px-3 py-2.5 border-b border-slate-100 dark:border-slate-700 last:border-0 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors">
                        <div className="flex-1 min-w-0 pr-2">
                          <span className="text-sm text-slate-800 dark:text-slate-200 truncate block font-medium">
                            {item.name || '(Tanpa nama)'}
                          </span>
                          {item.qty > 1 && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              {item.qty}x @ {formatCurrency(item.price)}
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap tabular-nums">
                          {formatCurrency(item.qty * item.price)}
                        </span>
                      </div>
                    ))}
                    
                    {/* Footer Subtotal */}
                    <div className="flex justify-between items-center px-3 py-2.5 bg-blue-50/50 dark:bg-blue-900/10 border-t border-slate-100 dark:border-slate-700">
                      <span className="text-xs font-bold text-blue-700 dark:text-blue-300">Subtotal Item</span>
                      <span className="text-sm font-extrabold text-blue-700 dark:text-blue-300 tabular-nums">
                        {formatCurrency(subtotal)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 3. CATATAN TAMBAHAN (Deep Cleaned) */}
            {(() => {
              // Bersihkan SEMUA variasi tag items (valid, rusak, terpotong)
              const cleanNotes = (viewingTransaction.notes || '')
                .replace(/\[items:[\s\S]*?\]/g, '')      // Hapus tag valid [... ]
                .replace(/\[items:[\s\S]*$/g, '')        // Hapus tag rusak/terpotong di akhir string
                .replace(/\]\s*$/, '')                   // Hapus kurung siku tutup  di akhir
                .replace(/^\]\s*/, '')                   // Hapus kurung siku buka di awal
                .trim();
              
              if (!cleanNotes) return null;
              
              return (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Catatan Tambahan</p>
                  <p className="text-sm text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700 whitespace-pre-wrap leading-relaxed">
                    {cleanNotes}
                  </p>
                </div>
              );
            })()}
          </div>
        
            {/* Action Buttons */}
            <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
              <button 
                onClick={() => { handleEdit(viewingTransaction); setViewingTransaction(null); }}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-500 text-white py-3 rounded-xl font-semibold active:scale-95 transition-transform shadow-lg shadow-blue-500/20"
              >
                <Edit2 className="w-2 h-2" /> Edit
              </button>
              <button 
                onClick={() => { if(window.confirm('Hapus transaksi ini?')) { handleDelete(viewingTransaction.id); setViewingTransaction(null); } }}
                className="flex items-center justify-center gap-2 bg-red-100 dark:bg-red-900/30 text-red-500 px-5 py-3 rounded-xl font-semibold active:scale-95 transition-transform"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
        </nav>
      </div>
    </div>
    </ErrorBoundary>
  );
}