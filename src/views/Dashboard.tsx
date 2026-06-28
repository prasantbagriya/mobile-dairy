import { useState, useEffect } from 'react';
import { useI18n } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { db } from '../lib/firebase';
import { collection, query, getDocs, limit, orderBy, where, onSnapshot } from 'firebase/firestore';
import {
  Milk,
  TrendingUp,
  Users,
  Wallet,
  ChevronRight,
  PlusCircle,
  Clock,
  ArrowUpCircle,
  ArrowDownCircle
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { format } from 'date-fns';
import InfoTooltip from '../components/InfoTooltip';

export default function Dashboard({ onNavigate }: { onNavigate: (view: string) => void }) {
  const { t } = useI18n();
  const { user, tenantId } = useAuth();
  const [stats, setStats] = useState({
    todayCollection: 0,
    todaySales: 0,
    pendingPayments: 0,
    totalProfit: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [expenseChartData, setExpenseChartData] = useState<any[]>([]);
  const [financialChartData, setFinancialChartData] = useState<any[]>([]);
  const [chartFilter, setChartFilter] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [settings, setSettings] = useState({ peakFatRate: 7.2, avgPrice: 52.4 });
  const [loading, setLoading] = useState(true);

  // Data states
  const [collections, setCollections] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [farmers, setFarmers] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);

  useEffect(() => {
    if (!tenantId) return;
    const unsubSettings = onSnapshot(query(collection(db, 'settings'), where('userId', '==', tenantId)), (snap) => {
      if (!snap.empty) {
        const s = snap.docs[0].data();
        setSettings({ peakFatRate: s.peakFatRate || 7.2, avgPrice: s.avgPrice || 52.4 });
      }
    });

    const daysToFetch = 180; // Fetch up to 180 days for the monthly chart
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysToFetch);
    const startDateStr = format(startDate, 'yyyy-MM-dd');

    const unsubCol = onSnapshot(query(collection(db, 'milk_collections'), where('userId', '==', tenantId), where('date', '>=', startDateStr)), (snap) => {
      setCollections(snap.docs.map(d => d.data()));
    });

    const unsubDel = onSnapshot(query(collection(db, 'milk_deliveries'), where('userId', '==', tenantId), where('date', '>=', startDateStr)), (snap) => {
      setDeliveries(snap.docs.map(d => d.data()));
    });

    const unsubFar = onSnapshot(query(collection(db, 'farmers'), where('userId', '==', tenantId)), (snap) => {
      setFarmers(snap.docs.map(d => d.data()));
    });

    const unsubExp = onSnapshot(query(collection(db, 'expenses'), where('userId', '==', tenantId), where('date', '>=', startDateStr)), (snap) => {
      setExpenses(snap.docs.map(d => d.data()));
    });

    const transStartDate = new Date();
    transStartDate.setDate(transStartDate.getDate() - 30);
    const transDateStr = format(transStartDate, 'yyyy-MM-dd');
    const unsubTrans = onSnapshot(query(collection(db, 'transactions'), where('userId', '==', tenantId), where('date', '>=', transDateStr)), (snap) => {
      setRecentTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    setLoading(false);

    return () => {
      unsubSettings();
      unsubCol();
      unsubDel();
      unsubFar();
      unsubExp();
      unsubTrans();
    };
  }, [tenantId]);

  useEffect(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    let colTodayKg = 0;
    collections.forEach(c => {
      if (c.date === todayStr) colTodayKg += c.quantity || 0;
    });

    let delTodayKg = 0;
    let delTodayAmt = 0;
    deliveries.forEach(d => {
      if (d.date === todayStr) {
        delTodayKg += d.quantity || 0;
        delTodayAmt += d.amount || 0;
      }
    });

    let pendTotal = 0;
    farmers.forEach(doc => {
      pendTotal += doc.balance || 0;
    });

    let expTotal = 0;
    expenses.forEach(doc => {
      expTotal += doc.amount || 0;
    });

    const expMap = new Map<string, number>();
    expenses.forEach(e => {
      const cat = e.category || 'Other';
      expMap.set(cat, (expMap.get(cat) || 0) + (e.amount || 0));
    });
    setExpenseChartData(Array.from(expMap.entries()).map(([name, value]) => ({ name, value })));

    setStats({
      todayCollection: colTodayKg,
      todaySales: delTodayKg,
      pendingPayments: pendTotal,
      totalProfit: delTodayAmt - (expTotal / 30) // Simplified
    });
  }, [collections, deliveries, farmers, expenses]);

  useEffect(() => {
    let aggregated: any[] = [];

    if (chartFilter === 'daily') {
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return format(d, 'yyyy-MM-dd');
      });
      aggregated = last7Days.map(date => ({
        name: t(format(new Date(date), 'EEE').toLowerCase() as any),
        collection: collections.filter(c => c.date === date).reduce((acc, curr) => acc + (curr.quantity || 0), 0),
        sales: deliveries.filter(d => d.date === date).reduce((acc, curr) => acc + (curr.quantity || 0), 0)
      }));
    } else if (chartFilter === 'weekly') {
      for (let i = 3; i >= 0; i--) {
        const weekEnd = new Date();
        weekEnd.setDate(weekEnd.getDate() - (i * 7));
        const weekStart = new Date(weekEnd);
        weekStart.setDate(weekStart.getDate() - 6);

        const startStr = format(weekStart, 'yyyy-MM-dd');
        const endStr = format(weekEnd, 'yyyy-MM-dd');

        aggregated.push({
          name: `W${4 - i}`,
          collection: collections.filter(c => c.date >= startStr && c.date <= endStr).reduce((acc, curr) => acc + (curr.quantity || 0), 0),
          sales: deliveries.filter(d => d.date >= startStr && d.date <= endStr).reduce((acc, curr) => acc + (curr.quantity || 0), 0)
        });
      }
    } else if (chartFilter === 'monthly') {
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date();
        monthDate.setMonth(monthDate.getMonth() - i);
        const monthStrPrefix = format(monthDate, 'yyyy-MM');

        aggregated.push({
          name: t(format(monthDate, 'MMM').toLowerCase() as any),
          collection: collections.filter(c => c.date && c.date.startsWith(monthStrPrefix)).reduce((acc, curr) => acc + (curr.quantity || 0), 0),
          sales: deliveries.filter(d => d.date && d.date.startsWith(monthStrPrefix)).reduce((acc, curr) => acc + (curr.quantity || 0), 0)
        });
      }
    }

    let finAggregated: any[] = [];
    if (chartFilter === 'daily') {
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return format(d, 'yyyy-MM-dd');
      });
      finAggregated = last7Days.map(date => ({
        name: t(format(new Date(date), 'EEE').toLowerCase() as any),
        revenue: deliveries.filter(d => d.date === date).reduce((acc, curr) => acc + (curr.amount || 0), 0),
        expense: expenses.filter(e => e.date === date).reduce((acc, curr) => acc + (curr.amount || 0), 0)
      }));
    } else if (chartFilter === 'weekly') {
      for (let i = 3; i >= 0; i--) {
        const weekEnd = new Date();
        weekEnd.setDate(weekEnd.getDate() - (i * 7));
        const weekStart = new Date(weekEnd);
        weekStart.setDate(weekStart.getDate() - 6);
        const startStr = format(weekStart, 'yyyy-MM-dd');
        const endStr = format(weekEnd, 'yyyy-MM-dd');
        finAggregated.push({
          name: `W${4 - i}`,
          revenue: deliveries.filter(d => d.date >= startStr && d.date <= endStr).reduce((acc, curr) => acc + (curr.amount || 0), 0),
          expense: expenses.filter(e => e.date >= startStr && e.date <= endStr).reduce((acc, curr) => acc + (curr.amount || 0), 0)
        });
      }
    } else if (chartFilter === 'monthly') {
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date();
        monthDate.setMonth(monthDate.getMonth() - i);
        const monthStrPrefix = format(monthDate, 'yyyy-MM');
        finAggregated.push({
          name: t(format(monthDate, 'MMM').toLowerCase() as any),
          revenue: deliveries.filter(d => d.date && d.date.startsWith(monthStrPrefix)).reduce((acc, curr) => acc + (curr.amount || 0), 0),
          expense: expenses.filter(e => e.date && e.date.startsWith(monthStrPrefix)).reduce((acc, curr) => acc + (curr.amount || 0), 0)
        });
      }
    }

    setFinancialChartData(finAggregated);
    setChartData(aggregated);
  }, [collections, deliveries, chartFilter]);

  const StatCard = ({ icon: Icon, title, value, color, unit = "" }: any) => (
    <div className="bg-white p-4 rounded-none border border-slate-200 flex items-start justify-between">
      <div>
        <p className="text-black text-[10px] tracking-tight mb-0.5">{title}</p>
        <h3 className="text-xl text-slate-900 font-bold">{value.toLocaleString()} {unit}</h3>
      </div>
      <div className={`p-2.5 rounded-none border border-slate-200 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div>
          <h2 className="text-2xl text-slate-900 tracking-tight flex items-center gap-2 font-bold">
            {t('dashboard')}
            <InfoTooltip text={t("overview_metrics")} />
          </h2>
          <p className="text-slate-600 text-[10px] tracking-widest mt-0.5 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {format(new Date(), 'EEEE, d MMMM yyyy')}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onNavigate('collections')} className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 border border-blue-700 text-xs font-bold hover:bg-blue-700">
            <PlusCircle className="w-4 h-4" />
            {t('entry')}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">


        <StatCard
          icon={Milk}
          title={t('today_collection')}
          value={stats.todayCollection}
          color="bg-blue-600"
          unit="L"
        />
        <StatCard
          icon={TrendingUp}
          title={t('today_sales')}
          value={stats.todaySales}
          color="bg-emerald-600"
          unit="L"
        />
        <StatCard
          icon={Users}
          title={t('pending_payments')}
          value={stats.pendingPayments}
          color="bg-amber-600"
          unit="₹"
        />
        <StatCard
          icon={Wallet}
          title={t('total_profit')}
          value={stats.totalProfit}
          color="bg-indigo-600"
          unit="₹"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Collection Trend */}
        <div className="bg-white p-4 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm text-slate-900 tracking-widest font-bold">{t("collection_vs_sales")} (L)</h3>
            <select
              value={chartFilter}
              onChange={(e) => setChartFilter(e.target.value as any)}
              className="text-blue-600 bg-blue-50 border border-blue-200 outline-none text-[10px] py-1 px-2 tracking-widest font-bold"
            >
              <option value="daily">{t("daily")}</option>
              <option value="weekly">{t("weekly")}</option>
              <option value="monthly">{t("monthly")}</option>
            </select>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10 }} dy={5} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '0px', border: '1px solid #cbd5e1', boxShadow: 'none' }}
                />
                <Area type="monotone" dataKey="collection" stroke="#3b82f6" strokeWidth={2} fillOpacity={0.1} fill="#3b82f6" />
                <Area type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={2} fillOpacity={0} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-4 border border-slate-200 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm text-slate-900 tracking-widest font-bold">{t("recent_transactions")}</h3>
            <button onClick={() => onNavigate('payments')} className="text-blue-600 text-[10px] hover:underline tracking-widest font-bold">{t("view_all")}</button>
          </div>
          <div className="space-y-2 flex-1 max-h-[350px] overflow-y-auto custom-scrollbar pr-2">
            {recentTransactions.length === 0 ? (
              <div className="text-center py-8 text-black text-xs tracking-widest">
                {t('no_records')}
              </div>
            ) : recentTransactions.map((tr) => (
              <div key={tr.id} className="flex items-center justify-between py-2 border-b border-slate-200 last:border-0 hover:bg-slate-50 cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 flex items-center justify-center border ${tr.type === 'credit' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                    {tr.type === 'credit' ? <ArrowUpCircle className="w-4 h-4" /> : <ArrowDownCircle className="w-4 h-4" />}
                  </div>
                  <div>
                    <h4 className="text-xs text-black tracking-tight font-bold">{tr.description || t('milk_settlement')}</h4>
                    <p className="text-[9px] text-slate-500 tracking-tighter">{tr.date} • {tr.personType}</p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-3">
                  <div className="text-right">
                    <p className={`text-xs font-bold ${tr.type === 'credit' ? 'text-emerald-600' : 'text-red-600'}`}>
                      ₹{tr.amount}
                    </p>
                    <p className="text-[9px] text-slate-500">{tr.method}</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-2 gap-2 md:gap-3">
            <button onClick={() => onNavigate('farmers')} className="flex items-center justify-center gap-1.5 p-2 md:p-3 bg-blue-50 text-blue-700 hover:bg-blue-100 text-[9px] md:text-[10px] tracking-wide border border-blue-200 w-full text-center font-bold whitespace-nowrap">
              <Users className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" /> {t('farmer_profiles')}
            </button>
            <button onClick={() => onNavigate('customers')} className="flex items-center justify-center gap-1.5 p-2 md:p-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[9px] md:text-[10px] tracking-wide border border-emerald-200 w-full text-center font-bold whitespace-nowrap">
              <Users className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" /> {t('customer_ledgers')}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue vs Expenses */}
        <div className="bg-white p-4 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm text-slate-900 tracking-widest font-bold">Revenue vs Expenses (₹)</h3>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financialChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10 }} dy={5} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '0px', border: '1px solid #cbd5e1', boxShadow: 'none' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[2, 2, 0, 0]} />
                <Bar dataKey="expense" name="Expenses" fill="#ef4444" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expenses Breakdown */}
        <div className="bg-white p-4 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm text-slate-900 tracking-widest font-bold">Expenses Breakdown</h3>
          </div>
          <div className="h-60 flex items-center justify-center">
            {expenseChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {expenseChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '0px', border: '1px solid #cbd5e1', boxShadow: 'none' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-black text-xs tracking-widest">No expenses recorded</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
