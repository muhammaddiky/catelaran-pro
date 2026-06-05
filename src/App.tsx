import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Trash2, Edit2, TrendingUp, TrendingDown, Calendar, Filter, BarChart3, 
  Home, Upload, Cloud, AlertCircle, CheckCircle, Loader, Eye, EyeOff, X,
  PieChart, ArrowUpRight, ArrowDownLeft, DollarSign, Zap, Lightbulb, AlertTriangle
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

  // ========== FUNGSI PERHITUNGAN NOMINAL ==========
  // Fungsi untuk menghitung total pemasukan bulan ini
  const getMonthlyIncome = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return transactions
      .filter(t => {
        const transDate = new Date(t.date);
        return t.type === 'income' && 
               transDate.getMonth() === currentMonth && 
               transDate.getFullYear() === currentYear;
      })
      .reduce((sum, t) => sum + t.amount, 0);
  };

  // Fungsi untuk menghitung total pengeluaran bulan ini
  const getMonthlyExpense = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return transactions
      .filter(t => {
        const transDate = new Date(t.date);
        return t.type === 'expense' && 
               transDate.getMonth() === currentMonth && 
               transDate.getFullYear() === currentYear;
      })
      .reduce((sum, t) => sum + t.amount, 0);
  };

  // Fungsi untuk menghitung tabungan (total pemasukan - total pengeluaran)
  const getSavings = () => {
    return getMonthlyIncome() - getMonthlyExpense();
  };

  // Fungsi untuk format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // ========== FUNGSI AI FINANCIAL ADVICE ==========
  const generateFinancialAdvice = () => {
    const income = getMonthlyIncome();
    const expense = getMonthlyExpense();
    const savings = getSavings();
    const savingsRate = income > 0 ? (savings / income) * 100 : 0;

    const advice: string[] = [];

    // Kategori pengeluaran terbesar
    const expenseByCategory: Record<string, number> = {};
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + t.amount;
      });

    const topExpense = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1])[0];

    // Rule 1: Savings rate check
    if (income === 0) {
      advice.push('📝 Mulai catat pemasukan Anda untuk mendapatkan rekomendasi finansial yang lebih baik.');
    } else if (savingsRate < 10) {
      advice.push('⚠️ Tingkat tabungan Anda hanya ' + savingsRate.toFixed(1) + '%. Coba kurangi pengeluaran tidak penting hingga minimal 20% dari pemasukan.');
    } else if (savingsRate < 20) {
      advice.push('💡 Tingkat tabungan Anda ' + savingsRate.toFixed(1) + '%. Bagus, tapi bisa ditingkatkan lagi menjadi 30%.');
    } else if (savingsRate >= 30) {
      advice.push('🎯 Luar biasa! Anda sudah menabung ' + savingsRate.toFixed(1) + '% dari pendapatan. Pertahankan kebiasaan ini!');
    }

    // Rule 2: Expense check
    if (expense > income && income > 0) {
      const deficit = expense - income;
      advice.push('🚨 Pengeluaran Anda melebihi pemasukan sebesar ' + formatCurrency(deficit) + '. Segera tinjau ulang pos pengeluaran Anda!');
    }

    // Rule 3: Top expense category warning
    if (topExpense && topExpense[1] > income * 0.5) {
      const categoryName = Object.values(expenseCategories).find(c => c.id === topExpense[0])?.name || topExpense[0];
      advice.push('💸 ' + categoryName + ' menjadi pengeluaran terbesar Anda (' + formatCurrency(topExpense[1]) + '). Pastikan ini adalah prioritas utama!');
    }

    // Rule 4: No expense recorded
    if (transactions.filter(t => t.type === 'expense').length === 0) {
      advice.push('📊 Belum ada data pengeluaran. Mulai catat pengeluaran harian Anda untuk analisis yang lebih akurat.');
    }

    // Rule 5: Positive advice for good habits
    if (income > 0 && expense > 0 && savingsRate >= 20 && expense <= income) {
      advice.push('✨ Manajemen keuangan Anda sangat baik! Pertimbangkan untuk menginvestasikan tabungan Anda di instrumen yang menguntungkan.');
    }

    return advice.length > 0 ? advice : ['💭 Terus catat transaksi Anda untuk mendapatkan saran keuangan yang lebih akurat.'];
  };

  // Fungsi untuk get data kategori pengeluaran
  const getExpensesByCategory = () => {
    const data: Record<string, number> = {};
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        data[t.category] = (data[t.category] || 0) + t.amount;
      });
    return Object.entries(data).map(([cat, amount]) => ({
      category: cat,
      categoryName: expenseCategories[cat]?.name || cat,
      amount,
      percentage: (amount / getMonthlyExpense()) * 100,
    })).sort((a, b) => b.amount - a.amount);
  };

  // Fungsi untuk get data kategori pemasukan
  const getIncomeByCategory = () => {
    const data: Record<string, number> = {};
    transactions
      .filter(t => t.type === 'income')
      .forEach(t => {
        data[t.category] = (data[t.category] || 0) + t.amount;
      });
    return Object.entries(data).map(([cat, amount]) => ({
      category: cat,
      categoryName: incomeCategories[cat]?.name || cat,
      amount,
      percentage: (amount / getMonthlyIncome()) * 100,
    })).sort((a, b) => b.amount - a.amount);
  };

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
      alert('❌ Deskripsi dan nominal harus diisi!');
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
    } else {
      setTransactions([newTransaction, ...transactions]);
    }

    // Reset form
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

    alert('✅ Transaksi berhasil ditambahkan!');
  };

  const handleDeleteTransaction = (id: string) => {
    if (window.confirm('Yakin hapus transaksi ini?')) {
      setTransactions(transactions.filter(t => t.id !== id));
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

  const filteredTransactions = transactions
    .filter(t => !filterDate || t.date === filterDate)
    .filter(t => !filterCategory || t.category === filterCategory)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getCategories = () => {
    return transactionType === 'income' ? incomeCategories : expenseCategories;
  };

  const currentCategory = getCategories()[formData.category];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-950 to-slate-900 border-b border-blue-700 shadow-lg p-3 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-green-400" />
            <h1 className="text-lg font-bold">Catat Keuangan</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-3 pb-32">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4 py-4">
            {/* Stats Cards - Mobile Friendly */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Pemasukan Bulan Ini - Hijau */}
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 shadow-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-green-100 text-xs font-medium">Pemasukan</p>
                    <p className="text-green-50 text-xs">Bulan ini</p>
                  </div>
                  <ArrowDownLeft className="w-4 h-4 text-green-100" />
                </div>
                <p className="text-xl font-bold text-white">
                  {formatCurrency(getMonthlyIncome())}
                </p>
              </div>

              {/* Pengeluaran Bulan Ini - Merah */}
              <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-4 shadow-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-red-100 text-xs font-medium">Pengeluaran</p>
                    <p className="text-red-50 text-xs">Bulan ini</p>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-red-100" />
                </div>
                <p className="text-xl font-bold text-white">
                  {formatCurrency(getMonthlyExpense())}
                </p>
              </div>

              {/* Tabungan */}
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 shadow-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-purple-100 text-xs font-medium">Tabungan</p>
                    <p className="text-purple-50 text-xs">Bulan ini</p>
                  </div>
                  <Zap className="w-4 h-4 text-purple-100" />
                </div>
                <p className="text-xl font-bold text-white">
                  {formatCurrency(getSavings())}
                </p>
              </div>

              {/* Cash Flow */}
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 shadow-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-blue-100 text-xs font-medium">Cash Flow</p>
                    <p className="text-blue-50 text-xs">Status</p>
                  </div>
                  <TrendingDown className="w-4 h-4 text-blue-100" />
                </div>
                <p className="text-xl font-bold text-white">
                  {getSavings() > 0 ? '✅ Positif' : '⚠️ Negatif'}
                </p>
              </div>
            </div>

            {/* Quick Stats - White Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              {/* Pengeluaran Card - Putih */}
              <div className="bg-white rounded-lg p-4 shadow-lg">
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-red-100 p-2 rounded-lg">
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-gray-800 font-semibold text-sm">Pengeluaran</h3>
                    <p className="text-gray-500 text-xs">Total bulan ini</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(getMonthlyExpense())}
                </p>
              </div>

              {/* Pemasukan Card - Putih */}
              <div className="bg-white rounded-lg p-4 shadow-lg">
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-gray-800 font-semibold text-sm">Pemasukan</h3>
                    <p className="text-gray-500 text-xs">Total bulan ini</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(getMonthlyIncome())}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Input Tab */}
        {activeTab === 'input' && (
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-4 shadow-lg py-4">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              {editingId ? 'Edit' : 'Tambah'} Transaksi
            </h2>

            {/* Type Selector */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={() => {
                  setTransactionType('expense');
                  setFormData(prev => ({
                    ...prev,
                    type: 'expense',
                    category: 'makanan',
                  }));
                }}
                className={`p-3 rounded-lg font-bold text-sm transition-all ${
                  transactionType === 'expense'
                    ? 'bg-red-500 scale-105 shadow-lg'
                    : 'bg-slate-700 hover:bg-slate-600'
                }`}
              >
                💸 Pengeluaran
              </button>
              <button
                onClick={() => {
                  setTransactionType('income');
                  setFormData(prev => ({
                    ...prev,
                    type: 'income',
                    category: 'gaji',
                  }));
                }}
                className={`p-3 rounded-lg font-bold text-sm transition-all ${
                  transactionType === 'income'
                    ? 'bg-green-500 scale-105 shadow-lg'
                    : 'bg-slate-700 hover:bg-slate-600'
                }`}
              >
                💰 Pemasukan
              </button>
            </div>

            {/* Form Fields */}
            <div className="space-y-3">
              {/* Date */}
              <div>
                <label className="block text-xs font-medium mb-1">Tanggal</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-medium mb-1">Kategori</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                >
                  {Object.entries(getCategories()).map(([key, cat]) => (
                    <option key={key} value={key}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium mb-1">Deskripsi</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={currentCategory ? descriptionPlaceholders[formData.type]?.[formData.category] : ''}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-medium mb-1">Nominal</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="Masukkan nominal"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium mb-1">Catatan (Opsional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Catatan tambahan"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 h-16 resize-none"
                />
              </div>

              {/* Submit Button */}
              <button
                onClick={handleAddTransaction}
                className={`w-full p-3 rounded-lg font-bold text-sm transition-all ${
                  transactionType === 'income'
                    ? 'bg-green-500 hover:bg-green-600'
                    : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {editingId ? '✏️ Update' : '➕ Tambah'} Transaksi
              </button>

              {editingId && (
                <button
                  onClick={() => {
                    setEditingId(null);
                    setFormData({
                      date: new Date().toISOString().split('T')[0],
                      type: 'expense',
                      category: 'makanan',
                      subcategory: '',
                      description: '',
                      amount: '',
                      notes: '',
                    });
                  }}
                  className="w-full p-2 rounded-lg font-bold text-sm bg-slate-600 hover:bg-slate-700 transition-all"
                >
                  ❌ Batal
                </button>
              )}
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-3 py-4">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5" />
              Riwayat Transaksi
            </h2>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="">Semua Kategori</option>
                {Object.entries({ ...incomeCategories, ...expenseCategories }).map(([key, cat]) => (
                  <option key={key} value={key}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Transactions List */}
            {filteredTransactions.length === 0 ? (
              <div className="bg-slate-800 rounded-lg p-6 text-center">
                <p className="text-gray-400 text-sm">Belum ada transaksi</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTransactions.map(transaction => {
                  // Fix bug: Get category dari tipe transaksi yang sesuai
                  const categories = transaction.type === 'income' ? incomeCategories : expenseCategories;
                  const category = categories[transaction.category];
                  
                  return (
                    <div
                      key={transaction.id}
                      className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-lg p-3 hover:from-slate-700 hover:to-slate-600 transition-all shadow-md"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {category && (
                            <div className={`text-lg p-2 rounded-lg flex-shrink-0 ${category.bgColor}`}>
                              {category.icon}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm truncate">{category?.name}</h3>
                            <p className="text-xs text-gray-400 truncate">{transaction.description}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(transaction.date).toLocaleDateString('id-ID', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={`text-sm font-bold ${
                            transaction.type === 'income' ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {transaction.type === 'income' ? '+' : '-'}
                            {formatCurrency(transaction.amount).replace('Rp', '').trim()}
                          </p>
                          <div className="flex gap-1 mt-2 justify-end">
                            <button
                              onClick={() => handleEditTransaction(transaction)}
                              className="p-1 hover:bg-slate-600 rounded transition-all"
                              title="Edit"
                            >
                              <Edit2 className="w-3 h-3 text-blue-400" />
                            </button>
                            <button
                              onClick={() => handleDeleteTransaction(transaction.id)}
                              className="p-1 hover:bg-slate-600 rounded transition-all"
                              title="Hapus"
                            >
                              <Trash2 className="w-3 h-3 text-red-400" />
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

        {/* Analytics Tab */}
        {activeTab === 'analisis' && (
          <div className="space-y-4 py-4">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5" />
              Analisis Keuangan
            </h2>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-slate-800 rounded-lg p-3">
                <p className="text-gray-400 text-xs mb-1">Total Transaksi</p>
                <p className="text-2xl font-bold">{transactions.length}</p>
              </div>
              <div className="bg-slate-800 rounded-lg p-3">
                <p className="text-gray-400 text-xs mb-1">Rata-rata Pengeluaran</p>
                <p className="text-lg font-bold text-red-400">
                  {formatCurrency(
                    transactions.filter(t => t.type === 'expense').length > 0
                      ? transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0) /
                        transactions.filter(t => t.type === 'expense').length
                      : 0
                  )}
                </p>
              </div>
              <div className="bg-slate-800 rounded-lg p-3">
                <p className="text-gray-400 text-xs mb-1">Rata-rata Pemasukan</p>
                <p className="text-lg font-bold text-green-400">
                  {formatCurrency(
                    transactions.filter(t => t.type === 'income').length > 0
                      ? transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) /
                        transactions.filter(t => t.type === 'income').length
                      : 0
                  )}
                </p>
              </div>
            </div>

            {/* Financial Advice Section */}
            <div className="bg-gradient-to-br from-yellow-900 to-yellow-950 border border-yellow-700 rounded-lg p-4">
              <h3 className="font-bold text-yellow-200 mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                💡 Saran Keuangan
              </h3>
              <div className="space-y-2">
                {generateFinancialAdvice().map((advice, idx) => (
                  <p key={idx} className="text-yellow-100 text-sm leading-relaxed">
                    {advice}
                  </p>
                ))}
              </div>
            </div>

            {/* Expense By Category */}
            {getMonthlyExpense() > 0 && (
              <div className="bg-slate-800 rounded-lg p-4">
                <h3 className="font-bold mb-3 text-sm">📊 Pengeluaran per Kategori</h3>
                <div className="space-y-2">
                  {getExpensesByCategory().map((item, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-300 truncate flex-1">
                          {item.categoryName}
                        </span>
                        <span className="text-xs font-bold text-red-400 ml-2">
                          {formatCurrency(item.amount)}
                        </span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-red-500 to-red-600 h-full rounded-full"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{item.percentage.toFixed(1)}%</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Income By Category */}
            {getMonthlyIncome() > 0 && (
              <div className="bg-slate-800 rounded-lg p-4">
                <h3 className="font-bold mb-3 text-sm">📈 Pemasukan per Kategori</h3>
                <div className="space-y-2">
                  {getIncomeByCategory().map((item, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-300 truncate flex-1">
                          {item.categoryName}
                        </span>
                        <span className="text-xs font-bold text-green-400 ml-2">
                          {formatCurrency(item.amount)}
                        </span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-green-500 to-green-600 h-full rounded-full"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{item.percentage.toFixed(1)}%</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Savings Rate Indicator */}
            {getMonthlyIncome() > 0 && (
              <div className="bg-slate-800 rounded-lg p-4">
                <h3 className="font-bold mb-3 text-sm">🎯 Tingkat Tabungan</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-300">Tabungan</span>
                    <span className="text-sm font-bold text-purple-400">
                      {((getSavings() / getMonthlyIncome()) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-purple-600 h-full rounded-full"
                      style={{ width: `${((getSavings() / getMonthlyIncome()) * 100).toFixed(1)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Target ideal: 20-30% dari pemasukan bulanan
                  </p>
                </div>
              </div>
            )}

            {/* Financial Status */}
            <div className={`rounded-lg p-4 border ${
              getSavings() > 0
                ? 'bg-green-950 border-green-700'
                : 'bg-red-950 border-red-700'
            }`}>
              <h3 className="font-bold mb-2 text-sm flex items-center gap-2">
                {getSavings() > 0 ? '✅ Status Sehat' : '⚠️ Status Perlu Perhatian'}
              </h3>
              <p className={`text-sm ${getSavings() > 0 ? 'text-green-200' : 'text-red-200'}`}>
                {getSavings() > 0
                  ? `Selamat! Anda memiliki surplus sebesar ${formatCurrency(getSavings())}. Pertahankan kebiasaan finansial yang sehat ini.`
                  : `Pengeluaran Anda melebihi pemasukan sebesar ${formatCurrency(Math.abs(getSavings()))}. Segera tinjau ulang pos pengeluaran.`
                }
              </p>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-4 shadow-lg space-y-4 py-4">
            <h2 className="text-lg font-bold">⚙️ Pengaturan</h2>
            <div className="space-y-3">
              <button
                onClick={() => {
                  if (window.confirm('Yakin hapus semua data? Tindakan ini tidak bisa dibatalkan!')) {
                    setTransactions([]);
                    alert('✅ Semua data telah dihapus');
                  }
                }}
                className="w-full p-3 bg-red-600 hover:bg-red-700 rounded-lg font-bold text-sm transition-all"
              >
                🗑️ Hapus Semua Data
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Navigation Bar - Mobile Optimized */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900 to-transparent border-t border-blue-700 shadow-2xl">
        <div className="flex justify-around items-center h-16 px-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-lg transition-all text-xs font-medium ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 scale-110'
                : 'hover:bg-slate-700'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>Dashboard</span>
          </button>
          <button
            onClick={() => setActiveTab('input')}
            className={`flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-lg transition-all text-xs font-medium ${
              activeTab === 'input'
                ? 'bg-blue-600 scale-110'
                : 'hover:bg-slate-700'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Input</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-lg transition-all text-xs font-medium ${
              activeTab === 'history'
                ? 'bg-blue-600 scale-110'
                : 'hover:bg-slate-700'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Riwayat</span>
          </button>
          <button
            onClick={() => setActiveTab('analisis')}
            className={`flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-lg transition-all text-xs font-medium ${
              activeTab === 'analisis'
                ? 'bg-blue-600 scale-110'
                : 'hover:bg-slate-700'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Analisis</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-lg transition-all text-xs font-medium ${
              activeTab === 'settings'
                ? 'bg-blue-600 scale-110'
                : 'hover:bg-slate-700'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>Setelan</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
