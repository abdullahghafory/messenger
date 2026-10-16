import React, { useState } from 'react';
import { User, Users, Megaphone, Search, X, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function NewChatModal({ isOpen, onClose, onSelectChat }) {
  const { token, serverUrl } = useAuth();
  const [tab, setTab] = useState('direct');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const res = await fetch(`${serverUrl}/api/auth/search?query=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateDirectChat = async (targetUserId) => {
    try {
      setLoading(true);
      const res = await fetch(`${serverUrl}/api/chats/direct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ target_user_id: targetUserId })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      onSelectChat(data.chat_id);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroupOrChannel = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setLoading(true);
      const res = await fetch(`${serverUrl}/api/chats/group`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          type: tab,
          title: title.trim(),
          description: description.trim(),
          member_ids: selectedUserIds
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      onSelectChat(data.chat_id);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectUser = (id) => {
    if (selectedUserIds.includes(id)) {
      setSelectedUserIds(selectedUserIds.filter(uId => uId !== id));
    } else {
      setSelectedUserIds([...selectedUserIds, id]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 dir-rtl text-right">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 border border-gray-100 dark:border-slate-700">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-700">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">
            گفتگوی جدید
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl my-4">
          <button
            onClick={() => { setTab('direct'); setError(''); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
              tab === 'direct'
                ? 'bg-white dark:bg-slate-800 text-telegram-blue shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <User className="w-4 h-4" />
            <span>پیام خصوصی</span>
          </button>

          <button
            onClick={() => { setTab('group'); setError(''); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
              tab === 'group'
                ? 'bg-white dark:bg-slate-800 text-telegram-blue shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>گروه جدید</span>
          </button>

          <button
            onClick={() => { setTab('channel'); setError(''); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
              tab === 'channel'
                ? 'bg-white dark:bg-slate-800 text-telegram-blue shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <Megaphone className="w-4 h-4" />
            <span>کانال جدید</span>
          </button>
        </div>

        {error && (
          <div className="mb-3 p-2.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl">
            {error}
          </div>
        )}

        {tab === 'direct' ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute right-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="جستجوی کاربر بر اساس نام کاربری..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pr-9 pl-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-800 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-telegram-blue"
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1">
              {searchResults.length > 0 ? (
                searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleCreateDirectChat(user.id)}
                    disabled={loading}
                    className="w-full p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-3 transition text-right"
                  >
                    <div className="w-10 h-10 rounded-full bg-telegram-blue/20 text-telegram-blue font-bold flex items-center justify-center text-sm">
                      {user.avatar ? (
                        <img src={`${serverUrl}${user.avatar}`} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        user.display_name.charAt(0)
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-800 dark:text-white">
                        {user.display_name}
                      </div>
                      <div className="text-[11px] text-gray-400 dir-ltr text-right">
                        @{user.username}
                      </div>
                    </div>
                  </button>
                ))
              ) : searchQuery ? (
                <div className="p-4 text-center text-xs text-gray-400">
                  کاربری یافت نشد.
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-gray-400">
                  نام کاربری فرد مورد نظر را جستجو کنید.
                </div>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateGroupOrChannel} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                نام {tab === 'group' ? 'گروه' : 'کانال'}
              </label>
              <input
                type="text"
                required
                placeholder={tab === 'group' ? 'مثلا: تیم برنامه نویسی' : 'مثلا: اخبار شبکه محلی'}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-800 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-telegram-blue"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                توضیحات (اختیاری)
              </label>
              <textarea
                rows={2}
                placeholder="توضیحات کوتاه..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-800 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-telegram-blue resize-none"
              />
            </div>

            {tab === 'group' && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                  افزودن اعضا (جستجو)
                </label>
                <input
                  type="text"
                  placeholder="جستجوی اعضا..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-800 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-telegram-blue mb-2"
                />

                <div className="max-h-36 overflow-y-auto space-y-1">
                  {searchResults.map((user) => {
                    const isSelected = selectedUserIds.includes(user.id);
                    return (
                      <div
                        key={user.id}
                        onClick={() => toggleSelectUser(user.id)}
                        className={`p-2 rounded-xl border cursor-pointer flex items-center justify-between text-xs transition ${
                          isSelected
                            ? 'border-telegram-blue bg-telegram-blue/10'
                            : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        <span className="font-medium text-gray-800 dark:text-white">{user.display_name} (@{user.username})</span>
                        {isSelected && <Check className="w-4 h-4 text-telegram-blue" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-telegram-blue hover:bg-telegram-darkBlue text-white text-xs font-medium rounded-xl shadow transition"
            >
              {loading ? 'در حال ایجاد...' : `ایجاد ${tab === 'group' ? 'گروه' : 'کانال'}`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
