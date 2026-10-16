import React, { useState } from 'react';
import { User, Camera, LogOut, X, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ProfileModal({ isOpen, onClose }) {
  const { user, token, serverUrl, updateUser, logout } = useAuth();
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar ? `${serverUrl}${user.avatar}` : null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  if (!isOpen || !user) return null;

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('display_name', displayName);
      formData.append('bio', bio);
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }

      const res = await fetch(`${serverUrl}/api/auth/profile`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      updateUser(data);
      setMessage('پروفایل با موفقیت بروزرسانی شد.');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(`خطا: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 dir-rtl text-right">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 border border-gray-100 dark:border-slate-700">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-700">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <User className="w-5 h-5 text-telegram-blue" />
            تنظیمات پروفایل کاربری
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {message && (
          <div className="mt-3 p-2.5 text-xs bg-telegram-blue/10 text-telegram-blue rounded-xl font-medium">
            {message}
          </div>
        )}

        <form onSubmit={handleSave} className="py-4 space-y-4">
          <div className="flex flex-col items-center">
            <div className="relative group cursor-pointer">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-telegram-blue/20 flex items-center justify-center text-telegram-blue text-2xl font-bold border-2 border-telegram-blue">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
                ) : (
                  user.display_name.charAt(0)
                )}
              </div>
              <label className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer text-white text-xs gap-1 font-medium">
                <Camera className="w-5 h-5" />
                <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              </label>
            </div>
            <span className="text-[11px] text-gray-400 mt-1">تغییر تصویر پروفایل</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
              نام کاربری (غیرقابل تغییر)
            </label>
            <input
              type="text"
              disabled
              value={`@${user.username}`}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 text-gray-500 text-xs dir-ltr cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
              نام نمایشی
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-800 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-telegram-blue"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
              بیوگرافی (Bio)
            </label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="درباره خود بنویسید..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-800 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-telegram-blue resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={logout}
              className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              خروج از حساب
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-telegram-blue hover:bg-telegram-darkBlue text-white text-xs font-semibold rounded-xl shadow transition flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              {loading ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
