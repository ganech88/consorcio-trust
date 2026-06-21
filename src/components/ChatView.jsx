import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, Send, Loader2, ShieldCheck, ArrowLeft, User } from 'lucide-react';
import {
  fetchOrCreateConversation,
  fetchAllConversations,
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
  const isAdmin = ['admin', 'super_admin'].includes(userProfile?.role);

  const [conversations, setConversations] = useState([]); // bandeja del admin
  const [conversation, setConversation] = useState(null);  // conversacion activa
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const userId = session?.user?.id;
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Carga inicial: el admin trae la lista; el residente abre su conversacion.
  useEffect(() => {
    if (!userId) return;
    let cancel = false;
    async function init() {
      try {
        if (isAdmin) {
          const convs = await fetchAllConversations();
          if (!cancel) setConversations(convs);
        } else {
          const conv = await fetchOrCreateConversation(userId, userProfile?.consortium_id);
          if (!cancel) setConversation(conv);
        }
      } catch (e) {
        if (!cancel) toast.error(e.message, 'Error al cargar mensajes');
      } finally {
        if (!cancel) setLoading(false);
      }
    }
    init();
    return () => { cancel = true; };
  }, [userId, userProfile?.consortium_id, isAdmin, toast]);

  // Mensajes de la conversacion activa
  useEffect(() => {
    if (!conversation?.id) return;
    let cancel = false;
    (async () => {
      try {
        const msgs = await fetchMessages(conversation.id);
        if (cancel) return;
        setMessages(msgs);
        await markMessagesRead(conversation.id, userId);
        if (!isAdmin) setUnreadChatCount(0);
      } catch (e) {
        if (!cancel) toast.error(e.message, 'Error al cargar mensajes');
      }
    })();
    return () => { cancel = true; };
  }, [conversation?.id, userId, isAdmin, setUnreadChatCount, toast]);

  // Realtime sobre la conversacion activa
  useEffect(() => {
    if (!conversation?.id) return;
    const channel = supabase
      .channel(`chat-${conversation.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversation.id}` },
        async (payload) => {
          setMessages(prev => prev.some(m => m.id === payload.new.id) ? prev : [...prev, payload.new]);
          if (payload.new.sender_id !== userId) {
            await markMessagesRead(conversation.id, userId);
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversation?.id, userId]);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  async function handleSend(e) {
    e.preventDefault();
    if (!text.trim() || !conversation?.id) return;
    const content = text.trim();
    setText('');
    setSending(true);
    try {
      const msg = await sendMessage({ conversationId: conversation.id, senderId: userId, content });
      if (msg) setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
    } catch (err) {
      toast.error(err.message, 'Error al enviar');
      setText(content);
    } finally {
      setSending(false);
    }
  }

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

  // Bandeja del admin: lista de conversaciones de los residentes
  if (isAdmin && !conversation) {
    return (
      <div className="space-y-3 animate-fade-in">
        <div className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
            <MessageSquare size={18} className="text-white" />
          </div>
          <div>
            <p className="font-semibold text-slate-800 dark:text-ink-hi">Mensajes de los residentes</p>
            <p className="text-xs text-slate-400 dark:text-ink-low">{conversations.length} conversacion(es)</p>
          </div>
        </div>
        {conversations.length === 0 ? (
          <div className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] p-12 text-center">
            <MessageSquare size={40} className="mx-auto text-slate-300 dark:text-ink-low mb-3" />
            <p className="text-slate-500 dark:text-ink-mid text-sm">Todavia no hay conversaciones</p>
          </div>
        ) : (
          conversations.map(c => (
            <button
              key={c.id}
              onClick={() => { setMessages([]); setConversation(c); }}
              className="w-full text-left bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] p-4 flex items-center gap-3 hover:border-slate-300 dark:hover:border-white/20 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-400/[0.14] flex items-center justify-center shrink-0">
                <User size={18} className="text-brand-600 dark:text-brand-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 dark:text-ink-hi text-sm truncate">{c.profiles?.full_name || 'Residente'}</p>
                <p className="text-xs text-slate-400 dark:text-ink-low">
                  {c.last_message_at ? `Ultimo mensaje: ${formatDate(c.last_message_at)}` : 'Sin mensajes aun'}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    );
  }

  const grouped = groupByDate(messages);
  const headerName = isAdmin ? (conversation?.profiles?.full_name || 'Residente') : 'Administracion';

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] animate-fade-in">
      {/* Header */}
      <div className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] p-4 mb-4 flex items-center gap-3 shrink-0">
        {isAdmin && (
          <button
            onClick={() => { setConversation(null); setMessages([]); }}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors shrink-0"
            aria-label="Volver"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
          {isAdmin ? <User size={18} className="text-white" /> : <ShieldCheck size={18} className="text-white" />}
        </div>
        <div>
          <p className="font-semibold text-slate-800 dark:text-ink-hi">{headerName}</p>
          <p className="text-xs text-emerald-500 font-medium">{isAdmin ? 'Residente' : 'ConsorcioTrust'}</p>
        </div>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto space-y-1 px-1 pb-2">
        {grouped.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <MessageSquare size={40} className="text-slate-300 dark:text-ink-low mb-3" />
            <p className="text-slate-500 dark:text-ink-mid text-sm font-medium">No hay mensajes aun</p>
            <p className="text-slate-400 dark:text-ink-low text-xs mt-1">
              {isAdmin ? 'Escribi para responderle al residente' : 'Envia un mensaje para iniciar la conversacion con la administracion'}
            </p>
          </div>
        )}

        {grouped.map((item) => {
          if (item.type === 'date') {
            return (
              <div key={`date-${item.date}`} className="flex items-center gap-3 py-3">
                <div className="flex-1 h-px bg-slate-200 dark:bg-surface-panel2" />
                <span className="text-[10px] font-semibold text-slate-400 dark:text-ink-low uppercase tracking-wider">
                  {formatDate(item.date)}
                </span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-surface-panel2" />
              </div>
            );
          }

          const { msg } = item;
          const isMine = msg.sender_id === userId;

          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-1`}>
              {!isMine && (
                <div className="w-7 h-7 bg-gradient-to-br from-slate-600 to-slate-700 rounded-full flex items-center justify-center mr-2 shrink-0 self-end mb-1">
                  {isAdmin ? <User size={13} className="text-white" /> : <ShieldCheck size={13} className="text-white" />}
                </div>
              )}
              <div className="max-w-[75%] group">
                <div
                  className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isMine
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-white dark:bg-surface-panel text-slate-800 dark:text-ink-hi border border-slate-100 dark:border-white/[0.07] rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>
                <p className={`text-[10px] mt-0.5 text-slate-400 dark:text-ink-low ${isMine ? 'text-right' : 'text-left'}`}>
                  {formatTime(msg.created_at)}
                  {isMine && msg.read_at && <span className="ml-1 text-blue-400">✓✓</span>}
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
          placeholder="Escribi tu mensaje..."
          className="flex-1 border border-slate-200 dark:border-white/[0.09] rounded-2xl px-4 py-3 text-sm bg-white dark:bg-surface-panel dark:text-ink-hi focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
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
