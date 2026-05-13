import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { api } from '../lib/axios';
import { useAuthStore } from '../store/auth';
import { 
  MessageSquare, ArrowLeft, Shield, 
  Eye, Loader2, User, Bus, Clock
} from 'lucide-react';

interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    role: string;
  };
}

export default function ChatMonitor() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { token, user: adminUser } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [connected, setConnected] = useState(false);

  // Fetch chat history
  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ['admin-chat', bookingId],
    queryFn: async () => {
      const res = await api.get(`/bookings/${bookingId}/messages`) as any;
      return res.data;
    },
    enabled: !!bookingId,
  });

  // Setup WebSocket connection (Read-Only)
  useEffect(() => {
    if (!bookingId || !token) return;

    const socket = io('http://localhost:3001', {
      auth: { token, userId: adminUser?.id, role: 'ADMIN' },
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join_chat', { bookingId });
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('new_message', (msg: Message) => {
      queryClient.setQueryData(['admin-chat', bookingId], (old: Message[] = []) => [...old, msg]);
    });

    socket.on('error', (err: any) => {
      console.error('[Admin Chat Monitor Error]', err);
    });

    return () => {
      socket.disconnect();
    };
  }, [bookingId, token, adminUser, queryClient]);

  // Scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-32">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2 text-slate-800">
              <Shield className="w-5 h-5 text-indigo-600" />
              Chat Oversight Monitor
            </h1>
            <p className="text-slate-500 text-xs mt-1 uppercase tracking-widest font-bold">
              Booking ID: #{bookingId?.slice(-6).toUpperCase()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter border ${
            connected ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'
          }`}>
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            {connected ? 'Live Monitoring' : 'Offline'}
          </div>
          <div className="bg-indigo-50 text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" />
            READ ONLY
          </div>
        </div>
      </div>

      <div className="flex-1 bg-slate-50 border border-slate-200 rounded-3xl overflow-hidden flex flex-col shadow-inner">
        {/* Warning Banner */}
        <div className="bg-amber-50 border-b border-amber-100 p-3 flex items-center gap-3">
          <Shield className="w-4 h-4 text-amber-600" />
          <p className="text-xs text-amber-800 font-medium">
            Administrative Oversight Active. You can view all messages in real-time, but cannot participate in the conversation.
          </p>
        </div>

        {/* Chat window */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
              <MessageSquare className="w-16 h-16 text-slate-300 mb-4" />
              <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Waiting for conversation...</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="flex flex-col gap-2">
                <div className={`flex items-center gap-2 ${msg.sender.role === 'DRIVER' ? 'flex-row' : 'flex-row-reverse'}`}>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black ${
                    msg.sender.role === 'DRIVER' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {msg.sender.role === 'DRIVER' ? <Bus className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {msg.sender.name} ({msg.sender.role})
                  </span>
                </div>
                <div className={`max-w-[70%] rounded-2xl p-4 shadow-sm ${
                  msg.sender.role === 'DRIVER' 
                    ? 'bg-white border border-slate-200 text-slate-800 self-start rounded-tl-none' 
                    : 'bg-indigo-600 text-white self-end rounded-tr-none'
                }`}>
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                </div>
                <span className={`text-[9px] font-bold text-slate-400 uppercase tracking-tighter ${
                  msg.sender.role === 'DRIVER' ? 'self-start' : 'self-end'
                }`}>
                  <Clock className="w-2.5 h-2.5 inline mr-1" />
                  {new Date(msg.createdAt).toLocaleString()}
                </span>
              </div>
            ))
          )}
          <div ref={scrollRef} />
        </div>
      </div>
    </div>
  );
}
