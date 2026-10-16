import React, { useState } from 'react';
import { Send, UserPlus, LogIn, Server } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal({ onOpenNetworkModal }) {
  const { login, serverUrl } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    const body = isRegister
      ? { username, display_name: displayName, password }
      : { username, password };

    try {
      const res = await fetch(`${serverUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'خطایی رخ داده است.');
      }

      login(data.user, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 border border-gray-100 dark:border-slate-700 transition-all dir-rtl text-right">
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-16 h-16 bg-telegram-blue text-white rounded-full flex items-center justify-center shadow-lg shadow-telegram-blue/30 mb-3">
            <Send className="w-8 h-8 transform -rotate-12 translate-x-0.5" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
            نت‌گرام (NetGram)
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            پیام‌رسان هوشمند شبکه محلی (LAN)
          </p>
        </div>

        <button
          onClick={onOpenNetworkModal}
          type="button"
          className="w-full mb-5 py-2 px-3 bg-slate-100 dark:bg-slate-700/60 rounded-xl flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
        >
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-telegram-blue" />
            <span>آدرس سرور شبکه: <strong className="dir-ltr inline-block">{serverUrl}</strong></span>
          </div>
          <span className="text-telegram-blue font-medium underline">تغییر</span>
        </button>

        {error && (
          <div className="mb-4 p-3 text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                نام و نام خانوادگی / نام نمایشی
              </label>
              <input
                type="text"
                required
                placeholder="مثلا: علی رضایی"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-telegram-blue text-sm"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
              نام کاربری (Username)
            </label>
            <input
              type="text"
              required
              placeholder="مثلا: alireza"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-telegram-blue text-sm dir-ltr"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
              رمز عبور
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-telegram-blue text-sm dir-ltr"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-telegram-blue hover:bg-telegram-darkBlue text-white font-medium rounded-xl shadow-lg shadow-telegram-blue/25 transition duration-200 flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <span>در حال پردازش...</span>
            ) : isRegister ? (
              <>
                <UserPlus className="w-5 h-5" />
                <span>ثبت نام و ورود</span>
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                <span>ورود به مسنجر</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
          {isRegister ? (
            <p>
              قبلاً ثبت‌نام کرده‌اید؟{' '}
              <button
                onClick={() => { setIsRegister(false); setError(''); }}
                className="text-telegram-blue font-semibold hover:underline"
              >
                وارد شوید
              </button>
            </p>
          ) : (
            <p>
              حساب کاربری ندارید؟{' '}
              <button
                onClick={() => { setIsRegister(true); setError(''); }}
                className="text-telegram-blue font-semibold hover:underline"
              >
                ثبت نام در شبکه محلی
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
