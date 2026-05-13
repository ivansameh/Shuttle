import { useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../lib/axios';
import { Send, Users, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export default function Broadcast() {
  const [targetGroup, setTargetGroup] = useState('ALL_RIDERS');
  const [lineId, setLineId] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState('SYSTEM');
  const [isSending, setIsSending] = useState(false);

  // Fetch lines for the specific line target
  const { data: lines } = useQuery({
    queryKey: ['lines'],
    queryFn: async () => {
      const res: any = await api.get('/admin/lines');
      return res.data;
    }
  });

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !body) return toast.error('Check fields');
    if (targetGroup === 'SPECIFIC_LINE' && !lineId) return toast.error('Select a line');

    setIsSending(true);
    try {
      const res: any = await api.post('/admin/notifications/broadcast', {
        targetGroup,
        lineId,
        title,
        body,
        type
      });
      if (res.success) {
        toast.success(`Broadcast sent to ${res.data?.count || 0} users`);
        setTitle('');
        setBody('');
      } else {
        toast.error(res.error || 'Failed to send');
      }
    } catch (e: any) {
      toast.error(e.message || 'An error occurred');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Admin Broadcast</h1>
        <p className="text-slate-500 mt-2">Send real-time notifications to targeted groups.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <form onSubmit={handleBroadcast} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Target Group</label>
              <select
                value={targetGroup}
                onChange={(e) => setTargetGroup(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="ALL_RIDERS">All Riders</option>
                <option value="ALL_DRIVERS">All Drivers</option>
                <option value="SPECIFIC_LINE">Specific Line Subscribers</option>
              </select>
            </div>

            {targetGroup === 'SPECIFIC_LINE' && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Select Line</label>
                <select
                  value={lineId}
                  onChange={(e) => setLineId(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                >
                  <option value="">-- Choose a Line --</option>
                  {lines?.map((line: any) => (
                    <option key={line.id} value={line.id}>{line.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Notification Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="SYSTEM">System Alert</option>
                <option value="TRIP_UPDATE">Trip Update</option>
                <option value="PROMO">Promotion / Marketing</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Notification Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Heavy Traffic Alert"
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Message Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What do you want to say?"
              required
              rows={4}
              className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-4">
            <button
              type="submit"
              disabled={isSending}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/30 transition-all disabled:opacity-70"
            >
              <Send className="w-4 h-4" />
              {isSending ? 'Sending...' : 'Send Blast'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
