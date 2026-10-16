import React, { useState, useEffect, useRef } from 'react';
import { Pin, Trash2, Reply, Smile, CheckCheck, FileText, Download, Users, Megaphone, Server, Volume2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import MessageInput from './MessageInput';

export default function ChatArea({ chat, messages, onSendMessage, onSelectReply, onTogglePin, onDeleteMessage, onToggleReaction }) {
  const { user, serverUrl } = useAuth();
  const { socket } = useSocket();
  const messagesEndRef = useRef(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [activeReactionMsgId, setActiveReactionMsgId] = useState(null);

  const EMOJI_REACTIONS = ['👍', '❤️', '😂', '🔥', '👏', '😮'];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!socket || !chat) return;

    const handleUserTyping = ({ chat_id, user_id, display_name, is_typing }) => {
      if (chat_id === chat.id && user_id !== user.id) {
        setTypingUsers((prev) => {
          if (is_typing && !prev.includes(display_name)) {
            return [...prev, display_name];
          } else if (!is_typing) {
            return prev.filter((name) => name !== display_name);
          }
          return prev;
        });
      }
    };

    socket.on('user_typing', handleUserTyping);
    return () => {
      socket.off('user_typing', handleUserTyping);
    };
  }, [socket, chat, user]);

  if (!chat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 text-gray-400 p-6 select-none dir-rtl">
        <div className="w-20 h-20 rounded-full bg-telegram-blue/10 flex items-center justify-center text-telegram-blue mb-4">
          <Server className="w-10 h-10" />
        </div>
        <h3 className="text-lg font-bold text-gray-700 dark:text-gray-200">
          پیام‌رسان شبکه محلی نت‌گرام
        </h3>
        <p className="text-xs text-gray-400 mt-1 max-w-sm text-center">
          جهت آغاز گفتگو، یک گفتگو را از لیست سمت راست انتخاب کنید یا گفتگو جدید ایجاد نمایید.
        </p>
      </div>
    );
  }

  let chatTitle = chat.title;
  let chatSubtitle = '';
  let chatAvatar = chat.avatar;

  if (chat.type === 'direct') {
    const partner = chat.members?.find((m) => m.id !== user?.id) || {};
    chatTitle = partner.display_name || 'کاربر شبکه';
    chatAvatar = partner.avatar;
    chatSubtitle = partner.is_online ? 'آنلاین' : 'آخرین بازدید به زودی';
  } else if (chat.type === 'group') {
    chatSubtitle = `${chat.members?.length || 0} عضو`;
  } else if (chat.type === 'channel') {
    chatSubtitle = `کانال عمومی • ${chat.members?.length || 0} مشترک`;
  }

  const pinnedMessage = messages.find((m) => m.is_pinned);
  const currentUserRole = chat.members?.find((m) => m.id === user?.id)?.role || 'member';

  return (
    <div className="flex-1 flex flex-col h-full bg-[#e6ebeef0] dark:bg-slate-950 relative overflow-hidden dir-rtl">
      <div className="p-3 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700/60 flex items-center justify-between z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-telegram-blue/15 text-telegram-blue font-bold flex items-center justify-center text-sm shrink-0">
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

          <div className="flex flex-col">
            <span className="text-xs font-bold text-gray-800 dark:text-white">
              {chatTitle}
            </span>
            <span className={`text-[11px] ${typingUsers.length > 0 ? 'text-telegram-blue font-semibold' : 'text-gray-400'}`}>
              {typingUsers.length > 0 ? `در حال نوشتن... (${typingUsers.join(', ')})` : chatSubtitle}
            </span>
          </div>
        </div>
      </div>

      {pinnedMessage && (
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm p-2 px-4 border-b border-gray-200 dark:border-slate-700/60 flex items-center justify-between text-xs z-10">
          <div className="flex items-center gap-2 overflow-hidden">
            <Pin className="w-4 h-4 text-telegram-blue shrink-0" />
            <div className="flex flex-col truncate">
              <span className="font-bold text-telegram-blue text-[11px]">پیام سنجاق شده</span>
              <span className="text-gray-600 dark:text-gray-300 truncate">{pinnedMessage.content || '[فایل رسانه]'}</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => {
          const isSelf = msg.sender_id === user?.id;

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isSelf ? 'items-start' : 'items-end'} group relative`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-3 shadow-sm text-xs relative transition-all ${
                  isSelf
                    ? 'bg-telegram-blue text-white rounded-br-none'
                    : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100 rounded-bl-none border border-gray-100 dark:border-slate-700/50'
                }`}
              >
                {!isSelf && chat.type !== 'direct' && (
                  <div className="text-[11px] font-bold text-telegram-blue mb-1">
                    {msg.sender_name}
                  </div>
                )}

                {msg.reply_to_id && (
                  <div className={`p-2 rounded-lg mb-2 text-[11px] border-r-2 ${
                    isSelf
                      ? 'bg-white/15 border-white text-white'
                      : 'bg-slate-100 dark:bg-slate-700/50 border-telegram-blue text-gray-600 dark:text-gray-300'
                  }`}>
                    <span className="font-bold block">{msg.reply_sender_name}</span>
                    <span className="truncate block opacity-90">{msg.reply_content || '[رسانه]'}</span>
                  </div>
                )}

                {msg.media_url && (
                  <div className="mb-2 rounded-xl overflow-hidden">
                    {msg.media_type === 'image' && (
                      <img src={`${serverUrl}${msg.media_url}`} alt="" className="max-h-64 rounded-xl object-cover" />
                    )}

                    {msg.media_type === 'video' && (
                      <video src={`${serverUrl}${msg.media_url}`} controls className="max-h-64 rounded-xl" />
                    )}

                    {(msg.media_type === 'voice' || msg.media_type === 'audio') && (
                      <div className="p-2 rounded-xl bg-black/10 flex items-center gap-2">
                        <Volume2 className="w-5 h-5 shrink-0" />
                        <audio src={`${serverUrl}${msg.media_url}`} controls className="w-full h-8" />
                      </div>
                    )}

                    {msg.media_type === 'document' && (
                      <a
                        href={`${serverUrl}${msg.media_url}`}
                        download
                        className="p-2.5 rounded-xl bg-black/10 hover:bg-black/20 flex items-center gap-2 transition"
                      >
                        <FileText className="w-5 h-5" />
                        <span className="truncate flex-1">دانلود فایل</span>
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                )}

                {msg.content && <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>}

                {msg.reactions && msg.reactions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {msg.reactions.map((r, idx) => (
                      <span
                        key={idx}
                        className="px-1.5 py-0.5 rounded-full bg-black/10 dark:bg-white/10 text-[10px] flex items-center gap-1"
                      >
                        <span>{r.emoji}</span>
                        <span className="font-bold">{r.display_name}</span>
                      </span>
                    ))}
                  </div>
                )}

                <div className={`flex items-center gap-1 mt-1 justify-end text-[10px] ${
                  isSelf ? 'text-white/80' : 'text-gray-400'
                }`}>
                  {msg.is_pinned ? <Pin className="w-3 h-3 text-amber-400 fill-amber-400" /> : null}
                  <span>{new Date(msg.created_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</span>
                  {isSelf && <CheckCheck className="w-3.5 h-3.5 text-white" />}
                </div>

                <div className={`absolute top-1 ${isSelf ? '-left-16' : '-right-16'} hidden group-hover:flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl shadow border border-gray-200 dark:border-slate-700 text-gray-500`}>
                  <button
                    onClick={() => onSelectReply(msg)}
                    title="پاسخ"
                    className="p-1 hover:text-telegram-blue hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                  >
                    <Reply className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setActiveReactionMsgId(activeReactionMsgId === msg.id ? null : msg.id)}
                    title="واکنش"
                    className="p-1 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                  >
                    <Smile className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onTogglePin(msg.id)}
                    title="سنجاق"
                    className="p-1 hover:text-telegram-blue hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                  >
                    <Pin className="w-3.5 h-3.5" />
                  </button>

                  {isSelf && (
                    <button
                      onClick={() => onDeleteMessage(msg.id)}
                      title="حذف"
                      className="p-1 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {activeReactionMsgId === msg.id && (
                  <div className="absolute -top-10 right-0 bg-white dark:bg-slate-800 p-1.5 rounded-full shadow-lg border border-gray-200 dark:border-slate-700 flex gap-1.5 z-20">
                    {EMOJI_REACTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => {
                          onToggleReaction(msg.id, emoji);
                          setActiveReactionMsgId(null);
                        }}
                        className="hover:scale-125 transition text-sm"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <MessageInput
        onSendMessage={onSendMessage}
        chatType={chat.type}
        userRole={currentUserRole}
      />
    </div>
  );
}
