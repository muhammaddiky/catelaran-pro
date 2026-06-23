import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onFinish?: () => void;
  isDark?: boolean;
  duration?: number; // Durasi dalam ms, default 2200
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ 
  onFinish, 
  isDark = false,
  duration = 2200 
}) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (onFinish) {
      // Mode dengan animasi keluar (untuk onboarding pertama kali)
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(onFinish, 500);
      }, duration);

      return () => clearTimeout(timer);
    }
    // Jika tidak ada onFinish, splash screen akan tetap tampil sampai parent component menggantinya
  }, [onFinish, duration]);

  return (
    <div 
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center transition-all duration-500 ease-in-out ${
        isExiting ? 'opacity-0 scale-110' : 'opacity-100 scale-100'
      } ${isDark ? 'bg-slate-900' : 'bg-white'}`}
    >
      {/* Background Glow / Aura */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full blur-3xl animate-pulse ${isDark ? 'bg-blue-600/20' : 'bg-blue-400/20'}`}></div>
        <div className={`absolute bottom-1/3 left-1/4 w-64 h-64 rounded-full blur-3xl animate-pulse ${isDark ? 'bg-purple-600/15' : 'bg-purple-400/15'}`} style={{animationDelay: '1s'}}></div>
      </div>

      {/* Main Content */}
      <div className="relative flex flex-col items-center">
        {/* Logo with Bounce & Shimmer */}
        <div className="relative mb-8 animate-[bounceIn_1s_cubic-bezier(0.28,0.84,0.42,1)_forwards]">
          <div className="w-28 h-28 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-blue-500/40">
            <span className="text-6xl drop-shadow-lg">💰</span>
          </div>
          {/* Shimmer Effect Overlay */}
          <div className="absolute inset-0 rounded-[2rem] overflow-hidden">
            <div className="w-full h-full bg-gradient-to-tr from-transparent via-white/40 to-transparent animate-[shimmer_2.5s_infinite]"></div>
          </div>
        </div>

        {/* App Name */}
        <h1 className={`text-3xl font-extrabold tracking-tight mb-2 animate-[slideUp_0.8s_ease-out_0.3s_forwards] opacity-0 ${isDark ? 'text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500' : 'text-slate-900'}`}>
          Catelaran<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500">Pro</span>
        </h1>
        
        {/* Tagline */}
        <p className={`text-sm font-medium animate-[slideUp_0.8s_ease-out_0.5s_forwards] opacity-0 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Kelola Finansialmu dengan Elegan
        </p>
      </div>

      {/* Bottom Loading Indicator */}
      <div className="absolute bottom-16 flex flex-col items-center animate-[fadeIn_1s_ease-out_1s_forwards] opacity-0">
        <div className="flex gap-1.5 mb-3">
          <div className={`w-2 h-2 rounded-full animate-bounce ${isDark ? 'bg-blue-400' : 'bg-blue-500'}`} style={{ animationDelay: '0ms' }}></div>
          <div className={`w-2 h-2 rounded-full animate-bounce ${isDark ? 'bg-blue-400' : 'bg-blue-500'}`} style={{ animationDelay: '150ms' }}></div>
          <div className={`w-2 h-2 rounded-full animate-bounce ${isDark ? 'bg-blue-400' : 'bg-blue-500'}`} style={{ animationDelay: '300ms' }}></div>
        </div>
        <p className={`text-xs font-medium tracking-wide ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Menyiapkan pengalaman terbaik...</p>
      </div>

      {/* Custom Keyframes injected via style tag */}
      <style>{`
        @keyframes bounceIn {
          0% { transform: scale(0.3) rotate(-10deg); opacity: 0; }
          50% { transform: scale(1.05) rotate(2deg); opacity: 1; }
          70% { transform: scale(0.95) rotate(-1deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes slideUp {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%) skewX(-20deg); }
          100% { transform: translateX(200%) skewX(-20deg); }
        }
      `}</style>
    </div>
  );
};