import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useSocket } from './context/SocketContext';
import AuthModal from './components/AuthModal';
import NetworkModal from './components/NetworkModal';
import NewChatModal from './components/NewChatModal';
import ProfileModal from './components/ProfileModal';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';

export default function App() {
  const { user, token, serverUrl } = useAuth();
  const { socket } = useSocket();

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('netgram_theme') || 'dark';
  });

  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [isNetworkModalOpen, setIsNetworkModalOpen] = useState(false);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('netgram_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const fetchChats = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${serverUrl}/api/chats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setChats(data);
        if (!activeChatId && data.length > 0) {
          setActiveChatId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Fetch chats error:', err);
    }
  };

  useEffect(() => {
    fetchChats();
  }, [token, serverUrl]);

  const fetchMessages = async (chatId) => {
    if (!token || !chatId) return;
    try {
      const res = await fetch(`${serverUrl}/api/chats/${chatId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error('Fetch messages error:', err);
    }
  };

  useEffect(() => {
    if (activeChatId) {
      fetchMessages(activeChatId);
    }
  }, [activeChatId, token, serverUrl]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg) => {
      if (msg.chat_id === activeChatId) {
        setMessages((prev) => [...prev, msg]);
      }
      fetchChats();
    };

    const handlePinUpdated = ({ message_id, is_pinned }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === message_id ? { ...m, is_pinned } : m))
      );
    };

    const handleReactionsUpdated = ({ message_id, reactions }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === message_id ? { ...m, reactions } : m))
      );
    };

    const handleMessageDeleted = ({ message_id }) => {
      setMessages((prev) => prev.filter((m) => m.id !== message_id));
    };

    const handleUserStatusChanged = () => {
      fetchChats();
    };

    socket.on('new_message', handleNewMessage);
    socket.on('message_pin_updated', handlePinUpdated);
    socket.on('message_reactions_updated', handleReactionsUpdated);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('user_status_changed', handleUserStatusChanged);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('message_pin_updated', handlePinUpdated);
      socket.off('message_reactions_updated', handleReactionsUpdated);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('user_status_changed', handleUserStatusChanged);
    };
  }, [socket, activeChatId]);

  const handleSendMessage = (msgData) => {
    if (!socket || !activeChatId) return;

    socket.emit('send_message', {
      chat_id: activeChatId,
      ...msgData
    });

    setReplyToMessage(null);
  };

  const handleTogglePin = (messageId) => {
    if (!socket || !activeChatId) return;
    socket.emit('toggle_pin_message', { message_id: messageId, chat_id: activeChatId });
  };

  const handleDeleteMessage = (messageId) => {
    if (!socket || !activeChatId) return;
    socket.emit('delete_message', { message_id: messageId, chat_id: activeChatId });
  };

  const handleToggleReaction = (messageId, emoji) => {
    if (!socket || !activeChatId) return;
    socket.emit('toggle_reaction', { message_id: messageId, chat_id: activeChatId, emoji });
  };

  const activeChat = chats.find((c) => c.id === activeChatId);

  if (!user || !token) {
    return (
      <div className="h-screen w-screen overflow-hidden">
        <AuthModal onOpenNetworkModal={() => setIsNetworkModalOpen(true)} />
        <NetworkModal
          isOpen={isNetworkModalOpen}
          onClose={() => setIsNetworkModalOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 dark:bg-slate-900 font-sans">
      <Sidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={(id) => {
          setActiveChatId(id);
          if (socket) socket.emit('join_chat', { chat_id: id });
        }}
        onOpenNewChat={() => setIsNewChatModalOpen(true)}
        onOpenNetworkModal={() => setIsNetworkModalOpen(true)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        theme={theme}
        toggleTheme={toggleTheme}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      <ChatArea
        chat={activeChat}
        messages={messages}
        onSendMessage={handleSendMessage}
        onSelectReply={setReplyToMessage}
        onTogglePin={handleTogglePin}
        onDeleteMessage={handleDeleteMessage}
        onToggleReaction={handleToggleReaction}
      />

      <NetworkModal
        isOpen={isNetworkModalOpen}
        onClose={() => setIsNetworkModalOpen(false)}
      />

      <NewChatModal
        isOpen={isNewChatModalOpen}
        onClose={() => setIsNewChatModalOpen(false)}
        onSelectChat={(chatId) => {
          fetchChats();
          setActiveChatId(chatId);
        }}
      />

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </div>
  );
}
