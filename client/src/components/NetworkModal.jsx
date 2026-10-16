import React, { useState, useEffect } from 'react';
import { Server, Wifi, Copy, Check, X, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function NetworkModal({ isOpen, onClose }) {
  const { serverUrl, setServerUrl } = useAuth();
  const [networkData, setNetworkData] = useState(null);
  const [customServer, setCustomServer] = useState(serverUrl);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchInterfaces = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${serverUrl}/api/network/interfaces`);
      if (res.ok) {
        const data = await res.json();
        setNetworkData(data);
      }
    } catch (err) {
      console.error('Failed to fetch network interfaces:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchInterfaces();
      setCustomServer(serverUrl);
    }
  }, [isOpen, serverUrl]);

  if (!isOpen) return null;

  const handleCopy = (ip, index) => {
    const fullUrl = `http://${ip}:${networkData?.port || 3000}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleApplyServer = (e) => {
    e.preventDefault();
    if (customServer.trim()) {
      let formatted = customServer.trim();
      if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
        formatted = `http://${formatted}`;
      }
      setServerUrl(formatted);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 dir-rtl text-right">
      <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 border border-gray-100 dark:border-slate-700">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Server className="w-6 h-6 text-telegram-blue" />
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">
              تنظیمات و آدرس‌های شبکه محلی (LAN)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                <Wifi className="w-4 h-4 text-emerald-500" />
                آدرس‌های IP سیستم شما در شبکه محلی:
              </span>
              <button
                onClick={fetchInterfaces}
                className="text-xs text-telegram-blue hover:underline flex items-center gap-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                بروزرسانی
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              کاربران دیگر در شبکه Wi-Fi یا LAN می‌توانند با ورود این آدرس در برنامه، به سرور مسنجر شما متصل شوند:
            </p>

            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {networkData?.addresses && networkData.addresses.length > 0 ? (
                networkData.addresses.map((item, idx) => {
                  const fullAddr = `http://${item.address}:${networkData.port}`;
                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs"
                    >
                      <div className="flex flex-col">
                        <span className="font-mono text-sm text-gray-800 dark:text-gray-200 dir-ltr font-bold">
                          {fullAddr}
                        </span>
                        <span className="text-gray-400 text-[11px]">
                          کارت شبکه: {item.interface}
                        </span>
                      </div>
                      <button
                        onClick={() => handleCopy(item.address, idx)}
                        className="px-3 py-1.5 bg-telegram-blue/10 hover:bg-telegram-blue/20 text-telegram-blue font-medium rounded-lg transition flex items-center gap-1 text-xs"
                      >
                        {copiedIndex === idx ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>کپی شد</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>کپی لینک</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="p-3 text-xs text-center text-gray-500 bg-slate-50 dark:bg-slate-900 rounded-xl">
                  آدرس IPv4 فعالی یافت نشد (یا سرور محلی localhost است)
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 dark:border-slate-700">
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
              پیوستن به سرور مسنجر دیگر در شبکه (IP سرور میزبان):
            </label>
            <form onSubmit={handleApplyServer} className="flex gap-2">
              <input
                type="text"
                placeholder="http://192.168.1.50:3000"
                value={customServer}
                onChange={(e) => setCustomServer(e.target.value)}
                className="flex-1 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-800 dark:text-white text-xs dir-ltr focus:outline-none focus:ring-2 focus:ring-telegram-blue"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-telegram-blue hover:bg-telegram-darkBlue text-white text-xs font-medium rounded-xl shadow transition"
              >
                اتصال و ذخیره
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
