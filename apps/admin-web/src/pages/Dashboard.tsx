import { useQuery } from '@tanstack/react-query';
import { PieChart as PieChartIcon, TrendingUp, Users, Route, Banknote, ShieldAlert, ArrowRightLeft } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { getKpis, getTimeSeriesData, getRecentTransactions } from '../api/analytics';
import { useState } from 'react';

export default function Dashboard() {
  const [page, setPage] = useState(1);
  const limit = 5;

  const { data: kpis, isLoading: isLoadingKpis, isError: isErrorKpis } = useQuery({
    queryKey: ['analyticsKpis'],
    queryFn: getKpis,
  });

  const { data: timeSeries, isLoading: isLoadingTimeSeries } = useQuery({
    queryKey: ['analyticsTimeSeries'],
    queryFn: getTimeSeriesData,
  });

  const { data: transactionsData, isLoading: isLoadingTransactions } = useQuery({
    queryKey: ['analyticsTransactions', page, limit],
    queryFn: () => getRecentTransactions(page, limit),
  });

  if (isLoadingKpis || isLoadingTimeSeries || isLoadingTransactions) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isErrorKpis) {
    return (
      <div className="bg-red-50 p-6 rounded-2xl border border-red-200">
        <h3 className="text-red-800 font-bold">Error loading analytics</h3>
        <p className="text-red-600">Failed to load the financial dashboard. Please try again later.</p>
      </div>
    );
  }

  const { totalGrossVolume, totalPlatformRevenue, totalPendingPayouts } = kpis || {};

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
          <PieChartIcon className="w-6 h-6 text-blue-600" />
          Financial Analytics
        </h2>
        <p className="text-slate-500 text-sm mt-1">Real-time overview of revenue, payouts, and volume.</p>
      </div>

      {/* Top Level KPIs */}
      <div className="grid grid-cols-3 gap-6 pb-2">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4 hover:border-slate-300 transition-colors">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-blue-100 text-blue-600">
            <Banknote className="w-7 h-7" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Gross Volume (EGP)</p>
            <p className="text-3xl font-bold text-slate-800 leading-none mt-1">
              {Number(totalGrossVolume || 0).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4 hover:border-slate-300 transition-colors">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-emerald-100 text-emerald-600">
            <TrendingUp className="w-7 h-7" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Platform Revenue</p>
            <p className="text-3xl font-bold text-slate-800 leading-none mt-1">
              {Number(totalPlatformRevenue || 0).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4 hover:border-slate-300 transition-colors">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-amber-100 text-amber-600">
            <ArrowRightLeft className="w-7 h-7" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Pending Payouts</p>
            <p className="text-3xl font-bold text-slate-800 leading-none mt-1">
              {Number(totalPendingPayouts || 0).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Time-Series Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-800">Financial Growth (Last 30 Days)</h3>
            <p className="text-sm text-slate-500">Gross volume vs Platform Net Revenue</p>
          </div>
          
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeSeries || []} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '4px' }}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" />
                <Line type="monotone" dataKey="grossVolume" name="Gross Volume (EGP)" stroke="#3b82f6" strokeWidth={3} dot={{ r: 3, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="netRevenue" name="Platform Revenue (EGP)" stroke="#10b981" strokeWidth={3} dot={{ r: 3, fill: '#10b981' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Transactions Table */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-800">Recent Transactions</h3>
            <p className="text-sm text-slate-500">Latest financial ledger entries</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-sm font-semibold text-slate-500">
                  <th className="pb-3 px-4">Date</th>
                  <th className="pb-3 px-4">Type</th>
                  <th className="pb-3 px-4">Users</th>
                  <th className="pb-3 px-4 text-right">Amount</th>
                  <th className="pb-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactionsData?.transactions?.map((tx: any) => (
                  <tr key={tx.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-4 text-sm text-slate-600">
                      {new Date(tx.createdAt).toLocaleString()}
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm font-medium text-slate-800">
                        {tx.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm">
                      {tx.rider && <div className="text-slate-600">Rider: {tx.rider.name}</div>}
                      {tx.driver && <div className="text-slate-600">Driver: {tx.driver.name}</div>}
                      {!tx.rider && !tx.driver && <span className="text-slate-400">System</span>}
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-slate-800">
                      {Number(tx.amount).toLocaleString()} {tx.currency}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${tx.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : ''}
                        ${tx.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : ''}
                        ${tx.status === 'FAILED' ? 'bg-red-100 text-red-800' : ''}
                      `}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {transactionsData?.transactions?.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No transactions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
            <span className="text-sm text-slate-500">
              Showing page {transactionsData?.pagination?.page} of {transactionsData?.pagination?.totalPages || 1}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                disabled={page >= (transactionsData?.pagination?.totalPages || 1)}
                onClick={() => setPage(p => p + 1)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
