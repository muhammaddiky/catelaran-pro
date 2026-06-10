import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DollarSign, Mail, Lock, User, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

export const AuthScreen: React.FC = () => {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error, data } = await signIn(email, password);
        
        if (error) {
          if (error.message.includes('Email logins are disabled')) {
            toast.error('Login email sedang dinonaktifkan. Hubungi admin.');
          } else if (error.message.includes('Invalid login credentials')) {
            toast.error('Email atau password salah!');
          } else if (error.message.includes('Email not confirmed')) {
            toast.error('Email belum diverifikasi. Silakan cek inbox Anda.');
          } else if (error.status === 400 || error.status === 422) {
            toast.error('Email belum terdaftar atau password salah!');
          } else {
            toast.error(error.message || 'Terjadi kesalahan. Silakan coba lagi.');
          }
          console.error('Login error:', error);
        } else {
          toast.success('Selamat datang kembali! 👋');
        }
      } else {
        // Register logic
        if (!fullName.trim()) { 
          toast.error('Nama lengkap wajib diisi'); 
          setLoading(false); 
          return; 
        }
        if (password.length < 6) { 
          toast.error('Password minimal 6 karakter'); 
          setLoading(false); 
          return; 
        }
        
        const { error, data } = await signUp(email, password, fullName);
        
        if (error) {
          if (error.message.includes('User already registered')) {
            toast.error('Email sudah terdaftar!');
          } else if (error.message.includes('Password should be at least')) {
            toast.error('Password minimal 6 karakter');
          } else {
            toast.error(error.message || 'Gagal mendaftar. Silakan coba lagi.');
          }
          console.error('Register error:', error);
        } else {
          // ✅ PENTING: Sign out jika user otomatis login setelah signup
          if (data.user && data.session) {
            await supabase.auth.signOut();
          }
          
          // Tampilkan notifikasi detail dengan kredensial
          toast.success('✅ Akun berhasil dibuat!');
          toast(
            <div className="text-sm">
              <p className="font-semibold mb-1">📧 Email: <span className="font-mono">{email}</span></p>
              <p className="font-semibold">🔑 Password: <span className="font-mono">{password}</span></p>
              <p className="text-xs mt-2 text-blue-300">Silakan login dengan kredensial di atas</p>
            </div>,
            { duration: 15000 } // Tampilkan 15 detik
          );
          
          // ✅ JANGAN clear email & password - biarkan terisi untuk login
          setFullName('');
          
          // Switch ke mode login setelah delay singkat
          setTimeout(() => {
            setMode('login');
          }, 2000); // Tunggu 2 detik sebelum switch
        }
      }
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-3xl shadow-2xl mb-4">
            <DollarSign className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">Catat Keuangan</h1>
          <p className="text-white/80 text-sm">Pro Edition • Kelola keuangan dengan cerdas</p>
        </div>

        {/* Form Card */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-6 space-y-4">
          {/* Mode Toggle */}
          <div className="flex gap-2 bg-slate-100 dark:bg-slate-700 rounded-xl p-1">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all ${
                mode === 'login' 
                  ? 'bg-white dark:bg-slate-600 shadow text-slate-900 dark:text-white' 
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Masuk
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all ${
                mode === 'register' 
                  ? 'bg-white dark:bg-slate-600 shadow text-slate-900 dark:text-white' 
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Daftar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'register' && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Nama Lengkap"
                  className="w-full bg-slate-100 dark:bg-slate-700 pl-10 pr-3 py-3 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full bg-slate-100 dark:bg-slate-700 pl-10 pr-3 py-3 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-slate-100 dark:bg-slate-700 pl-10 pr-3 py-3 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-xl font-semibold text-sm shadow-lg active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader className="w-4 h-4 animate-spin" />}
              {mode === 'login' ? 'Masuk' : 'Daftar Sekarang'}
            </button>
          </form>

          <p className="text-center text-[11px] text-slate-500 dark:text-slate-400 pt-2">
            {mode === 'login' 
              ? 'Belum punya akun? Klik "Daftar" di atas'
              : 'Sudah punya akun? Klik "Masuk" di atas'
            }
          </p>
        </div>

        <p className="text-center text-white/60 text-[11px] mt-6">
          Data Anda aman & terenkripsi di cloud ☁️
        </p>
      </div>
    </div>
  );
};