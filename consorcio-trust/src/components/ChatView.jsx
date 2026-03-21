import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, Send, Loader2, ShieldCheck } from 'lucide-react';
import {
  fetchOrCreateConversation,
  fetchMessages,
  sendMessage,
  markMessagesRead,
} from '../services/data.service';
import { supabase } from '../lib/supabase';
import { useData } from '../context/DataContext';
import { useToast } from './Toast';

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
}

export default function ChatView({ session, userProfile }) {
  const toast = useToast();
  const { setUnreadChatCount } = useData();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const channelRef = useRef(null);

  const userId = session?.user?.id;
  const isAdmin = userProfile?.role === 'admin';

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (!userId) return;

    async function init() {
      try {
        const conv = await fetchOrCreateConversation(userId, userProfile?.consortium_id);
        setConversation(conv);
        const msgs = await fetchMessages(conv.id);
        setMessages(msgs);
        await markMessagesRead(conv.id, userId);
        setUnreadChatCount(0);
      } catch (e) {
        toast.error(e.message, 'Error al cargar mensajes');
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [userId, userProfile?.consortium_id, toast, setUnreadChatCount]);

  // Realtime
  useEffect(() => {
    if (!conversation?.id) return;

    const channel = supabase
      .channel(`chat-${conversation.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversation.id}` },
        async (payload) => {
          setMessages(prev => {
            if (prev.some(m => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
          // Mark as read immediately if it's not from us
          if (payload.new.sender_id !== userId) {
            await markMessagesRead(conversation.id, userId);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [conversation?.id, userId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  async function handleSend(e) {
    e.preventDefault();
    if (!text.trim() || !conversation?.id) return;

    const content = text.trim();
    setText('');
    setSending(true);
    try {
      const msg = await sendMessage({ conversationId: conversation.id, senderId: userId, content });
      if (msg) {
        setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
      }
    } catch (err) {
      toast.error(err.message, 'Error al enviar');
      setText(content);
    } finally {
      setSending(false);
    }
  }

  // Agrupar mensajes por fecha
  function groupByDate(msgs) {
    const groups = [];
    let lastDate = null;
    msgs.forEach(msg => {
      const date = msg.created_at?.slice(0, 10);
      if (date !== lastDate) {
        groups.push({ type: 'date', date });
        lastDate = date;
      }
      groups.push({ type: 'msg', msg });
    });
    return groups;
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={32} className="animate-spin text-blue-500" />
      </div>
    );
  }

  const grouped = groupByDate(messages);

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] animate-fade-in">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-4 mb-4 flex items-center gap-3 shrink-0">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
          <ShieldCheck size={18} className="text-white" />
        </div>
        <div>
          <p className="font-semibold text-slate-800 dark:text-slate-100">Administración</p>
          <p className="text-xs text-emerald-500 font-medium">ConsorcioTrust</p>
        </div>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto space-y-1 px-1 pb-2">
        {grouped.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <MessageSquare size={40} className="text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">No hay mensajes aún</p>
            <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
              Enviá un mensaje para iniciar la conversación con la administración
            </p>
          </div>
        )}

        {grouped.map((item, idx) => {
          if (item.type === 'date') {
            return (
              <div key={`date-${item.date}`} className="flex items-center gap-3 py-3">
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {formatDate(item.date)}
                </span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
              </div>
            );
          }

          const { msg } = item;
          const isMine = msg.sender_id === userId;
          const isAdminMsg = !isMine;

          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-1`}>
              {isAdminMsg && (
                <div className="w-7 h-7 bg-gradient-to-br from-slate-600 to-slate-700 rounded-full flex items-center justify-center mr-2 shrink-0 self-end mb-1">
                  <ShieldCheck size={13} className="text-white" />
                </div>
              )}
              <div className={`max-w-[75%] group`}>
                <div
                  className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isMine
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-700 rounded-bl-sm shadow-sm'
                  }`}
                >
                  {msg.content}
                </div>
                <p className={`text-[10px] mt-0.5 text-slate-400 dark:text-slate-500 ${isMine ? 'text-right' : 'text-left'}`}>
                  {formatTime(msg.created_at)}
                  {isMine && msg.read_at && (
                    <span className="ml-1 text-blue-400">✓✓</span>
                  )}
                </p>
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="shrink-0 mt-3 flex gap-2 items-end">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Escribí tu mensaje..."
          className="flex-1 border border-slate-200 dark:border-slate-600 rounded-2xl px-4 py-3 text-sm bg-white dark:bg-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
          maxLength={1000}
          disabled={sending}
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="w-11 h-11 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl flex items-center justify-center shrink-0 transition-colors"
        >
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </form>
    </div>
  );
}
