import React from 'react';
import { Search, Plus, Server, Moon, Sun, Users, Megaphone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

export default function Sidebar({
  chats,
  activeChatId,
  onSelectChat,
  onOpenNewChat,
  onOpenNetworkModal,
  onOpenProfile,
  theme,
  toggleTheme,
  searchQuery,
  setSearchQuery
}) {
  const { user, serverUrl } = useAuth();
  const { isConnected } = useSocket();

  const filteredChats = chats.filter(chat => {
    if (!searchQuery.trim()) return true;
    const title = chat.title || chat.members?.find(m => m.id !== user?.id)?.display_name || '';
    return title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="w-full md:w-80 lg:w-96 bg-white dark:bg-slate-800 border-l border-gray-200 dark:border-slate-700/60 flex flex-col h-full select-none">
      <div className="p-3.5 border-b border-gray-200 dark:border-slate-700/60 flex items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-900/40">
        <button
          onClick={onOpenProfile}
          className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition text-right"
        >
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-telegram-blue text-white font-bold flex items-center justify-center text-sm shadow-sm">
              {user?.avatar ? (
                <img src={`${serverUrl}${user.avatar}`} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                user?.display_name?.charAt(0) || 'U'
              )}
            </div>
            <div
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800 ${
                isConnected ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-gray-800 dark:text-white truncate max-w-[110px]">
              {user?.display_name}
            </span>
            <span className="text-[10px] text-gray-400 dir-ltr text-right">
              @{user?.username}
            </span>
          </div>
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={onOpenNetworkModal}
            title="تنظیمات شبکه محلی"
            className="p-2 rounded-xl text-gray-500 hover:text-telegram-blue hover:bg-slate-200/60 dark:text-gray-400 dark:hover:bg-slate-700/60 transition relative"
          >
            <Server className="w-4 h-4" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </button>

          <button
            onClick={toggleTheme}
            title="تغییر پوسته (تاریک/روشن)"
            className="p-2 rounded-xl text-gray-500 hover:text-telegram-blue hover:bg-slate-200/60 dark:text-gray-400 dark:hover:bg-slate-700/60 transition"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            onClick={onOpenNewChat}
            title="ایجاد گفتگوی جدید"
            className="p-2 bg-telegram-blue hover:bg-telegram-darkBlue text-white rounded-xl shadow-md shadow-telegram-blue/20 transition"
          >
            <Plus className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      <div className="p-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute right-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="جستجوی گفتگوی شبکه..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-9 pl-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-transparent focus:border-telegram-blue text-xs text-gray-800 dark:text-white focus:outline-none transition"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 space-y-1">
        {filteredChats.length > 0 ? (
          filteredChats.map((chat) => {
            const isSelected = chat.id === activeChatId;

            let chatTitle = chat.title;
            let chatAvatar = chat.avatar;
            let isPartnerOnline = false;

            if (chat.type === 'direct') {
              const partner = chat.members?.find((m) => m.id !== user?.id) || {};
              chatTitle = partner.display_name || 'کاربر شبکه';
              chatAvatar = partner.avatar;
              isPartnerOnline = partner.is_online;
            }

            return (
              <div
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                className={`p-2.5 rounded-2xl cursor-pointer flex items-center gap-3 transition ${
                  isSelected
                    ? 'bg-telegram-blue text-white shadow-md shadow-telegram-blue/20'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-700/50 text-gray-800 dark:text-gray-200'
                }`}
              >
                <div className="relative shrink-0">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-base shadow-sm ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-telegram-blue/15 text-telegram-blue'
                    }`}
                  >
                    {chatAvatar ? (
                      <img src={`${serverUrl}${chatAvatar}`} alt="" className="w-full h-full rounded-2xl object-cover" />
                    ) : chat.type === 'group' ? (
                      <Users className="w-5 h-5" />
                    ) : chat.type === 'channel' ? (
                      <Megaphone className="w-5 h-5" />
                    ) : (
                      chatTitle.charAt(0)
                    )}
                  </div>

                  {chat.type === 'direct' && (
                    <div
                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${
                        isSelected ? 'border-telegram-blue' : 'border-white dark:border-slate-800'
                      } ${isPartnerOnline ? 'bg-emerald-500' : 'bg-gray-400'}`}
                    />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-gray-800 dark:text-white'}`}>
                      {chatTitle}
                    </span>
                    {chat.last_message_at && (
                      <span className={`text-[10px] shrink-0 ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>
                        {new Date(chat.last_message_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className={`truncate ${isSelected ? 'text-white/90' : 'text-gray-500 dark:text-gray-400'}`}>
                      {chat.last_message || (chat.last_message_media_type ? `[${chat.last_message_media_type}]` : 'هیچ پیامی وجود ندارد')}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center text-xs text-gray-400">
            {searchQuery ? 'گفتگویی یافت نشد.' : 'هیچ گفتگویی وجود ندارد. روی + کلیک کنید.'}
          </div>
        )}
      </div>
    </div>
  );
}
