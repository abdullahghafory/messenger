import React, { useState, useRef } from 'react';
import { Send, Paperclip, Mic, Smile, X, Volume2, Square } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function MessageInput({ onSendMessage, replyToMessage, onCancelReply, chatType, userRole }) {
  const { token, serverUrl } = useAuth();
  const [content, setContent] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);

  const EMOJIS = ['👍', '❤️', '😂', '🔥', '👏', '🎉', '🙏', '😊', '😍', '🚀', '💯', '👌'];

  if (chatType === 'channel' && userRole !== 'owner' && userRole !== 'admin') {
    return (
      <div className="p-3 bg-slate-100 dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 text-center text-xs text-gray-500">
        فقط مدیران کانال می‌توانند پست جدید ارسال کنند.
      </div>
    );
  }

  const handleSendText = (e) => {
    e?.preventDefault();
    if (!content.trim()) return;

    onSendMessage({
      content: content.trim(),
      media_url: '',
      media_type: '',
      reply_to_id: replyToMessage?.id
    });

    setContent('');
    if (replyToMessage) onCancelReply();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${serverUrl}/api/upload/attachment`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      onSendMessage({
        content: '',
        media_url: data.url,
        media_type: data.media_type,
        reply_to_id: replyToMessage?.id
      });

      if (replyToMessage) onCancelReply();
    } catch (err) {
      alert(`خطا در آپلود فایل: ${err.message}`);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const voiceFile = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });

        const formData = new FormData();
        formData.append('file', voiceFile);

        try {
          const res = await fetch(`${serverUrl}/api/upload/attachment`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData
          });

          const data = await res.json();
          if (res.ok) {
            onSendMessage({
              content: '',
              media_url: data.url,
              media_type: 'voice',
              reply_to_id: replyToMessage?.id
            });
            if (replyToMessage) onCancelReply();
          }
        } catch (err) {
          console.error(err);
        }

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      alert('دسترسی به میکروفون یافت نشد.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700/60 p-3 relative dir-rtl">
      {replyToMessage && (
        <div className="mb-2 p-2 bg-telegram-blue/10 rounded-xl flex items-center justify-between text-xs border-r-4 border-telegram-blue">
          <div className="flex flex-col">
            <span className="font-bold text-telegram-blue">پاسخ به {replyToMessage.sender_name}</span>
            <span className="text-gray-600 dark:text-gray-300 truncate max-w-xs">{replyToMessage.content || '[رسانه]'}</span>
          </div>
          <button onClick={onCancelReply} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {showEmojiPicker && (
        <div className="absolute bottom-16 right-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-2 rounded-2xl shadow-xl flex gap-1 z-20">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                setContent((prev) => prev + emoji);
                setShowEmojiPicker(false);
              }}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-lg transition"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
      />

      {isRecording ? (
        <div className="flex items-center justify-between bg-red-500/10 p-2.5 rounded-2xl border border-red-500/30">
          <div className="flex items-center gap-2 text-red-500 text-xs font-bold animate-pulse">
            <Volume2 className="w-4 h-4" />
            <span>در حال ضبط صدا... ({recordingTime}s)</span>
          </div>
          <button
            onClick={stopRecording}
            className="p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition flex items-center gap-1 text-xs"
          >
            <Square className="w-4 h-4 fill-white" />
            <span>ارسال ویس</span>
          </button>
        </div>
      ) : (
        <form onSubmit={handleSendText} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 text-gray-400 hover:text-telegram-blue hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-xl transition"
            title="پیوست تصویر/فایل"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2.5 text-gray-400 hover:text-telegram-blue hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-xl transition"
            title="ایموجی"
          >
            <Smile className="w-5 h-5" />
          </button>

          <input
            type="text"
            placeholder="پیام خود را بنویسید..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-900 border border-transparent focus:border-telegram-blue text-xs text-gray-800 dark:text-white rounded-xl focus:outline-none transition"
          />

          {content.trim() ? (
            <button
              type="submit"
              className="p-2.5 bg-telegram-blue hover:bg-telegram-darkBlue text-white rounded-xl shadow-md shadow-telegram-blue/20 transition"
              title="ارسال پیام"
            >
              <Send className="w-5 h-5 transform -rotate-90 translate-x-0.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              className="p-2.5 bg-telegram-blue/10 hover:bg-telegram-blue/20 text-telegram-blue rounded-xl transition"
              title="ضبط پیام صوتی (Voice)"
            >
              <Mic className="w-5 h-5" />
            </button>
          )}
        </form>
      )}
    </div>
  );
}
