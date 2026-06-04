import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Trash2, Edit2, TrendingUp, TrendingDown, Calendar, Filter, BarChart3, 
  Home, Upload, Cloud, AlertCircle, CheckCircle, Loader, Eye, EyeOff, X,
  PieChart, ArrowUpRight, ArrowDownLeft, DollarSign, Zap
} from 'lucide-react';

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
}

interface CategoryConfig {
  id: string;
  name: string;
  icon: string;
  color: string;
  bgColor: string;
  type: 'income' | 'expense';
}

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

// Placeholder descriptions untuk setiap kategori
const descriptionPlaceholders: Record<string, Record<string, string>> = {
  income: {
    gaji: 'Contoh: Gaji bulan Januari 2024',
    usaha: 'Contoh: Penjualan barang atau jasa',
    investasi: 'Contoh: Dividen saham, bunga bank',
    lainnya: 'Contoh: Hadiah, bonus, cashback',
  },
  expense: {
    rumah_tangga: 'Contoh: Sewa rumah, iuran lingkungan, kebersihan',
    utilitas: 'Contoh: Listrik, air, gas, internet',
    makanan: 'Contoh: Belanja sayur, daging, atau makan di luar',
    transportasi: 'Contoh: BBM, tol, parkir, bensin',
    pendidikan: 'Contoh: Biaya SPP, buku, seragam, kursus',
    kesehatan: 'Contoh: Dokter, obat, vaksin, medical check-up',
    cicilan: 'Contoh: Cicilan KPR, mobil, atau pinjaman',
    asuransi: 'Contoh: Asuransi jiwa, kendaraan, kesehatan',
    investasi_exp: 'Contoh: Beli saham, reksadana, emas, tabungan',
    hiburan: 'Contoh: Bioskop, game, streaming, hobi',
    belanja: 'Contoh: Pakaian, sepatu, aksesoris, kosmetik',
    rekreasi: 'Contoh: Liburan, hotel, tiket pesawat, wisata',
    sosial: 'Contoh: Hadiah, pernikahan, donasi, arisan',
    anak: 'Contoh: Susu, mainan, les, uang saku, sekolah',
    cadangan: 'Contoh: Dana darurat, perbaikan rumah/kendaraan',
  },
};

export default function CatanKeuangan() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'input' | 'scan' | 'history' | 'analisis' | 'settings'>('dashboard');
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
  const [filterDate, setFilterDate] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [googleSheetId, setGoogleSheetId] = useState(() => localStorage.getItem('keuangan_sheetId') || '');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'expense' as 'income' | 'expense',
    category: 'makanan',
    subcategory: '',
    description: '',
    amount: '',
    notes: '',
  });

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('keuangan_transactions');
    if (saved) {
      setTransactions(JSON.parse(saved));
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('keuangan_transactions', JSON.stringify(transactions));
  }, [transactions]);

  // Load Tesseract
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.0.4/dist/tesseract.min.js';
    script.async = true;
    document.head.appendChild(script);
  }, []);

  const processReceiptImage = async (file: File) => {
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageData = e.target?.result as string;
        
        if (!window.Tesseract) {
          alert('⚠️ OCR library belum loaded. Tunggu sebentar dan coba lagi.');
          setIsProcessing(false);
          return;
        }

        try {
          const result = await window.Tesseract.recognize(imageData, 'ind+eng');
          const text = result.data.text;
          
          // Extract amount dengan better regex
          const amountMatch = text.match(/Rp[\s.]?([\d.,]+)|Total[\s:]*Rp?[\s.]?([\d.,]+)|([\d.,]+)/);
          const amount = amountMatch ? amountMatch[1] || amountMatch[2] || amountMatch[3] : '';
          
          // Get items/lines
          const lines = text.split('\n').filter(line => line.trim().length > 0);
          
          setScanResult({
            amount: amount.replace(/\./g, '').replace(/,/, ''),
            items: lines.slice(0, 10),
            rawText: text,
            imageData: imageData, // Save image untuk preview
          });
          
          setFormData(prev => ({
            ...prev,
            amount: amount.replace(/\./g, '').replace(/,/, '') || '',
            notes: lines.slice(0, 3).join('\n'),
            category: 'makanan',
          }));
        } catch (ocrError) {
          console.error('OCR Processing Error:', ocrError);
          alert('❌ Gagal memproses gambar dengan OCR. Silakan coba foto yang lebih jelas atau input manual.');
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('File Reader Error:', error);
      alert('❌ Gagal membaca file gambar');
    } finally {
      setIsProcessing(false);
    }
  };

  // Camera functions untuk desktop
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      setCameraStream(stream);
      setShowCamera(true);
      
      // Start video stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Camera Error:', error);
      alert('❌ Tidak bisa akses kamera. Pastikan:\n1. Browser support WebRTC\n2. Kamera tersedia\n3. Permission sudah diberikan');
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
        const imageData = canvasRef.current.toDataURL('image/jpeg');
        
        // Convert data URL to File
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

  const handleAddTransaction = () => {
    if (!formData.description || !formData.amount) {
      alert('Mohon isi deskripsi dan jumlah');
      return;
    }

    if (editingId) {
      setTransactions(transactions.map(t => 
        t.id === editingId 
          ? { ...t, ...formData, amount: parseFloat(formData.amount), syncedToSheets: false }
          : t
      ));
      setEditingId(null);
    } else {
      const newTransaction: Transaction = {
        id: Date.now().toString(),
        date: formData.date,
        type: formData.type,
        category: formData.category,
        subcategory: formData.subcategory,
        description: formData.description,
        amount: parseFloat(formData.amount),
        notes: formData.notes,
        syncedToSheets: false,
        createdAt: new Date().toISOString(),
      };
      setTransactions([newTransaction, ...transactions]);
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      type: 'expense',
      category: 'makanan',
      subcategory: '',
      description: '',
      amount: '',
      notes: '',
    });
    setScanResult(null);
  };

  const handleEdit = (transaction: Transaction) => {
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
    setTransactionType(transaction.type);
    setActiveTab('input');
  };

  const handleDelete = (id: string) => {
    if (confirm('Yakin ingin menghapus transaksi ini?')) {
      setTransactions(transactions.filter(t => t.id !== id));
    }
  };

  // Calculate statistics
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthTransactions = transactions.filter(t => t.date.startsWith(currentMonth));
  
  const monthIncome = monthTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const monthExpense = monthTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const monthSavings = monthIncome - monthExpense;
  const savingsPercentage = monthIncome > 0 ? (monthSavings / monthIncome * 100) : 0;

  const categoryExpenses = Object.keys(expenseCategories).reduce((acc, cat) => {
    acc[cat] = monthTransactions
      .filter(t => t.type === 'expense' && t.category === cat)
      .reduce((sum, t) => sum + t.amount, 0);
    return acc;
  }, {} as Record<string, number>);

  const categoryIncomes = Object.keys(incomeCategories).reduce((acc, cat) => {
    acc[cat] = monthTransactions
      .filter(t => t.type === 'income' && t.category === cat)
      .reduce((sum, t) => sum + t.amount, 0);
    return acc;
  }, {} as Record<string, number>);

  const filteredTransactions = transactions.filter(t => {
    if (filterDate && t.date !== filterDate) return false;
    if (filterCategory && t.category !== filterCategory) return false;
    return true;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const allCategories = { ...incomeCategories, ...expenseCategories };
  const currentCategories = transactionType === 'income' ? incomeCategories : expenseCategories;

  // RENDER FUNCTIONS
  const renderDashboard = () => (
    <div className="space-y-3 sm:space-y-4 max-w-6xl mx-auto">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        {/* Pemasukan */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg sm:rounded-xl p-3 sm:p-4 text-white shadow-md">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="text-xs sm:text-sm text-emerald-100 font-medium">Pemasukan</div>
              <div className="text-lg sm:text-2xl font-bold mt-1 break-words">{formatCurrency(monthIncome).split(' ')[1]}</div>
            </div>
            <ArrowUpRight className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-100 flex-shrink-0" />
          </div>
          <div className="text-xs text-emerald-100">Bulan ini</div>
        </div>

        {/* Pengeluaran */}
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg sm:rounded-xl p-3 sm:p-4 text-white shadow-md">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="text-xs sm:text-sm text-red-100 font-medium">Pengeluaran</div>
              <div className="text-lg sm:text-2xl font-bold mt-1 break-words">{formatCurrency(monthExpense).split(' ')[1]}</div>
            </div>
            <ArrowDownLeft className="w-5 h-5 sm:w-6 sm:h-6 text-red-100 flex-shrink-0" />
          </div>
          <div className="text-xs text-red-100">Bulan ini</div>
        </div>

        {/* Tabungan */}
        <div className={`bg-gradient-to-br ${monthSavings >= 0 ? 'from-blue-500 to-blue-600' : 'from-orange-500 to-orange-600'} rounded-lg sm:rounded-xl p-3 sm:p-4 text-white shadow-md`}>
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className={`text-xs sm:text-sm font-medium ${monthSavings >= 0 ? 'text-blue-100' : 'text-orange-100'}`}>Tabungan</div>
              <div className="text-lg sm:text-2xl font-bold mt-1 break-words">{formatCurrency(monthSavings).split(' ')[1]}</div>
            </div>
            <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 opacity-70" />
          </div>
          <div className={`text-xs ${monthSavings >= 0 ? 'text-blue-100' : 'text-orange-100'}`}>{savingsPercentage.toFixed(0)}%</div>
        </div>

        {/* Cash Flow */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg sm:rounded-xl p-3 sm:p-4 text-white shadow-md">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="text-xs sm:text-sm text-purple-100 font-medium">Cash Flow</div>
              <div className="text-3xl sm:text-4xl font-bold mt-1">{savingsPercentage > 0 ? '📈' : '📉'}</div>
            </div>
            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-purple-100 flex-shrink-0" />
          </div>
          <div className="text-xs text-purple-100">{savingsPercentage > 0 ? 'Positif' : 'Negatif'}</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {/* Expense Chart */}
        <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm">
          <h3 className="text-sm sm:text-base font-bold mb-3 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>Pengeluaran</span>
          </h3>
          <div className="space-y-2">
            {Object.entries(categoryExpenses)
              .filter(([, amount]) => amount > 0)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 6)
              .map(([catId, amount]) => {
                const category = expenseCategories[catId];
                const percentage = monthExpense > 0 ? (amount / monthExpense * 100) : 0;
                return (
                  <div key={catId} className="text-xs sm:text-sm">
                    <div className="flex justify-between mb-1 gap-2">
                      <span className="truncate font-medium">{category.icon} {category.name.split(' ')[1]}</span>
                      <span className="flex-shrink-0 font-bold">{percentage.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div 
                        className="bg-red-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Income Chart */}
        <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm">
          <h3 className="text-sm sm:text-base font-bold mb-3 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Pemasukan</span>
          </h3>
          <div className="space-y-2">
            {Object.entries(categoryIncomes)
              .filter(([, amount]) => amount > 0)
              .sort(([, a], [, b]) => b - a)
              .map(([catId, amount]) => {
                const category = incomeCategories[catId];
                const percentage = monthIncome > 0 ? (amount / monthIncome * 100) : 0;
                return (
                  <div key={catId} className="text-xs sm:text-sm">
                    <div className="flex justify-between mb-1 gap-2">
                      <span className="truncate font-medium">{category.icon} {category.name.split(' ')[1]}</span>
                      <span className="flex-shrink-0 font-bold">{percentage.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div 
                        className="bg-emerald-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm">
        <h3 className="text-sm sm:text-base font-bold mb-3">Transaksi Terbaru</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {transactions.slice(0, 10).map(t => {
            const category = allCategories[t.category];
            return (
              <div key={t.id} className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg hover:bg-gray-100 gap-2 text-xs sm:text-sm">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-base sm:text-lg flex-shrink-0">{category?.icon}</span>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{t.description}</div>
                    <div className="text-gray-500 text-xs">{t.date}</div>
                  </div>
                </div>
                <div className={`font-bold flex-shrink-0 ${t.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                  {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount).split(' ')[1]}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderInputForm = () => (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm">
        <h2 className="text-lg sm:text-xl font-bold mb-4">
          {editingId ? 'Edit Transaksi' : 'Transaksi Baru'}
        </h2>

        {/* Type Selector */}
        <div className="mb-4">
          <label className="block text-xs sm:text-sm font-medium mb-2">Tipe</label>
          <div className="flex gap-2">
            {['income', 'expense'].map((type) => (
              <button
                key={type}
                onClick={() => {
                  setTransactionType(type as any);
                  setFormData(prev => ({ 
                    ...prev, 
                    type: type as any,
                    category: type === 'income' ? 'gaji' : 'makanan'
                  }));
                }}
                className={`flex-1 py-2 px-3 rounded-lg font-medium text-xs sm:text-sm transition-colors ${
                  transactionType === type
                    ? type === 'income' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type === 'income' ? '💰 Pemasukan' : '💸 Pengeluaran'}
              </button>
            ))}
          </div>
        </div>

        {/* Date */}
        <div className="mb-4">
          <label className="block text-xs sm:text-sm font-medium mb-2">Tanggal</label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
            className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Category */}
        <div className="mb-4">
          <label className="block text-xs sm:text-sm font-medium mb-2">Kategori</label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {Object.values(currentCategories).map(cat => (
              <button
                key={cat.id}
                onClick={() => setFormData(prev => ({ ...prev, category: cat.id }))}
                className={`p-2 rounded-lg text-xs font-medium transition-all ${
                  formData.category === cat.id
                    ? `${cat.bgColor} ring-2 ring-offset-2 ring-gray-400`
                    : `${cat.bgColor} hover:ring-2 hover:ring-offset-2 hover:ring-gray-300`
                }`}
              >
                <div>{cat.icon}</div>
                <div className="text-xs mt-1 line-clamp-1">{cat.name.split(' ')[1] || cat.name.split(' ')[0]}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Amount */}
        <div className="mb-4">
          <label className="block text-xs sm:text-sm font-medium mb-2">Jumlah (Rp)</label>
          <div className="relative">
            <input
              type="text"
              value={formData.amount ? parseInt(formData.amount).toLocaleString('id-ID') : ''}
              onChange={(e) => {
                // Hapus semua karakter non-digit
                const digitsOnly = e.target.value.replace(/\D/g, '');
                setFormData(prev => ({ ...prev, amount: digitsOnly }));
              }}
              placeholder="0"
              className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {formData.amount && (
              <div className="absolute -bottom-5 left-0 text-xs text-gray-500 mt-1">
                ≈ {formatCurrency(parseInt(formData.amount))}
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="mb-4">
          <label className="block text-xs sm:text-sm font-medium mb-2">Deskripsi</label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder={descriptionPlaceholders[transactionType === 'income' ? 'income' : 'expense'][formData.category] || 'Masukkan deskripsi transaksi'}
            className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Notes */}
        <div className="mb-4">
          <label className="block text-xs sm:text-sm font-medium mb-2">Catatan</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Catatan tambahan..."
            rows={2}
            className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleAddTransaction}
            className={`flex-1 py-2 px-3 rounded-lg font-medium text-xs sm:text-sm text-white transition-colors ${
              transactionType === 'income'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {editingId ? 'Update' : 'Simpan'}
          </button>
          <button
            onClick={() => {
              resetForm();
              setEditingId(null);
            }}
            className="flex-1 py-2 px-3 rounded-lg font-medium text-xs sm:text-sm bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );

  const renderScanForm = () => (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm">
        <h2 className="text-lg sm:text-xl font-bold mb-4">📸 Scan Struk (OCR)</h2>
        <p className="text-xs sm:text-sm text-gray-600 mb-4">
          Foto struk untuk extract otomatis nominal dan items. Anda bisa edit manual jika ada yang salah.
        </p>

        {/* Upload/Camera Buttons */}
        {!scanResult && (
          <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="p-4 sm:p-6 border-2 border-dashed border-blue-300 rounded-lg hover:border-blue-500 transition-colors disabled:opacity-50 text-xs sm:text-sm"
            >
              <Upload className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 text-blue-600" />
              <div className="font-medium text-blue-600">📁 Upload</div>
              <div className="text-xs text-gray-500">dari file</div>
            </button>

            <button
              onClick={() => cameraInputRef.current?.click()}
              disabled={isProcessing}
              className="p-4 sm:p-6 border-2 border-dashed border-green-300 rounded-lg hover:border-green-500 transition-colors disabled:opacity-50 text-xs sm:text-sm"
            >
              <Zap className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 text-green-600" />
              <div className="font-medium text-green-600">📷 Foto</div>
              <div className="text-xs text-gray-500">dari kamera</div>
            </button>
          </div>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="flex items-center justify-center p-4 bg-blue-50 rounded-lg gap-2 text-xs sm:text-sm mb-4">
            <Loader className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-blue-600" />
            <span className="text-blue-600">⏳ Memproses struk dengan OCR...</span>
          </div>
        )}

        {/* File Inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => e.target.files?.[0] && processReceiptImage(e.target.files[0])}
          className="hidden"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => e.target.files?.[0] && processReceiptImage(e.target.files[0])}
          className="hidden"
        />
      </div>

      {/* Scan Result - Preview & Edit */}
      {scanResult && (
        <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm">
          <h3 className="font-bold text-lg mb-4">✅ Hasil Scan Struk</h3>

          {/* Photo Preview */}
          {scanResult.imageData && (
            <div className="mb-4">
              <label className="block text-xs sm:text-sm font-medium mb-2">📸 Preview Foto Struk</label>
              <img 
                src={scanResult.imageData} 
                alt="Struk preview" 
                className="w-full h-auto max-h-64 object-cover rounded-lg border border-gray-300"
              />
            </div>
          )}

          {/* Editable Fields */}
          <div className="space-y-3 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-2">💰 Jumlah (Rp)</label>
              <input
                type="text"
                value={formData.amount ? parseInt(formData.amount).toLocaleString('id-ID') : ''}
                onChange={(e) => {
                  const digitsOnly = e.target.value.replace(/\D/g, '');
                  setFormData(prev => ({ ...prev, amount: digitsOnly }));
                }}
                placeholder="0"
                className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {formData.amount && (
                <div className="text-xs text-gray-600 mt-1">
                  ≈ {formatCurrency(parseInt(formData.amount))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium mb-2">📝 Deskripsi</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder={descriptionPlaceholders[transactionType === 'income' ? 'income' : 'expense'][formData.category] || 'Deskripsi dari struk'}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium mb-2">📋 Items Terdeteksi</label>
              <div className="max-h-40 overflow-y-auto p-2 bg-white rounded border border-gray-300 text-xs">
                {scanResult.items && scanResult.items.length > 0 ? (
                  scanResult.items.slice(0, 8).map((item: string, idx: number) => (
                    <div key={idx} className="py-1 text-gray-700 border-b border-gray-200 last:border-b-0">
                      {item.trim()}
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500">Tidak ada items terdeteksi</div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium mb-2">📌 Catatan Tambahan</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Tambahkan catatan jika ada info penting dari struk"
                rows={2}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => {
                handleAddTransaction();
                setScanResult(null);
              }}
              className="flex-1 py-2 px-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 text-xs sm:text-sm"
            >
              ✅ Simpan Transaksi
            </button>
            <button
              onClick={() => {
                setScanResult(null);
                resetForm();
              }}
              className="flex-1 py-2 px-3 bg-gray-400 text-white rounded-lg font-medium hover:bg-gray-500 text-xs sm:text-sm"
            >
              ❌ Batalkan
            </button>
          </div>

          {/* Edit Tips */}
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
            <strong>💡 Tips:</strong> OCR mungkin tidak 100% akurat. Pastikan jumlah dan deskripsi benar sebelum simpan.
          </div>
        </div>
      )}

      {/* Info Box */}
      {!scanResult && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
          <h4 className="font-bold text-blue-900 mb-2 text-sm">ℹ️ Cara Menggunakan Scan Struk:</h4>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>✓ Klik <strong>Upload</strong> untuk memilih foto struk dari galeri</li>
            <li>✓ Atau klik <strong>Foto</strong> untuk ambil foto langsung dari kamera</li>
            <li>✓ Tunggu OCR memproses (2-5 detik)</li>
            <li>✓ Review hasil dan edit jika ada yang salah</li>
            <li>✓ Klik <strong>Simpan Transaksi</strong> untuk konfirmasi</li>
          </ul>
        </div>
      )}
    </div>
  );

  const renderHistory = () => (
    <div className="w-full max-w-4xl mx-auto space-y-3 sm:space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm">
        <h3 className="font-bold mb-3 text-sm sm:text-base">Filter</h3>
        <div className="space-y-2">
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg"
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg"
          >
            <option value="">Semua Kategori</option>
            {Object.entries(allCategories).map(([key, cat]) => (
              <option key={key} value={key}>{cat.name}</option>
            ))}
          </select>
          <button
            onClick={() => {
              setFilterDate('');
              setFilterCategory('');
            }}
            className="w-full px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-xs sm:text-sm font-medium"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Transactions */}
      <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm">
        <h3 className="font-bold mb-3 text-sm sm:text-base">Riwayat ({filteredTransactions.length})</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-6 text-gray-500 text-xs sm:text-sm">Tidak ada transaksi</div>
          ) : (
            filteredTransactions.map(t => {
              const category = allCategories[t.category];
              return (
                <div key={t.id} className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg hover:bg-gray-100 gap-2 text-xs sm:text-sm">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-base sm:text-lg flex-shrink-0">{category?.icon}</span>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{t.description}</div>
                      <div className="text-gray-500 text-xs">{t.date}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <div className={`font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount).split(' ')[1]}
                    </div>
                    <button
                      onClick={() => handleEdit(t)}
                      className="p-1 hover:bg-blue-100 rounded text-blue-600"
                    >
                      <Edit2 className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="p-1 hover:bg-red-100 rounded text-red-600"
                    >
                      <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );

  // Generate bar chart data by day
  const getDailyChartData = () => {
    const data: Record<string, { income: number; expense: number }> = {};
    monthTransactions.forEach(t => {
      if (!data[t.date]) data[t.date] = { income: 0, expense: 0 };
      if (t.type === 'income') data[t.date].income += t.amount;
      else data[t.date].expense += t.amount;
    });
    return Object.entries(data)
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .slice(-15) // Last 15 days
      .map(([date, val]) => ({ date, ...val }));
  };

  const dailyData = getDailyChartData();
  const maxDailyValue = Math.max(
    ...dailyData.map(d => Math.max(d.income, d.expense)),
    1
  );

  const renderAnalisis = () => (
    <div className="w-full max-w-6xl mx-auto space-y-3 sm:space-y-4">
      {/* Bar Chart - Daily Income vs Expense */}
      <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm">
        <h3 className="font-bold mb-4 text-sm sm:text-base">📊 Grafik Harian (15 Hari Terakhir)</h3>
        
        {dailyData.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">Belum ada data transaksi</div>
        ) : (
          <div className="overflow-x-auto pb-2">
            <div className="flex items-end gap-1 sm:gap-2 min-w-min h-48">
              {dailyData.map((item, idx) => (
                <div key={idx} className="flex flex-col items-center flex-shrink-0 w-8 sm:w-10">
                  <div className="flex gap-0.5 h-40 sm:h-44 items-end">
                    {/* Income Bar */}
                    <div
                      className="bg-emerald-500 rounded-t-sm transition-all hover:bg-emerald-600 relative group"
                      style={{
                        width: '6px',
                        height: `${(item.income / maxDailyValue) * 160}px`,
                      }}
                    >
                      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        +{formatCurrency(item.income).split(' ')[1]}
                      </div>
                    </div>
                    
                    {/* Expense Bar */}
                    <div
                      className="bg-red-500 rounded-t-sm transition-all hover:bg-red-600 relative group"
                      style={{
                        width: '6px',
                        height: `${(item.expense / maxDailyValue) * 160}px`,
                      }}
                    >
                      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        -{formatCurrency(item.expense).split(' ')[1]}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 mt-2 whitespace-nowrap transform -rotate-45 origin-left">{item.date.slice(-2)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex gap-4 mt-4 text-xs sm:text-sm justify-center">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-emerald-500 rounded"></div>
            <span>Pemasukan</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>Pengeluaran</span>
          </div>
        </div>
      </div>

      {/* Pie Chart Style - Category Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {/* Spending */}
        <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm">
          <h3 className="font-bold mb-4 text-sm sm:text-base">🔴 Pengeluaran per Kategori</h3>
          <div className="space-y-3">
            {Object.entries(categoryExpenses)
              .filter(([, amount]) => amount > 0)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 8)
              .map(([catId, amount]) => {
                const category = expenseCategories[catId];
                const percentage = monthExpense > 0 ? (amount / monthExpense * 100) : 0;
                return (
                  <div key={catId} className="group">
                    <div className="flex justify-between items-center mb-1.5 text-xs sm:text-sm">
                      <span className="font-medium flex items-center gap-1.5">
                        <span>{category.icon}</span>
                        <span className="truncate">{category.name.split(' ').slice(1).join(' ')}</span>
                      </span>
                      <span className="font-bold text-red-600 flex-shrink-0">{percentage.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 sm:h-3 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-red-400 to-red-600 h-full rounded-full transition-all duration-500 group-hover:shadow-lg group-hover:shadow-red-400"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{formatCurrency(amount).split(' ')[1]}</div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Income */}
        <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm">
          <h3 className="font-bold mb-4 text-sm sm:text-base">🟢 Pemasukan per Kategori</h3>
          <div className="space-y-3">
            {Object.entries(categoryIncomes)
              .filter(([, amount]) => amount > 0)
              .sort(([, a], [, b]) => b - a)
              .map(([catId, amount]) => {
                const category = incomeCategories[catId];
                const percentage = monthIncome > 0 ? (amount / monthIncome * 100) : 0;
                return (
                  <div key={catId} className="group">
                    <div className="flex justify-between items-center mb-1.5 text-xs sm:text-sm">
                      <span className="font-medium flex items-center gap-1.5">
                        <span>{category.icon}</span>
                        <span className="truncate">{category.name.split(' ').slice(1).join(' ')}</span>
                      </span>
                      <span className="font-bold text-emerald-600 flex-shrink-0">{percentage.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 sm:h-3 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-full rounded-full transition-all duration-500 group-hover:shadow-lg group-hover:shadow-emerald-400"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{formatCurrency(amount).split(' ')[1]}</div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Advanced Statistics */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm border border-blue-100">
        <h3 className="font-bold mb-4 text-sm sm:text-base">📈 Statistik Mendalam</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {/* Average Daily Expense */}
          <div className="bg-white rounded-lg p-2.5 sm:p-3 shadow-sm border-l-4 border-red-500">
            <div className="text-xs text-gray-600 font-medium">Rata-rata Harian</div>
            <div className="font-bold text-red-600 text-sm sm:text-lg mt-1">
              {formatCurrency(monthExpense / 30).split(' ')[1]}
            </div>
            <div className="text-xs text-gray-500 mt-1">pengeluaran</div>
          </div>

          {/* Transaction Count */}
          <div className="bg-white rounded-lg p-2.5 sm:p-3 shadow-sm border-l-4 border-blue-500">
            <div className="text-xs text-gray-600 font-medium">Total Transaksi</div>
            <div className="font-bold text-blue-600 text-sm sm:text-lg mt-1">{monthTransactions.length}</div>
            <div className="text-xs text-gray-500 mt-1">bulan ini</div>
          </div>

          {/* Max Expense */}
          <div className="bg-white rounded-lg p-2.5 sm:p-3 shadow-sm border-l-4 border-purple-500">
            <div className="text-xs text-gray-600 font-medium">Pengeluaran Terbesar</div>
            <div className="font-bold text-purple-600 text-sm sm:text-lg mt-1">
              {formatCurrency(Math.max(...monthTransactions.filter(t => t.type === 'expense').map(t => t.amount), 0)).split(' ')[1]}
            </div>
            <div className="text-xs text-gray-500 mt-1">puncak</div>
          </div>

          {/* Max Income */}
          <div className="bg-white rounded-lg p-2.5 sm:p-3 shadow-sm border-l-4 border-emerald-500">
            <div className="text-xs text-gray-600 font-medium">Pemasukan Terbesar</div>
            <div className="font-bold text-emerald-600 text-sm sm:text-lg mt-1">
              {formatCurrency(Math.max(...monthTransactions.filter(t => t.type === 'income').map(t => t.amount), 0)).split(' ')[1]}
            </div>
            <div className="text-xs text-gray-500 mt-1">puncak</div>
          </div>

          {/* Most Expensive Category */}
          <div className="bg-white rounded-lg p-2.5 sm:p-3 shadow-sm border-l-4 border-orange-500 col-span-1 sm:col-span-2">
            <div className="text-xs text-gray-600 font-medium">Kategori Terbesar</div>
            <div className="font-bold text-orange-600 text-sm mt-1">
              {Object.entries(categoryExpenses).sort(([, a], [, b]) => b - a)[0]?.[1] > 0
                ? expenseCategories[Object.entries(categoryExpenses).sort(([, a], [, b]) => b - a)[0][0]].name.split(' ').slice(1).join(' ')
                : 'Belum ada'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {formatCurrency(Math.max(...Object.values(categoryExpenses))).split(' ')[1]}
            </div>
          </div>

          {/* Most Income Category */}
          <div className="bg-white rounded-lg p-2.5 sm:p-3 shadow-sm border-l-4 border-green-500 col-span-1 sm:col-span-2">
            <div className="text-xs text-gray-600 font-medium">Pemasukan Terbesar</div>
            <div className="font-bold text-green-600 text-sm mt-1">
              {Object.entries(categoryIncomes).sort(([, a], [, b]) => b - a)[0]?.[1] > 0
                ? incomeCategories[Object.entries(categoryIncomes).sort(([, a], [, b]) => b - a)[0][0]].name.split(' ').slice(1).join(' ')
                : 'Belum ada'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {formatCurrency(Math.max(...Object.values(categoryIncomes))).split(' ')[1]}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Text */}
      <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm border border-gray-200">
        <h3 className="font-bold mb-3 text-sm sm:text-base">📝 Ringkasan Bulan Ini</h3>
        <div className="space-y-2 text-xs sm:text-sm text-gray-700">
          <p>💰 Total pemasukan bulan ini adalah <span className="font-bold text-emerald-600">{formatCurrency(monthIncome).split(' ')[1]}</span> dengan rata-rata <span className="font-bold">{formatCurrency(monthIncome / 30).split(' ')[1]}</span> per hari.</p>
          <p>💸 Total pengeluaran bulan ini adalah <span className="font-bold text-red-600">{formatCurrency(monthExpense).split(' ')[1]}</span> dengan rata-rata <span className="font-bold">{formatCurrency(monthExpense / 30).split(' ')[1]}</span> per hari.</p>
          <p>
            💎 Sisa untuk ditabung adalah <span className={`font-bold ${monthSavings >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatCurrency(monthSavings).split(' ')[1]}
            </span> ({savingsPercentage.toFixed(1)}% dari pemasukan)
            {monthSavings >= 0 ? ' ✅' : ' ⚠️'}
          </p>
          <p>📊 Anda telah membuat <span className="font-bold">{monthTransactions.length}</span> transaksi bulan ini, dengan rata-rata <span className="font-bold">{(monthTransactions.length / 30).toFixed(1)}</span> transaksi per hari.</p>
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm space-y-4">
        <h2 className="text-lg sm:text-xl font-bold">Pengaturan</h2>

        {/* Google Sheets */}
        <div>
          <h3 className="font-bold mb-2 text-sm sm:text-base flex items-center gap-2">
            <Cloud className="w-4 h-4 text-blue-600" />
            Google Sheets
          </h3>
          <input
            type="text"
            value={googleSheetId}
            onChange={(e) => {
              setGoogleSheetId(e.target.value);
              localStorage.setItem('keuangan_sheetId', e.target.value);
            }}
            placeholder="Paste Sheet ID"
            className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => {
              setSyncStatus('success');
              setTimeout(() => setSyncStatus('idle'), 3000);
            }}
            className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 text-xs sm:text-sm"
          >
            Simpan
          </button>
        </div>

        {syncStatus !== 'idle' && (
          <div className={`p-3 rounded-lg flex items-center gap-2 text-xs sm:text-sm ${
            syncStatus === 'success' ? 'bg-green-50 text-green-700' :
            syncStatus === 'error' ? 'bg-red-50 text-red-700' :
            'bg-blue-50 text-blue-700'
          }`}>
            {syncStatus === 'success' && <CheckCircle className="w-4 h-4" />}
            {syncStatus === 'error' && <AlertCircle className="w-4 h-4" />}
            {syncStatus === 'syncing' && <Loader className="w-4 h-4 animate-spin" />}
            <span>{syncStatus === 'syncing' ? 'Menyinkronkan...' : syncStatus === 'success' ? 'Tersimpan!' : 'Error'}</span>
          </div>
        )}

        <div className="border-t pt-4">
          <h3 className="font-bold mb-2 text-sm">Data</h3>
          <button
            onClick={() => {
              if (confirm('Hapus semua data?')) {
                setTransactions([]);
                localStorage.removeItem('keuangan_transactions');
              }
            }}
            className="w-full py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 text-xs sm:text-sm"
          >
            Hapus Data
          </button>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-bold mb-2 text-sm">Backup</h3>
          <button
            onClick={() => {
              const dataStr = JSON.stringify(transactions, null, 2);
              const dataBlob = new Blob([dataStr], { type: 'application/json' });
              const url = URL.createObjectURL(dataBlob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `backup_${new Date().toISOString().slice(0, 10)}.json`;
              link.click();
            }}
            className="w-full py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 text-xs sm:text-sm"
          >
            Download Backup
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 pb-24 sm:pb-8">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700 sticky top-0 z-50 shadow-lg">
        <div className="w-full px-3 sm:px-4 py-2.5 sm:py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="text-2xl sm:text-3xl flex-shrink-0">💵</div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold text-white truncate">Catat Keuangan</h1>
                <p className="text-xs text-slate-400 hidden sm:block">Personal Finance</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-slate-800 border-b border-slate-700 sticky top-12 sm:top-14 z-40 overflow-x-auto">
        <div className="w-full px-2 sm:px-4">
          <div className="flex gap-1 py-2 pb-2 overflow-x-auto">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Home },
              { id: 'input', label: 'Input', icon: Plus },
              { id: 'scan', label: 'Scan', icon: Upload },
              { id: 'history', label: 'Riwayat', icon: Calendar },
              { id: 'analisis', label: 'Analisis', icon: BarChart3 },
              { id: 'settings', label: 'Atur', icon: Filter },
            ].map(tab => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                  }}
                  className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium flex items-center gap-1 sm:gap-2 transition-colors whitespace-nowrap text-xs sm:text-sm flex-shrink-0 ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <TabIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="w-full px-3 sm:px-4 py-3 sm:py-6">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'input' && renderInputForm()}
        {activeTab === 'scan' && renderScanForm()}
        {activeTab === 'history' && renderHistory()}
        {activeTab === 'analisis' && renderAnalisis()}
        {activeTab === 'settings' && renderSettings()}
      </main>

      {/* Mobile FAB */}
      {activeTab !== 'input' && (
        <button
          onClick={() => setActiveTab('input')}
          className="fixed bottom-6 right-4 sm:hidden w-14 h-14 bg-emerald-600 text-white rounded-full shadow-xl flex items-center justify-center hover:bg-emerald-700 active:scale-95 transition-all z-40"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
