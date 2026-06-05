import React, { useState, useEffect, useRef, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import {
  Plus, Trash2, Edit2, TrendingUp, TrendingDown, Calendar, Filter, BarChart3,
  Home, Upload, Cloud, AlertCircle, CheckCircle, Loader, Eye, EyeOff, X,
  PieChart, ArrowUpRight, ArrowDownLeft, DollarSign, Zap, Lightbulb, AlertTriangle,
  Target, Repeat, Bell, Sun, Moon, Download, Settings as SettingsIcon, Camera, Image as ImageIcon
} from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import toast, { Toaster } from 'react-hot-toast';
import { format, addMonths, addWeeks, addYears, addDays, differenceInDays, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { id } from 'date-fns/locale';

// ==================== TYPES ====================
interface Transaction {
  id: string;
  date: string;
  type: 'income' | 'expense';
  category: string;
  subcategory: string;
  description: string;
  amount: number;
  notes?: string;
  imageData?: string;
  syncedToSheets?: boolean;
  createdAt: string;
  recurringId?: string;
}

interface CategoryConfig {
  id: string;
  name: string;
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
  alerts: { threshold50: boolean; threshold80: boolean; threshold100: boolean };
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
  priority: 'high' | 'medium' | 'low';
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
  dueDate?: number;
  reminderDays: number;
  isActive: boolean;
  lastProcessed?: string;
}

type TabType = 'dashboard' | 'input' | 'scan' | 'history' | 'analisis' | 'budget' | 'goals' | 'recurring' | 'settings';

// ==================== CONSTANTS ====================
const incomeCategories: Record<string, CategoryConfig> = {
  gaji: { id: 'gaji', name: '💼 Gaji', icon: '💼', color: 'text-green-600', bgColor: 'bg-green-100', type: 'income' },
  usaha: { id: 'usaha', name: '🏪 Usaha', icon: '🏪', color: 'text-blue-600', bgColor: 'bg-blue-100', type: 'income' },
  investasi: { id: 'investasi', name: '📈 Investasi', icon: '📈', color: 'text-purple-600', bgColor: 'bg-purple-100', type: 'income' },
  lainnya: { id: 'lainnya', name: '🎁 Lainnya', icon: '🎁', color: 'text-yellow-600', bgColor: 'bg-yellow-100', type: 'income' },
};

const expenseCategories: Record<string, CategoryConfig> = {
  rumah_tangga: { id: 'rumah_tangga', name: '🏠 Rumah', icon: '🏠', color: 'text-orange-600', bgColor: 'bg-orange-100', type: 'expense' },
  utilitas: { id: 'utilitas', name: '⚡ Utilitas', icon: '⚡', color: 'text-yellow-600', bgColor: 'bg-yellow-100', type: 'expense' },
  makanan: { id: 'makanan', name: '🍜 Makanan', icon: '🍜', color: 'text-orange-500', bgColor: 'bg-orange-50', type: 'expense' },
  transportasi: { id: 'transportasi', name: '🚗 Transport', icon: '🚗', color: 'text-red-600', bgColor: 'bg-red-100', type: 'expense' },
  pendidikan: { id: 'pendidikan', name: '📚 Pendidikan', icon: '📚', color: 'text-indigo-600', bgColor: 'bg-indigo-100', type: 'expense' },
  kesehatan: { id: 'kesehatan', name: '🏥 Kesehatan', icon: '🏥', color: 'text-red-500', bgColor: 'bg-red-50', type: 'expense' },
  cicilan: { id: 'cicilan', name: '💳 Cicilan', icon: '💳', color: 'text-blue-700', bgColor: 'bg-blue-100', type: 'expense' },
  asuransi: { id: 'asuransi', name: '🛡️ Asuransi', icon: '🛡️', color: 'text-indigo-500', bgColor: 'bg-indigo-50', type: 'expense' },
  investasi_exp: { id: 'investasi_exp', name: '💰 Investasi', icon: '💰', color: 'text-green-600', bgColor: 'bg-green-100', type: 'expense' },
  hiburan: { id: 'hiburan', name: '🎬 Hiburan', icon: '🎬', color: 'text-pink-600', bgColor: 'bg-pink-100', type: 'expense' },
  belanja: { id: 'belanja', name: '🛍️ Belanja', icon: '🛍️', color: 'text-rose-600', bgColor: 'bg-rose-100', type: 'expense' },
  rekreasi: { id: 'rekreasi', name: '✈️ Rekreasi', icon: '✈️', color: 'text-cyan-600', bgColor: 'bg-cyan-100', type: 'expense' },
  sosial: { id: 'sosial', name: '🤝 Sosial', icon: '🤝', color: 'text-purple-600', bgColor: 'bg-purple-100', type: 'expense' },
  anak: { id: 'anak', name: '👶 Anak', icon: '👶', color: 'text-pink-500', bgColor: 'bg-pink-50', type: 'expense' },
  cadangan: { id: 'cadangan', name: '🔐 Cadangan', icon: '🔐', color: 'text-slate-600', bgColor: 'bg-slate-100', type: 'expense' },
};

const descriptionPlaceholders: Record<string, Record<string, string>> = {
  income: {
    gaji: 'Contoh: Gaji bulan ini',
    usaha: 'Contoh: Penjualan barang atau jasa',
    investasi: 'Contoh: Dividen saham, bunga bank',
    lainnya: 'Contoh: Hadiah, bonus, cashback',
  },
  expense: {
    rumah_tangga: 'Contoh: Sewa rumah, iuran lingkungan',
    utilitas: 'Contoh: Listrik, air, gas, internet',
    makanan: 'Contoh: Belanja atau makan di luar',
    transportasi: 'Contoh: BBM, tol, parkir',
    pendidikan: 'Contoh: SPP, buku, kursus',
    kesehatan: 'Contoh: Dokter, obat, medical check-up',
    cicilan: 'Contoh: Cicilan KPR, mobil, pinjaman',
    asuransi: 'Contoh: Asuransi jiwa, kendaraan',
    investasi_exp: 'Contoh: Saham, reksadana, emas',
    hiburan: 'Contoh: Bioskop, game, streaming',
    belanja: 'Contoh: Pakaian, sepatu, kosmetik',
    rekreasi: 'Contoh: Liburan, hotel, tiket',
    sosial: 'Contoh: Hadiah, pernikahan, donasi',
    anak: 'Contoh: Susu, mainan, les, sekolah',
    cadangan: 'Contoh: Dana darurat, perbaikan',
  },
};

const PIE_COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

// ==================== UTILS ====================
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatNominalDisplay = (amount: string): string => {
  if (!amount) return '';
  const numOnly = amount.replace(/\D/g, '');
  if (!numOnly) return '';
  return 'Rp ' + parseInt(numOnly).toLocaleString('id-ID');
};

const parseNominal = (value: string): number => {
  return parseInt(value.replace(/\D/g, '')) || 0;
};

const notify = {
  success: (message: string) => toast.success(message, {
    duration: 3000,
    style: { background: '#10b981', color: '#fff' },
    iconTheme: { primary: '#fff', secondary: '#10b981' }
  }),
  error: (message: string) => toast.error(message, {
    duration: 4000,
    style: { background: '#ef4444', color: '#fff' },
  }),
  warning: (message: string) => toast(message, {
    duration: 4000,
    icon: '⚠️',
    style: { background: '#f59e0b', color: '#fff' },
  }),
  info: (message: string) => toast(message, {
    duration: 3000,
    icon: 'ℹ️',
    style: { background: '#3b82f6', color: '#fff' },
  }),
  budgetAlert: (category: string, percentage: number) => {
    toast(`Budget ${category} sudah ${percentage.toFixed(0)}%!`, {
      duration: 5000,
      icon: percentage >= 100 ? '🚨' : '💰',
      style: {
        background: percentage >= 100 ? '#dc2626' : '#f59e0b',
        color: '#fff',
      },
    });
  },
};

const APPS_SCRIPT_CODE = `function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = JSON.parse(e.postData.contents);
    sheet.appendRow([new Date(), data.date, data.type, data.category, data.description, data.amount, data.notes || '']);
    return ContentService.createTextOutput(JSON.stringify({status:'success'})).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({status:'error', message: error.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}`;

// ==================== ERROR BOUNDARY ====================
interface EBProps { children: ReactNode; }
interface EBState { hasError: boolean; error?: Error; }

class ErrorBoundary extends Component<EBProps, EBState> {
  public state: EBState = { hasError: false };
  
  public static getDerivedStateFromError(error: Error): EBState {
    return { hasError: true, error };
  }
  
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }
  
  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full shadow-xl border border-red-700">
            <div className="text-red-500 text-5xl mb-4 text-center">⚠️</div>
            <h2 className="text-xl font-bold text-white mb-2 text-center">Terjadi Kesalahan</h2>
            <p className="text-gray-300 mb-4 text-center text-sm">Aplikasi mengalami masalah. Silakan refresh halaman.</p>
            {this.state.error && (
              <details className="mb-4 bg-slate-900 p-3 rounded text-xs overflow-auto">
                <summary className="cursor-pointer font-semibold text-gray-400">Detail Error</summary>
                <pre className="mt-2 whitespace-pre-wrap text-red-400">{this.state.error.message}</pre>
              </details>
            )}
            <button onClick={() => window.location.reload()} className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg font-semibold transition">
              Refresh Halaman
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ==================== MAIN COMPONENT ====================
export default function CatanKeuangan() {
  // ========== STATE MANAGEMENT ==========
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
  const [filterDate, setFilterDate] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [googleSheetId, setGoogleSheetId] = useState(() => localStorage.getItem('keuangan_sheetId') || '');
  const [scriptUrl, setScriptUrl] = useState(() => localStorage.getItem('keuangan_scriptUrl') || '');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'expense' as 'income' | 'expense',
    category: 'makanan',
    subcategory: '',
    description: '',
    amount: '',
    notes: '',
  });

  // ========== THEME MANAGEMENT ==========
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('theme')) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // ========== LOCAL STORAGE ==========
  useEffect(() => {
    const saved = localStorage.getItem('keuangan_transactions');
    const savedBudgets = localStorage.getItem('keuangan_budgets');
    const savedGoals = localStorage.getItem('keuangan_goals');
    const savedRecurring = localStorage.getItem('keuangan_recurring');
    
    if (saved) setTransactions(JSON.parse(saved));
    if (savedBudgets) setBudgets(JSON.parse(savedBudgets));
    if (savedGoals) setGoals(JSON.parse(savedGoals));
    if (savedRecurring) setRecurringTransactions(JSON.parse(savedRecurring));
  }, []);

  useEffect(() => { localStorage.setItem('keuangan_transactions', JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem('keuangan_budgets', JSON.stringify(budgets)); }, [budgets]);
  useEffect(() => { localStorage.setItem('keuangan_goals', JSON.stringify(goals)); }, [goals]);
  useEffect(() => { localStorage.setItem('keuangan_recurring', JSON.stringify(recurringTransactions)); }, [recurringTransactions]);

  // ========== TESSERACT LOAD ==========
  useEffect(() => {
    if (!(window as any).Tesseract) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.0.4/dist/tesseract.min.js';
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  // ========== RECURRING PROCESSOR ==========
  useEffect(() => {
    const processRecurring = () => {
      const now = new Date();
      const newTransactions: Transaction[] = [];
      const updated: RecurringTransaction[] = [];
      
      recurringTransactions.forEach(r => {
        if (!r.isActive) {
          updated.push(r);
          return;
        }
        const nextDate = new Date(r.nextDate);
        if (nextDate <= now) {
          newTransactions.push({
            id: Date.now().toString() + Math.random(),
            date: now.toISOString().split('T')[0],
            type: r.type,
            category: r.category,
            subcategory: '',
            description: `Auto: ${r.name}`,
            amount: r.amount,
            createdAt: now.toISOString(),
            recurringId: r.id,
          });
          
          const next = new Date(nextDate);
          switch (r.frequency) {
            case 'daily': next.setDate(next.getDate() + 1); break;
            case 'weekly': next.setDate(next.getDate() + 7); break;
            case 'monthly': next.setMonth(next.getMonth() + 1); break;
            case 'yearly': next.setFullYear(next.getFullYear() + 1); break;
          }
          updated.push({ ...r, nextDate: next.toISOString().split('T')[0], lastProcessed: now.toISOString() });
        } else {
          updated.push(r);
        }
      });
      
      if (newTransactions.length > 0) {
        setTransactions(prev => [...newTransactions, ...prev]);
        setRecurringTransactions(updated);
        notify.success(`${newTransactions.length} transaksi recurring diproses otomatis`);
      }
    };
    
    if (recurringTransactions.length > 0) {
      processRecurring();
    }
  }, []);

  // ========== BUDGET ALERTS ==========
  useEffect(() => {
    if (budgets.length === 0 || transactions.length === 0) return;
    
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    
    const monthlySpending: Record<string, number> = {};
    transactions.forEach(t => {
      const d = new Date(t.date);
      if (t.type === 'expense' && isWithinInterval(d, { start: monthStart, end: monthEnd })) {
        monthlySpending[t.category] = (monthlySpending[t.category] || 0) + t.amount;
      }
    });
    
    budgets.forEach(budget => {
      const spent = monthlySpending[budget.category] || 0;
      const percentage = (spent / budget.limit) * 100;
      const catName = expenseCategories[budget.category]?.name || budget.category;
      
      if (percentage >= 100 && !budget.notified?.threshold100) {
        notify.budgetAlert(catName, percentage);
        setBudgets(prev => prev.map(b => b.id === budget.id ? { ...b, notified: { ...b.notified, threshold100: true } } : b));
      } else if (percentage >= 80 && percentage < 100 && !budget.notified?.threshold80) {
        notify.budgetAlert(catName, percentage);
        setBudgets(prev => prev.map(b => b.id === budget.id ? { ...b, notified: { ...b.notified, threshold80: true } } : b));
      } else if (percentage >= 50 && percentage < 80 && !budget.notified?.threshold50) {
        notify.budgetAlert(catName, percentage);
        setBudgets(prev => prev.map(b => b.id === budget.id ? { ...b, notified: { ...b.notified, threshold50: true } } : b));
      }
    });
  }, [transactions, budgets]);

  // ========== COMPUTED VALUES (MEMOIZED) ==========
  const getMonthlyIncome = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return transactions
      .filter(t => {
        const transDate = new Date(t.date);
        return t.type === 'income' && transDate.getMonth() === currentMonth && transDate.getFullYear() === currentYear;
      })
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const getMonthlyExpense = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return transactions
      .filter(t => {
        const transDate = new Date(t.date);
        return t.type === 'expense' && transDate.getMonth() === currentMonth && transDate.getFullYear() === currentYear;
      })
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const getSavings = useMemo(() => getMonthlyIncome - getMonthlyExpense, [getMonthlyIncome, getMonthlyExpense]);

  const monthlySpending = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const spending: Record<string, number> = {};
    transactions.forEach(t => {
      const d = new Date(t.date);
      if (t.type === 'expense' && isWithinInterval(d, { start: monthStart, end: monthEnd })) {
        spending[t.category] = (spending[t.category] || 0) + t.amount;
      }
    });
    return spending;
  }, [transactions]);

  const expensePieData = useMemo(() => {
    return Object.entries(monthlySpending).map(([name, value]) => ({
      name: expenseCategories[name]?.name || name,
      value,
    }));
  }, [monthlySpending]);

  const monthlyBarData = useMemo(() => {
    const now = new Date();
    const monthsData: Record<string, { income: number; expense: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthsData[key] = { income: 0, expense: 0 };
    }
    transactions.forEach(t => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthsData[key]) {
        if (t.type === 'income') monthsData[key].income += t.amount;
        else monthsData[key].expense += t.amount;
      }
    });
    return Object.entries(monthsData).map(([key, value]) => ({
      name: format(new Date(key + '-01'), 'MMM yy', { locale: id }),
      Pemasukan: value.income,
      Pengeluaran: value.expense,
    }));
  }, [transactions]);

  // ========== HELPERS ==========
  const generateFinancialAdvice = (): string[] => {
    const income = getMonthlyIncome;
    const expense = getMonthlyExpense;
    const savings = getSavings;
    const savingsRate = income > 0 ? (savings / income) * 100 : 0;
    const advice: string[] = [];

    const expenseByCategory: Record<string, number> = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + t.amount;
    });
    const topExpense = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1])[0];

    if (income === 0) advice.push('📝 Mulai catat pemasukan Anda untuk rekomendasi finansial yang lebih baik.');
    else if (savingsRate < 10) advice.push('⚠️ Tingkat tabungan hanya ' + savingsRate.toFixed(1) + '%. Coba kurangi pengeluaran tidak penting hingga minimal 20%.');
    else if (savingsRate < 20) advice.push('💡 Tingkat tabungan ' + savingsRate.toFixed(1) + '%. Bagus, tapi bisa ditingkatkan menjadi 30%.');
    else if (savingsRate >= 30) advice.push('🎯 Luar biasa! Anda menabung ' + savingsRate.toFixed(1) + '% dari pendapatan. Pertahankan!');

    if (expense > income && income > 0) advice.push('🚨 Pengeluaran melebihi pemasukan sebesar ' + formatCurrency(expense - income) + '!');
    if (topExpense && topExpense[1] > income * 0.5) {
      const categoryName = expenseCategories[topExpense[0]]?.name || topExpense[0];
      advice.push('💸 ' + categoryName + ' menjadi pengeluaran terbesar (' + formatCurrency(topExpense[1]) + ').');
    }
    if (transactions.filter(t => t.type === 'expense').length === 0) advice.push('📊 Belum ada data pengeluaran. Mulai catat pengeluaran harian Anda.');
    if (income > 0 && expense > 0 && savingsRate >= 20 && expense <= income) advice.push('✨ Manajemen keuangan sangat baik! Pertimbangkan investasi tabungan Anda.');

    return advice.length > 0 ? advice : ['💭 Terus catat transaksi Anda untuk saran keuangan yang lebih akurat.'];
  };

  const handleNominalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numOnly = e.target.value.replace(/\D/g, '');
    setFormData(prev => ({ ...prev, amount: numOnly }));
  };

  const processReceiptImage = async (file: File) => {
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageData = e.target?.result as string;
        if (!(window as any).Tesseract) {
          notify.warning('OCR library belum loaded. Tunggu sebentar.');
          setIsProcessing(false);
          return;
        }
        try {
          const result = await (window as any).Tesseract.recognize(imageData, 'ind+eng');
          const text = result.data.text;
          const amountMatch = text.match(/Rp[\s.]?([\d.,]+)|Total[\s:]*Rp?[\s.]?([\d.,]+)|([\d.,]+)/);
          const amount = amountMatch ? amountMatch[1] || amountMatch[2] || amountMatch[3] : '';
          const lines = text.split('\n').filter((line: string) => line.trim().length > 0);
          setScanResult({ amount: amount.replace(/\./g, '').replace(/,/, ''), items: lines.slice(0, 10), rawText: text, imageData });
          setFormData(prev => ({ ...prev, amount: amount.replace(/\./g, '').replace(/,/, '') || '', notes: lines.slice(0, 3).join('\n'), category: 'makanan' }));
          notify.success('Struk berhasil di-scan!');
        } catch (ocrError) {
          notify.error('Gagal memproses gambar dengan OCR.');
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      notify.error('Gagal membaca file gambar');
    } finally {
      setIsProcessing(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } });
      setCameraStream(stream);
      setShowCamera(true);
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (error) {
      notify.error('Tidak bisa akses kamera.');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        context.drawImage(videoRef.current, 0, 0);
        canvasRef.current.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'receipt.jpg', { type: 'image/jpeg' });
            processReceiptImage(file);
            stopCamera();
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  const syncToSheets = async (transaction: Transaction) => {
    if (!scriptUrl) return;
    setSyncStatus('syncing');
    try {
      await fetch(scriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: transaction.date, type: transaction.type, category: transaction.category, description: transaction.description, amount: transaction.amount, notes: transaction.notes || '' }),
      });
      setSyncStatus('success');
      return true;
    } catch (error) {
      setSyncStatus('error');
      return false;
    }
  };

  const handleAddTransaction = async () => {
    if (!formData.description || !formData.amount) {
      notify.error('Deskripsi dan nominal harus diisi!');
      return;
    }
    const newTransaction: Transaction = {
      id: editingId || Date.now().toString(),
      date: formData.date,
      type: formData.type,
      category: formData.category,
      subcategory: formData.subcategory,
      description: formData.description,
      amount: parseInt(formData.amount),
      notes: formData.notes,
      createdAt: new Date().toISOString(),
    };

    if (editingId) {
      setTransactions(transactions.map(t => t.id === editingId ? newTransaction : t));
      setEditingId(null);
      notify.success('Transaksi berhasil diupdate!');
    } else {
      setTransactions([newTransaction, ...transactions]);
      if (scriptUrl) {
        const synced = await syncToSheets(newTransaction);
        if (synced) {
          setTransactions(prev => prev.map(t => t.id === newTransaction.id ? { ...t, syncedToSheets: true } : t));
          notify.success('Transaksi ditambahkan & synced ke Google Sheets!');
        } else {
          notify.success('Transaksi ditambahkan! (Sync offline)');
        }
      } else {
        notify.success('Transaksi berhasil ditambahkan!');
      }
    }

    setFormData({ date: new Date().toISOString().split('T')[0], type: 'expense', category: 'makanan', subcategory: '', description: '', amount: '', notes: '' });
    setScanResult(null);
    setActiveTab('history');
  };

  const handleDeleteTransaction = (id: string) => {
    if (window.confirm('Yakin hapus transaksi ini?')) {
      setTransactions(transactions.filter(t => t.id !== id));
      notify.info('Transaksi dihapus');
    }
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setFormData({
      date: transaction.date,
      type: transaction.type,
      category: transaction.category,
      subcategory: transaction.subcategory,
      description: transaction.description,
      amount: transaction.amount.toString(),
      notes: transaction.notes || '',
    });
    setEditingId(transaction.id);
    setActiveTab('input');
    window.scrollTo(0, 0);
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

  // ========== BUDGET HANDLERS ==========
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [budgetForm, setBudgetForm] = useState({ category: 'makanan', limit: '' });

  const handleAddBudget = () => {
    const limit = parseNominal(budgetForm.limit);
    if (limit <= 0) { notify.error('Nominal budget tidak valid'); return; }
    if (budgets.some(b => b.category === budgetForm.category)) { notify.error('Budget untuk kategori ini sudah ada'); return; }
    setBudgets([...budgets, {
      id: Date.now().toString(),
      category: budgetForm.category,
      limit,
      period: 'monthly',
      alerts: { threshold50: true, threshold80: true, threshold100: true },
      createdAt: new Date().toISOString(),
    }]);
    notify.success(`Budget ${expenseCategories[budgetForm.category].name} ditambahkan`);
    setBudgetForm({ category: 'makanan', limit: '' });
    setShowBudgetForm(false);
  };

  // ========== GOAL HANDLERS ==========
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalForm, setGoalForm] = useState({ name: '', targetAmount: '', deadline: '', monthlyContribution: '', icon: '🎯' });

  const handleAddGoal = () => {
    if (!goalForm.name || !goalForm.targetAmount) { notify.error('Nama dan target harus diisi'); return; }
    setGoals([...goals, {
      id: Date.now().toString(),
      name: goalForm.name,
      targetAmount: parseInt(goalForm.targetAmount),
      currentAmount: 0,
      deadline: goalForm.deadline || undefined,
      monthlyContribution: goalForm.monthlyContribution ? parseInt(goalForm.monthlyContribution) : undefined,
      icon: goalForm.icon,
      priority: 'medium',
      createdAt: new Date().toISOString(),
    }]);
    notify.success('Goal ditambahkan!');
    setGoalForm({ name: '', targetAmount: '', deadline: '', monthlyContribution: '', icon: '🎯' });
    setShowGoalForm(false);
  };

  const handleAddFundsToGoal = (goalId: string) => {
    const amount = prompt('Masukkan nominal yang ingin ditambahkan:');
    if (amount) {
      const parsed = parseNominal(amount);
      if (parsed > 0) {
        setGoals(goals.map(g => g.id === goalId ? { ...g, currentAmount: g.currentAmount + parsed } : g));
        notify.success(`Berhasil menambah ${formatCurrency(parsed)} ke goal`);
      }
    }
  };

  // ========== RECURRING HANDLERS ==========
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [recurringForm, setRecurringForm] = useState({
    name: '', amount: '', type: 'expense' as 'income' | 'expense', category: 'utilitas',
    frequency: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'yearly',
    nextDate: format(new Date(), 'yyyy-MM-dd'), reminderDays: 3,
  });

  const handleAddRecurring = () => {
    if (!recurringForm.name || !recurringForm.amount) { notify.error('Nama dan nominal harus diisi'); return; }
    setRecurringTransactions([...recurringTransactions, {
      id: Date.now().toString(),
      name: recurringForm.name,
      amount: parseInt(recurringForm.amount),
      type: recurringForm.type,
      category: recurringForm.category,
      frequency: recurringForm.frequency,
      nextDate: recurringForm.nextDate,
      reminderDays: recurringForm.reminderDays,
      isActive: true,
    }]);
    notify.success('Recurring transaction ditambahkan');
    setRecurringForm({
      name: '', amount: '', type: 'expense', category: 'utilitas',
      frequency: 'monthly', nextDate: format(new Date(), 'yyyy-MM-dd'), reminderDays: 3,
    });
    setShowRecurringForm(false);
  };

  const getDaysUntilNext = (nextDate: string) => differenceInDays(new Date(nextDate), new Date());

  // ========== SETTINGS HANDLERS ==========
  const handleExport = () => {
    const data = { transactions, budgets, goals, recurringTransactions, exportDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `catat-keuangan-${Date.now()}.json`;
    a.click();
    notify.success('Data berhasil diexport');
  };

  const handleClearAll = () => {
    if (window.confirm('Yakin hapus SEMUA data? Tindakan ini tidak bisa dibatalkan!')) {
      setTransactions([]); setBudgets([]); setGoals([]); setRecurringTransactions([]);
      notify.success('Semua data telah dihapus');
    }
  };

  // ========== RENDER ==========
  return (
    <div className={`min-h-screen transition-colors duration-300 ${theme === 'dark' ? 'bg-gradient-to-br from-blue-900 via-slate-800 to-slate-900 text-white' : 'bg-gradient-to-br from-blue-50 to-slate-100 text-slate-900'}`}>
      <Toaster position="top-center" />
      
      <header className={`${theme === 'dark' ? 'bg-gradient-to-r from-blue-950 to-slate-900 border-blue-700' : 'bg-white border-slate-200'} border-b shadow-lg p-3 sticky top-0 z-10`}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className={`w-6 h-6 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
            <h1 className="text-lg font-bold">Catat Keuangan Pro</h1>
          </div>
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200'}`}>
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-3 pb-32">
        
        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 shadow-lg">
                <div className="flex justify-between items-start mb-2">
                  <div><p className="text-green-100 text-xs font-medium">Pemasukan</p><p className="text-green-50 text-xs">Bulan ini</p></div>
                  <ArrowDownLeft className="w-4 h-4 text-green-100" />
                </div>
                <p className="text-xl font-bold text-white">{formatCurrency(getMonthlyIncome)}</p>
              </div>
              <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-4 shadow-lg">
                <div className="flex justify-between items-start mb-2">
                  <div><p className="text-red-100 text-xs font-medium">Pengeluaran</p><p className="text-red-50 text-xs">Bulan ini</p></div>
                  <ArrowUpRight className="w-4 h-4 text-red-100" />
                </div>
                <p className="text-xl font-bold text-white">{formatCurrency(getMonthlyExpense)}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 shadow-lg">
                <div className="flex justify-between items-start mb-2">
                  <div><p className="text-purple-100 text-xs font-medium">Tabungan</p><p className="text-purple-50 text-xs">Bulan ini</p></div>
                  <Zap className="w-4 h-4 text-purple-100" />
                </div>
                <p className="text-xl font-bold text-white">{formatCurrency(getSavings)}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 shadow-lg">
                <div className="flex justify-between items-start mb-2">
                  <div><p className="text-blue-100 text-xs font-medium">Cash Flow</p><p className="text-blue-50 text-xs">Status</p></div>
                  <TrendingDown className="w-4 h-4 text-blue-100" />
                </div>
                <p className="text-xl font-bold text-white">{getSavings > 0 ? '✅ Positif' : '⚠️ Negatif'}</p>
              </div>
            </div>

            {expensePieData.length > 0 && (
              <div className={`${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} rounded-lg p-4 shadow-lg`}>
                <h3 className={`font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>📊 Breakdown Pengeluaran</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <RePieChart>
                    <Pie data={expensePieData} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value" label={(entry: any) => `${entry.name}`}>
                      {expensePieData.map((_, index) => (<Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className={`${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} rounded-lg p-4 shadow-lg`}>
              <h3 className={`font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>📈 Trend 6 Bulan Terakhir</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={monthlyBarData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} />
                  <XAxis dataKey="name" stroke={theme === 'dark' ? '#94a3b8' : '#64748b'} style={{ fontSize: '12px' }} />
                  <YAxis stroke={theme === 'dark' ? '#94a3b8' : '#64748b'} style={{ fontSize: '12px' }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ background: theme === 'dark' ? '#1e293b' : '#fff', border: 'none', borderRadius: '8px' }} />
                  <Legend />
                  <Bar dataKey="Pemasukan" fill="#10b981" />
                  <Bar dataKey="Pengeluaran" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {budgets.length > 0 && (
              <div className={`${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} rounded-lg p-4 shadow-lg`}>
                <h3 className={`font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>💰 Status Budget</h3>
                <div className="space-y-3">
                  {budgets.slice(0, 3).map(b => {
                    const spent = monthlySpending[b.category] || 0;
                    const percentage = (spent / b.limit) * 100;
                    const cat = expenseCategories[b.category];
                    return (
                      <div key={b.id}>
                        <div className="flex justify-between items-center mb-1">
                          <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-slate-700'}`}>{cat?.name}</span>
                          <span className={`text-xs font-bold ${percentage >= 100 ? 'text-red-500' : percentage >= 80 ? 'text-orange-500' : 'text-green-500'}`}>
                            {percentage.toFixed(0)}%
                          </span>
                        </div>
                        <div className={`w-full ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'} rounded-full h-2 overflow-hidden`}>
                          <div className={`h-full rounded-full transition-all ${percentage >= 100 ? 'bg-red-500' : percentage >= 80 ? 'bg-orange-500' : 'bg-green-500'}`} style={{ width: `${Math.min(percentage, 100)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* INPUT TAB */}
        {activeTab === 'input' && (
          <div className={`${theme === 'dark' ? 'bg-gradient-to-br from-slate-800 to-slate-900' : 'bg-white'} rounded-lg p-4 shadow-lg py-4`}>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              {editingId ? 'Edit' : 'Tambah'} Transaksi
            </h2>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <button onClick={() => { setTransactionType('expense'); setFormData(prev => ({ ...prev, type: 'expense', category: 'makanan' })); }}
                className={`p-3 rounded-lg font-bold text-sm transition-all ${transactionType === 'expense' ? 'bg-red-500 scale-105 shadow-lg' : theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-200 hover:bg-slate-300'}`}>
                💸 Pengeluaran
              </button>
              <button onClick={() => { setTransactionType('income'); setFormData(prev => ({ ...prev, type: 'income', category: 'gaji' })); }}
                className={`p-3 rounded-lg font-bold text-sm transition-all ${transactionType === 'income' ? 'bg-green-500 scale-105 shadow-lg' : theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-200 hover:bg-slate-300'}`}>
                💰 Pemasukan
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">Tanggal</label>
                <input type="date" value={formData.date} onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className={`w-full ${theme === 'dark' ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-300'} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500`} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Kategori</label>
                <select value={formData.category} onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className={`w-full ${theme === 'dark' ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-300'} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500`}>
                  {Object.entries(getCategories()).map(([key, cat]) => (<option key={key} value={key}>{cat.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Deskripsi</label>
                <input type="text" value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={currentCategory ? descriptionPlaceholders[formData.type]?.[formData.category] : ''}
                  className={`w-full ${theme === 'dark' ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-300'} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500`} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Nominal</label>
                <input type="text" value={formatNominalDisplay(formData.amount)} onChange={handleNominalChange} placeholder="Rp 0"
                  className={`w-full ${theme === 'dark' ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-300'} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500`} inputMode="numeric" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Catatan (Opsional)</label>
                <textarea value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} placeholder="Catatan tambahan"
                  className={`w-full ${theme === 'dark' ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-300'} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 h-16 resize-none`} />
              </div>
              <button onClick={handleAddTransaction}
                className={`w-full p-3 rounded-lg font-bold text-sm transition-all ${transactionType === 'income' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}>
                {editingId ? '✏️ Update' : '➕ Tambah'} Transaksi
              </button>
              {editingId && (
                <button onClick={() => { setEditingId(null); setFormData({ date: new Date().toISOString().split('T')[0], type: 'expense', category: 'makanan', subcategory: '', description: '', amount: '', notes: '' }); }}
                  className={`w-full p-2 rounded-lg font-bold text-sm ${theme === 'dark' ? 'bg-slate-600 hover:bg-slate-700' : 'bg-slate-300 hover:bg-slate-400'} transition-all`}>
                  ❌ Batal
                </button>
              )}
            </div>
          </div>
        )}

        {/* SCAN TAB
        {activeTab === 'scan' && (
          <div className={`${theme === 'dark' ? 'bg-gradient-to-br from-slate-800 to-slate-900' : 'bg-white'} rounded-lg p-4 shadow-lg py-4`}>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">📷 Scan Struk</h2>
            
            {!showCamera && !scanResult && (
              <div className="space-y-3">
                <button onClick={startCamera} className="w-full bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-lg font-bold flex items-center justify-center gap-2">
                  <Camera className="w-5 h-5" />
                  Ambil Foto Struk
                </button>
                <button onClick={() => fileInputRef.current?.click()} className={`w-full ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-200 hover:bg-slate-300'} p-4 rounded-lg font-bold flex items-center justify-center gap-2`}>
                  <ImageIcon className="w-5 h-5" />
                  Upload dari Gallery
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && processReceiptImage(e.target.files[0])} className="hidden" />
              </div>
            )}

            {showCamera && (
              <div className="space-y-3">
                <video ref={videoRef} autoPlay playsInline className="w-full rounded-lg" />
                <canvas ref={canvasRef} className="hidden" />
                <div className="flex gap-2">
                  <button onClick={capturePhoto} className="flex-1 bg-green-500 hover:bg-green-600 text-white p-3 rounded-lg font-bold">📸 Capture</button>
                  <button onClick={stopCamera} className="flex-1 bg-red-500 hover:bg-red-600 text-white p-3 rounded-lg font-bold">❌ Batal</button>
                </div>
              </div>
            )}

            {isProcessing && (
              <div className="flex items-center justify-center gap-2 py-8">
                <Loader className="w-6 h-6 animate-spin text-blue-500" />
                <span>Memproses struk...</span>
              </div>
            )}

            {scanResult && (
              <div className="space-y-3">
                <div className={`${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-100'} rounded-lg p-3`}>
                  <p className="text-xs font-medium mb-1">Nominal Terdeteksi:</p>
                  <p className="text-xl font-bold text-green-500">{formatCurrency(parseInt(scanResult.amount || '0'))}</p>
                </div>
                <div className={`${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-100'} rounded-lg p-3`}>
                  <p className="text-xs font-medium mb-2">Item Terdeteksi:</p>
                  <ul className="text-xs space-y-1">
                    {scanResult.items.slice(0, 5).map((item: string, idx: number) => (<li key={idx}>• {item}</li>))}
                  </ul>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setActiveTab('input'); setScanResult(null); }} className="flex-1 bg-green-500 hover:bg-green-600 text-white p-3 rounded-lg font-bold">✓ Pakai Data</button>
                  <button onClick={() => setScanResult(null)} className="flex-1 bg-slate-500 hover:bg-slate-600 text-white p-3 rounded-lg font-bold">↻ Scan Ulang</button>
                </div>
              </div>
            )}
          </div>
        )} */}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="space-y-3 py-4">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5" />
              Riwayat Transaksi
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
              <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)}
                className={`${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500`} />
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
                className={`${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500`}>
                <option value="">Semua Kategori</option>
                {Object.entries({ ...incomeCategories, ...expenseCategories }).map(([key, cat]) => (<option key={key} value={key}>{cat.name}</option>))}
              </select>
            </div>
            {filteredTransactions.length === 0 ? (
              <div className={`${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} rounded-lg p-6 text-center`}>
                <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-sm`}>Belum ada transaksi</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTransactions.map(transaction => {
                  const categories = transaction.type === 'income' ? incomeCategories : expenseCategories;
                  const category = categories[transaction.category];
                  return (
                    <div key={transaction.id} className={`${theme === 'dark' ? 'bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600' : 'bg-white hover:bg-slate-50'} rounded-lg p-3 transition-all shadow-md`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {category && (<div className={`text-lg p-2 rounded-lg flex-shrink-0 ${category.bgColor}`}>{category.icon}</div>)}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm truncate">{category?.name}</h3>
                            <p className={`text-xs truncate ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{transaction.description}</p>
                            <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                              {format(new Date(transaction.date), 'dd MMM yyyy', { locale: id })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={`text-sm font-bold ${transaction.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                            {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount).replace('Rp', '').trim()}
                          </p>
                          <div className="flex gap-1 mt-2 justify-end">
                            <button onClick={() => handleEditTransaction(transaction)} className={`p-1 ${theme === 'dark' ? 'hover:bg-slate-600' : 'hover:bg-slate-200'} rounded transition-all`} title="Edit">
                              <Edit2 className="w-3 h-3 text-blue-500" />
                            </button>
                            <button onClick={() => handleDeleteTransaction(transaction.id)} className={`p-1 ${theme === 'dark' ? 'hover:bg-slate-600' : 'hover:bg-slate-200'} rounded transition-all`} title="Hapus">
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

        {/* BUDGET TAB */}
        {activeTab === 'budget' && (
          <div className="space-y-4 py-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold flex items-center gap-2">💰 Budget Management</h2>
              <button onClick={() => setShowBudgetForm(!showBudgetForm)} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-1">
                <Plus className="w-4 h-4" /> Budget
              </button>
            </div>

            {showBudgetForm && (
              <div className={`${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} rounded-lg p-4 shadow-lg space-y-3`}>
                <div>
                  <label className="block text-sm font-medium mb-1">Kategori</label>
                  <select value={budgetForm.category} onChange={(e) => setBudgetForm({ ...budgetForm, category: e.target.value })}
                    className={`w-full ${theme === 'dark' ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-300'} border rounded-lg px-3 py-2 text-sm`}>
                    {Object.entries(expenseCategories).map(([key, cat]) => (<option key={key} value={key}>{cat.name}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Limit Budget</label>
                  <input type="text" value={formatNominalDisplay(budgetForm.limit)} onChange={(e) => setBudgetForm({ ...budgetForm, limit: parseNominal(e.target.value).toString() })} placeholder="Rp 0"
                    className={`w-full ${theme === 'dark' ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-300'} border rounded-lg px-3 py-2 text-sm`} />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleAddBudget} className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-semibold">Simpan</button>
                  <button onClick={() => setShowBudgetForm(false)} className={`px-4 ${theme === 'dark' ? 'bg-slate-600' : 'bg-slate-300'} rounded-lg`}>Batal</button>
                </div>
              </div>
            )}

            {budgets.length === 0 ? (
              <div className={`${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} rounded-lg p-6 text-center`}>
                <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-sm`}>Belum ada budget. Tambahkan untuk tracking pengeluaran!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {budgets.map((budget) => {
                  const spent = monthlySpending[budget.category] || 0;
                  const percentage = (spent / budget.limit) * 100;
                  const remaining = budget.limit - spent;
                  const category = expenseCategories[budget.category];
                  return (
                    <div key={budget.id} className={`${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} rounded-lg p-4 shadow-md`}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{category?.icon}</span>
                          <div>
                            <h3 className="font-bold text-sm">{category?.name}</h3>
                            <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{formatCurrency(spent)} / {formatCurrency(budget.limit)}</p>
                          </div>
                        </div>
                        <button onClick={() => { setBudgets(budgets.filter(b => b.id !== budget.id)); notify.info('Budget dihapus'); }}
                          className={`p-1 ${theme === 'dark' ? 'hover:bg-red-900' : 'hover:bg-red-100'} rounded`}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                      <div className={`w-full ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'} rounded-full h-3 overflow-hidden mb-2`}>
                        <div className={`h-full rounded-full transition-all ${percentage >= 100 ? 'bg-red-500' : percentage >= 80 ? 'bg-orange-500' : percentage >= 50 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${Math.min(percentage, 100)}%` }} />
                      </div>
                      <div className="flex justify-between items-center">
                        <div className={`flex items-center gap-1 text-xs font-semibold ${percentage >= 100 ? 'text-red-500' : percentage >= 80 ? 'text-orange-500' : percentage >= 50 ? 'text-yellow-500' : 'text-green-500'}`}>
                          {percentage >= 100 ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                          {percentage >= 100 ? 'Over Budget!' : percentage >= 80 ? 'Hampir Habis' : percentage >= 50 ? 'Normal' : 'Aman'} ({percentage.toFixed(0)}%)
                        </div>
                        <div className={`text-xs font-bold ${remaining < 0 ? 'text-red-500' : theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          {remaining < 0 ? `Over: ${formatCurrency(Math.abs(remaining))}` : `Sisa: ${formatCurrency(remaining)}`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* GOALS TAB */}
        {activeTab === 'goals' && (
          <div className="space-y-4 py-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold flex items-center gap-2"><Target className="w-5 h-5" /> Financial Goals</h2>
              <button onClick={() => setShowGoalForm(!showGoalForm)} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-1">
                <Plus className="w-4 h-4" /> Goal
              </button>
            </div>

            {showGoalForm && (
              <div className={`${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} rounded-lg p-4 shadow-lg space-y-3`}>
                <div>
                  <label className="block text-sm font-medium mb-1">Icon</label>
                  <div className="flex gap-2 flex-wrap">
                    {['🏠', '🚗', '✈️', '💻', '📱', '💍', '🎓', '💰', '🎯', '🏖️'].map(icon => (
                      <button key={icon} onClick={() => setGoalForm({ ...goalForm, icon })}
                        className={`text-2xl p-2 rounded-lg ${goalForm.icon === icon ? 'bg-blue-100 dark:bg-blue-900' : theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}>
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Nama Goal</label>
                  <input type="text" value={goalForm.name} onChange={(e) => setGoalForm({ ...goalForm, name: e.target.value })} placeholder="Contoh: DP Rumah, Mobil Impian"
                    className={`w-full ${theme === 'dark' ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-300'} border rounded-lg px-3 py-2 text-sm`} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Target Amount</label>
                  <input type="text" value={formatNominalDisplay(goalForm.targetAmount)} onChange={(e) => setGoalForm({ ...goalForm, targetAmount: parseNominal(e.target.value).toString() })} placeholder="Rp 0"
                    className={`w-full ${theme === 'dark' ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-300'} border rounded-lg px-3 py-2 text-sm`} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Deadline (Opsional)</label>
                  <input type="date" value={goalForm.deadline} onChange={(e) => setGoalForm({ ...goalForm, deadline: e.target.value })}
                    className={`w-full ${theme === 'dark' ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-300'} border rounded-lg px-3 py-2 text-sm`} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Kontribusi Bulanan (Opsional)</label>
                  <input type="text" value={formatNominalDisplay(goalForm.monthlyContribution)} onChange={(e) => setGoalForm({ ...goalForm, monthlyContribution: parseNominal(e.target.value).toString() })} placeholder="Rp 0"
                    className={`w-full ${theme === 'dark' ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-300'} border rounded-lg px-3 py-2 text-sm`} />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleAddGoal} className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-semibold">Simpan</button>
                  <button onClick={() => setShowGoalForm(false)} className={`px-4 ${theme === 'dark' ? 'bg-slate-600' : 'bg-slate-300'} rounded-lg`}>Batal</button>
                </div>
              </div>
            )}

            {goals.length === 0 ? (
              <div className={`${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} rounded-lg p-6 text-center`}>
                <Target className={`w-12 h-12 mx-auto mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-sm`}>Belum ada goal. Tambahkan target tabungan Anda!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {goals.map((goal) => {
                  const percentage = (goal.currentAmount / goal.targetAmount) * 100;
                  const remaining = goal.targetAmount - goal.currentAmount;
                  const daysLeft = goal.deadline ? differenceInDays(new Date(goal.deadline), new Date()) : null;
                  const monthsToReach = goal.monthlyContribution && goal.monthlyContribution > 0 ? Math.ceil(remaining / goal.monthlyContribution) : null;
                  return (
                    <div key={goal.id} className={`${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} rounded-lg p-4 shadow-md`}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-3xl">{goal.icon}</span>
                          <div>
                            <h3 className="font-bold">{goal.name}</h3>
                            <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}</p>
                          </div>
                        </div>
                        <button onClick={() => { if (window.confirm('Hapus goal ini?')) { setGoals(goals.filter(g => g.id !== goal.id)); notify.info('Goal dihapus'); } }}
                          className={`p-1 ${theme === 'dark' ? 'hover:bg-red-900' : 'hover:bg-red-100'} rounded`}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                      <div className={`w-full ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'} rounded-full h-4 overflow-hidden mb-2`}>
                        <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full transition-all flex items-center justify-end pr-2" style={{ width: `${Math.min(percentage, 100)}%` }}>
                          {percentage > 10 && (<span className="text-white text-xs font-bold">{percentage.toFixed(0)}%</span>)}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                        <div className={`${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-100'} rounded p-2`}>
                          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>Sisa</p>
                          <p className="font-bold">{formatCurrency(remaining)}</p>
                        </div>
                        {daysLeft !== null && (
                          <div className={`${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-100'} rounded p-2`}>
                            <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>Sisa Waktu</p>
                            <p className="font-bold">{daysLeft} hari</p>
                          </div>
                        )}
                        {monthsToReach !== null && (
                          <div className={`${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-100'} rounded p-2 col-span-2`}>
                            <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>Estimasi Tercapai</p>
                            <p className="font-bold flex items-center gap-1"><TrendingUp className="w-3 h-3" />{monthsToReach} bulan lagi</p>
                          </div>
                        )}
                      </div>
                      <button onClick={() => handleAddFundsToGoal(goal.id)} className="w-full mt-3 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold">+ Tambah Dana</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* RECURRING TAB */}
        {activeTab === 'recurring' && (
          <div className="space-y-4 py-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold flex items-center gap-2"><Repeat className="w-5 h-5" /> Recurring Transactions</h2>
              <button onClick={() => setShowRecurringForm(!showRecurringForm)} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-1">
                <Plus className="w-4 h-4" /> Recurring
              </button>
            </div>

            {showRecurringForm && (
              <div className={`${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} rounded-lg p-4 shadow-lg space-y-3`}>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setRecurringForm({ ...recurringForm, type: 'expense', category: 'utilitas' })}
                    className={`py-2 rounded-lg font-semibold ${recurringForm.type === 'expense' ? 'bg-red-500 text-white' : theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}>💸 Pengeluaran</button>
                  <button onClick={() => setRecurringForm({ ...recurringForm, type: 'income', category: 'gaji' })}
                    className={`py-2 rounded-lg font-semibold ${recurringForm.type === 'income' ? 'bg-green-500 text-white' : theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}>💰 Pemasukan</button>
                </div>
                <input type="text" value={recurringForm.name} onChange={(e) => setRecurringForm({ ...recurringForm, name: e.target.value })} placeholder="Nama (Contoh: Listrik, Gaji)"
                  className={`w-full ${theme === 'dark' ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-300'} border rounded-lg px-3 py-2 text-sm`} />
                <select value={recurringForm.category} onChange={(e) => setRecurringForm({ ...recurringForm, category: e.target.value })}
                  className={`w-full ${theme === 'dark' ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-300'} border rounded-lg px-3 py-2 text-sm`}>
                  {Object.entries(recurringForm.type === 'income' ? incomeCategories : expenseCategories).map(([key, cat]) => (<option key={key} value={key}>{cat.name}</option>))}
                </select>
                <input type="text" value={formatNominalDisplay(recurringForm.amount)} onChange={(e) => setRecurringForm({ ...recurringForm, amount: parseNominal(e.target.value).toString() })} placeholder="Rp 0"
                  className={`w-full ${theme === 'dark' ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-300'} border rounded-lg px-3 py-2 text-sm`} />
                <select value={recurringForm.frequency} onChange={(e) => setRecurringForm({ ...recurringForm, frequency: e.target.value as any })}
                  className={`w-full ${theme === 'dark' ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-300'} border rounded-lg px-3 py-2 text-sm`}>
                  <option value="daily">Harian</option><option value="weekly">Mingguan</option><option value="monthly">Bulanan</option><option value="yearly">Tahunan</option>
                </select>
                <input type="date" value={recurringForm.nextDate} onChange={(e) => setRecurringForm({ ...recurringForm, nextDate: e.target.value })}
                  className={`w-full ${theme === 'dark' ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-300'} border rounded-lg px-3 py-2 text-sm`} />
                <div>
                  <label className="block text-sm font-medium mb-1">Reminder (hari sebelum)</label>
                  <input type="number" value={recurringForm.reminderDays} onChange={(e) => setRecurringForm({ ...recurringForm, reminderDays: parseInt(e.target.value) })} min="0" max="30"
                    className={`w-full ${theme === 'dark' ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-300'} border rounded-lg px-3 py-2 text-sm`} />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleAddRecurring} className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-semibold">Simpan</button>
                  <button onClick={() => setShowRecurringForm(false)} className={`px-4 ${theme === 'dark' ? 'bg-slate-600' : 'bg-slate-300'} rounded-lg`}>Batal</button>
                </div>
              </div>
            )}

            {recurringTransactions.length === 0 ? (
              <div className={`${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} rounded-lg p-6 text-center`}>
                <Repeat className={`w-12 h-12 mx-auto mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-sm`}>Belum ada recurring transaction</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recurringTransactions.map((r) => {
                  const daysLeft = getDaysUntilNext(r.nextDate);
                  const isUrgent = daysLeft <= r.reminderDays && daysLeft >= 0;
                  const categories = r.type === 'income' ? incomeCategories : expenseCategories;
                  const category = categories[r.category];
                  return (
                    <div key={r.id} className={`${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} rounded-lg p-3 shadow ${isUrgent ? 'ring-2 ring-orange-500' : ''}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-xl">{category?.icon}</span>
                          <div className="flex-1">
                            <h3 className="font-bold text-sm">{r.name}</h3>
                            <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{category?.name} • {r.frequency === 'daily' ? 'Harian' : r.frequency === 'weekly' ? 'Mingguan' : r.frequency === 'monthly' ? 'Bulanan' : 'Tahunan'}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Calendar className={`w-3 h-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                              <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{daysLeft === 0 ? 'Hari ini' : daysLeft > 0 ? `${daysLeft} hari lagi` : 'Terlewat'}</p>
                              {isUrgent && <Bell className="w-3 h-3 text-orange-500 animate-pulse" />}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold text-sm ${r.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                            {r.type === 'income' ? '+' : '-'}{formatCurrency(r.amount).replace('Rp', '').trim()}
                          </p>
                          <button onClick={() => { setRecurringTransactions(recurringTransactions.filter(x => x.id !== r.id)); notify.info('Recurring dihapus'); }}
                            className={`p-1 ${theme === 'dark' ? 'hover:bg-red-900' : 'hover:bg-red-100'} rounded mt-1`}>
                            <Trash2 className="w-3 h-3 text-red-500" />
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

        {/* ANALISIS TAB */}
        {activeTab === 'analisis' && (
          <div className="space-y-4 py-4">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4"><BarChart3 className="w-5 h-5" /> Analisis Keuangan</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className={`${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} rounded-lg p-3`}>
                <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-xs mb-1`}>Total Transaksi</p>
                <p className="text-2xl font-bold">{transactions.length}</p>
              </div>
              <div className={`${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} rounded-lg p-3`}>
                <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-xs mb-1`}>Rata-rata Pengeluaran</p>
                <p className="text-lg font-bold text-red-500">
                  {formatCurrency(transactions.filter(t => t.type === 'expense').length > 0 ? transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0) / transactions.filter(t => t.type === 'expense').length : 0)}
                </p>
              </div>
              <div className={`${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} rounded-lg p-3`}>
                <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-xs mb-1`}>Rata-rata Pemasukan</p>
                <p className="text-lg font-bold text-green-500">
                  {formatCurrency(transactions.filter(t => t.type === 'income').length > 0 ? transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) / transactions.filter(t => t.type === 'income').length : 0)}
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-900 to-yellow-950 border border-yellow-700 rounded-lg p-4">
              <h3 className="font-bold text-yellow-200 mb-3 flex items-center gap-2"><Lightbulb className="w-4 h-4" /> 💡 Saran Keuangan</h3>
              <div className="space-y-2">
                {generateFinancialAdvice().map((advice, idx) => (<p key={idx} className="text-yellow-100 text-sm leading-relaxed">{advice}</p>))}
              </div>
            </div>

            <div className={`${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} rounded-lg p-4`}>
              <h3 className="font-bold mb-3 text-sm">📈 Trend 6 Bulan</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={monthlyBarData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} />
                  <XAxis dataKey="name" stroke={theme === 'dark' ? '#94a3b8' : '#64748b'} style={{ fontSize: '12px' }} />
                  <YAxis stroke={theme === 'dark' ? '#94a3b8' : '#64748b'} style={{ fontSize: '12px' }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ background: theme === 'dark' ? '#1e293b' : '#fff', border: 'none', borderRadius: '8px' }} />
                  <Legend />
                  <Bar dataKey="Pemasukan" fill="#10b981" />
                  <Bar dataKey="Pengeluaran" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {getMonthlyExpense > 0 && (
              <div className={`${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} rounded-lg p-4`}>
                <h3 className="font-bold mb-3 text-sm">📊 Breakdown Pengeluaran (Pie Chart)</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <RePieChart>
                    <Pie data={expensePieData} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value" label={(entry: any) => `${entry.name}`}>
                      {expensePieData.map((_, index) => (<Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
            )}

            {getMonthlyIncome > 0 && (
              <div className={`${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} rounded-lg p-4`}>
                <h3 className="font-bold mb-3 text-sm">🎯 Tingkat Tabungan</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Tabungan</span>
                    <span className="text-sm font-bold text-purple-500">{((getSavings / getMonthlyIncome) * 100).toFixed(1)}%</span>
                  </div>
                  <div className={`w-full ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'} rounded-full h-3 overflow-hidden`}>
                    <div className="bg-gradient-to-r from-purple-500 to-purple-600 h-full rounded-full" style={{ width: `${((getSavings / getMonthlyIncome) * 100).toFixed(1)}%` }} />
                  </div>
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} mt-2`}>Target ideal: 20-30% dari pemasukan bulanan</p>
                </div>
              </div>
            )}

            <div className={`rounded-lg p-4 border ${getSavings > 0 ? 'bg-green-950 border-green-700' : 'bg-red-950 border-red-700'}`}>
              <h3 className="font-bold mb-2 text-sm flex items-center gap-2">{getSavings > 0 ? '✅ Status Sehat' : '⚠️ Status Perlu Perhatian'}</h3>
              <p className={`text-sm ${getSavings > 0 ? 'text-green-200' : 'text-red-200'}`}>
                {getSavings > 0 ? `Selamat! Surplus sebesar ${formatCurrency(getSavings)}.` : `Defisit sebesar ${formatCurrency(Math.abs(getSavings))}. Segera tinjau pengeluaran.`}
              </p>
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className={`${theme === 'dark' ? 'bg-gradient-to-br from-slate-800 to-slate-900' : 'bg-white'} rounded-lg p-4 shadow-lg space-y-4 py-4`}>
            <h2 className="text-lg font-bold flex items-center gap-2"><SettingsIcon className="w-5 h-5" /> Pengaturan</h2>
            
            <div className={`${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-100'} rounded-lg p-4 space-y-3`}>
              <h3 className="font-bold text-sm flex items-center gap-2"><Cloud className="w-4 h-4" /> Google Sheets Integration</h3>
              <div>
                <label className="block text-xs font-medium mb-1">Google Apps Script Web App URL</label>
                <input type="text" value={scriptUrl} onChange={(e) => { setScriptUrl(e.target.value); localStorage.setItem('keuangan_scriptUrl', e.target.value); }}
                  placeholder="https://script.google.com/macros/s/..."
                  className={`w-full ${theme === 'dark' ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-300'} border rounded-lg px-3 py-2 text-sm`} />
              </div>
              <details>
                <summary className="cursor-pointer text-xs text-blue-500 hover:text-blue-400">Lihat Apps Script Code</summary>
                <pre className={`${theme === 'dark' ? 'bg-slate-900 text-green-400' : 'bg-slate-800 text-green-300'} p-3 rounded text-xs overflow-auto max-h-48 mt-2`}>{APPS_SCRIPT_CODE}</pre>
              </details>
            </div>

            <div className={`${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-100'} rounded-lg p-4 space-y-3`}>
              <h3 className="font-bold text-sm flex items-center gap-2"><Sun className="w-4 h-4" /> Tema</h3>
              <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className={`w-full flex items-center justify-between p-3 ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} rounded-lg`}>
                <div className="flex items-center gap-2">
                  {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                  <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
                </div>
                <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Tap untuk ganti</span>
              </button>
            </div>

            <div className={`${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-100'} rounded-lg p-4 space-y-3`}>
              <h3 className="font-bold text-sm flex items-center gap-2"><Download className="w-4 h-4" /> Data Management</h3>
              <button onClick={handleExport} className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-semibold">
                <Download className="w-4 h-4" /> Export Data (JSON)
              </button>
              <button onClick={handleClearAll} className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg font-semibold">
                <Trash2 className="w-4 h-4" /> Hapus Semua Data
              </button>
            </div>
          </div>
        )}
      </main>

      <nav className={`fixed bottom-0 left-0 right-0 ${theme === 'dark' ? 'bg-gradient-to-t from-slate-900 to-transparent border-blue-700' : 'bg-white border-slate-200'} border-t shadow-2xl`}>
        <div className="flex justify-around items-center h-16 px-2 max-w-4xl mx-auto">
          {[
            { id: 'dashboard', label: 'Home', icon: Home },
            { id: 'input', label: 'Input', icon: Plus },
            // { id: 'scan', label: 'Scan', icon: Camera },
            { id: 'history', label: 'Riwayat', icon: Calendar },
            { id: 'budget', label: 'Budget', icon: DollarSign },
            { id: 'goals', label: 'Goals', icon: Target },
            { id: 'recurring', label: 'Auto', icon: Repeat },
            { id: 'analisis', label: 'Analisis', icon: BarChart3 },
            { id: 'settings', label: 'Settings', icon: Filter },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex flex-col items-center justify-center gap-0.5 px-2 py-2 rounded-lg transition-all text-[10px] font-medium ${
                  isActive ? 'bg-blue-600 scale-110 text-white' : theme === 'dark' ? 'hover:bg-slate-700 text-gray-300' : 'hover:bg-slate-100 text-gray-600'
                }`}>
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}