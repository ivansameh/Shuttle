import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { api } from '../lib/axios';
import { useAuthStore } from '../store/authStore';
import { 
  Send, ArrowLeft, Bus, User, 
  Loader2, AlertCircle, WifiOff 
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

export default function Chat() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { user, token } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [messageText, setMessageText] = useState('');
  const [connected, setConnected] = useState(false);

  // Fetch chat history
  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ['chat', bookingId],
    queryFn: async () => {
      const res = await api.get(`/bookings/${bookingId}/messages`) as any;
      return res.data;
    },
    enabled: !!bookingId,
  });

  // Setup WebSocket connection
  useEffect(() => {
    if (!bookingId || !token) return;

    const socket = io('http://localhost:3001', {
      auth: { token, userId: user?.id, role: user?.role },
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join_chat', { bookingId });
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('new_message', (msg: Message) => {
      queryClient.setQueryData(['chat', bookingId], (old: Message[] = []) => [...old, msg]);
    });

    socket.on('error', (err: any) => {
      console.error('[Chat Socket Error]', err);
    });

    return () => {
      socket.disconnect();
    };
  }, [bookingId, token, user, queryClient]);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !socketRef.current || !connected) return;

    socketRef.current.emit('send_message', {
      bookingId,
      content: messageText.trim(),
    });

    setMessageText('');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-100px)] animate-fade-in max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 bg-surface/90 backdrop-blur-xl p-4 border-b border-border rounded-t-3xl shadow-sm">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-xl bg-gray-50 border border-border flex items-center justify-center text-muted hover:text-foreground hover:bg-gray-100 transition-colors shadow-sm"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-foreground font-black">Chat with Driver</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-success animate-pulse' : 'bg-error'}`} />
            <p className="text-[10px] font-bold text-muted uppercase tracking-widest leading-none">
              {connected ? 'connected' : 'connecting…'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-20 px-8">
            <div className="w-16 h-16 bg-gray-50 border border-border rounded-3xl flex items-center justify-center mx-auto mb-4 opacity-50 shadow-sm">
              <Bus className="w-8 h-8 text-muted" />
            </div>
            <p className="text-foreground font-bold">No messages yet</p>
            <p className="text-muted text-sm mt-1">Start a conversation with your driver about pickup details.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === user?.id;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                  isMe 
                    ? 'bg-primary-600 text-white rounded-tr-none shadow-md' 
                    : 'bg-surface border border-border text-foreground rounded-tl-none'
                }`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
                <span className="text-[10px] font-bold text-muted uppercase tracking-widest mt-1.5 px-1">
                   {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 bg-gray-50 border-t border-border rounded-b-3xl">
        {!connected && (
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold text-error uppercase tracking-widest bg-error/10 px-3 py-1.5 rounded-lg border border-error/20">
            <WifiOff className="w-3 h-3" />
            reconnecting…
          </div>
        )}
        <div className="relative flex items-center gap-3">
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            disabled={!connected}
            placeholder="Type a message to the driver…"
            className="input pr-14 disabled:opacity-50 text-foreground bg-surface shadow-sm"
          />
          <button
            type="submit"
            disabled={!connected || !messageText.trim()}
            className="absolute right-1.5 p-2 rounded-xl bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:bg-muted transition-all shadow-md active:scale-95"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
