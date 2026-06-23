import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  isDark?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('❌ Runtime Error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      const isDark = this.props.isDark;
      return (
        <div className={`min-h-screen flex items-center justify-center p-4 ${
          isDark ? 'bg-slate-900' : 'bg-slate-50'
        }`}>
          <div className={`max-w-md w-full rounded-2xl p-6 shadow-xl ${
            isDark ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'
          }`}>
            <div className="text-center">
              <div className="text-5xl mb-4">⚠️</div>
              <h2 className="text-xl font-bold mb-2">Terjadi Kesalahan</h2>
              <p className={`text-sm mb-4 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                Aplikasi mengalami error. Silakan muat ulang halaman.
              </p>
              <details className="text-left mb-4">
                <summary className="cursor-pointer text-xs text-red-500 font-semibold">
                  Detail Error
                </summary>
                <pre className={`mt-2 p-3 rounded text-xs overflow-auto max-h-40 ${
                  isDark ? 'bg-slate-900 text-red-300' : 'bg-red-50 text-red-700'
                }`}>
                  {this.state.error?.toString()}
                </pre>
              </details>
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-blue-500 text-white py-3 rounded-xl font-semibold active:scale-95"
              >
                🔄 Muat Ulang Aplikasi
              </button>
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className={`w-full mt-2 py-3 rounded-xl font-semibold active:scale-95 ${
                  isDark ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                🗑️ Reset & Muat Ulang
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}