import { useState, useEffect, useMemo, memo } from 'react';
import { useI18n } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { db } from '../lib/db';
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
  ArrowDownCircle,
  Activity
} from 'lucide-react';
import { Suspense, lazy } from 'react';
const DashboardCharts = lazy(() => import('../components/DashboardCharts'));
import dayjs from 'dayjs';
import InfoTooltip from '../components/InfoTooltip';

export default function Dashboard({ onNavigate }: { onNavigate: (view: string) => void }) {
  const { t } = useI18n();
  const { user, tenantId } = useAuth();
  const [chartFilter, setChartFilter] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [settings, setSettings] = useState({ peakFatRate: 7.2, avgPrice: 52.4 });
  const [loading, setLoading] = useState(true);

  // Data states
  const [collections, setCollections] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [farmers, setFarmers] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);

  // Static Data Subscription
  useEffect(() => {
    if (!tenantId) return;
    const unsubSettings = onSnapshot(query(collection(db, 'settings'), where('userId', '==', tenantId)), (snap) => {
      if (!snap.empty) {
        const s = snap.docs[0].data();
        setSettings({ peakFatRate: s.peakFatRate || 7.2, avgPrice: s.avgPrice || 52.4 });
      }
    });

    const unsubFar = onSnapshot(query(collection(db, 'farmers'), where('userId', '==', tenantId)), (snap) => {
      setFarmers(snap.docs.map(d => d.data()));
    });

    const unsubCus = onSnapshot(query(collection(db, 'customers'), where('userId', '==', tenantId)), (snap) => {
      setCustomers(snap.docs.map(d => d.data()));
    });

    const transStartDate = new Date();
    transStartDate.setDate(transStartDate.getDate() - 30);
    const transDateStr = dayjs(transStartDate).format('YYYY-MM-DD');
    const unsubTrans = onSnapshot(query(collection(db, 'transactions'), where('userId', '==', tenantId), where('date', '>=', transDateStr)), (snap) => {
      setRecentTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    setLoading(false);

    return () => {
      unsubSettings();
      unsubFar();
      unsubCus();
      unsubTrans();
    };
  }, [tenantId]);

  // Dynamic Chart Data Subscription
  useEffect(() => {
    if (!tenantId) return;

    let daysToFetch = 7; // Default for 'daily'
    if (chartFilter === 'weekly') daysToFetch = 30;
    if (chartFilter === 'monthly') daysToFetch = 180;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysToFetch);
    const startDateStr = dayjs(startDate).format('YYYY-MM-DD');

    const unsubCol = onSnapshot(query(collection(db, 'milk_collections'), where('userId', '==', tenantId), where('date', '>=', startDateStr)), (snap) => {
      setCollections(snap.docs.map(d => d.data()));
    });

    const unsubDel = onSnapshot(query(collection(db, 'milk_deliveries'), where('userId', '==', tenantId), where('date', '>=', startDateStr)), (snap) => {
      setDeliveries(snap.docs.map(d => d.data()));
    });

    const unsubExp = onSnapshot(query(collection(db, 'expenses'), where('userId', '==', tenantId), where('date', '>=', startDateStr)), (snap) => {
      setExpenses(snap.docs.map(d => d.data()));
    });

    return () => {
      unsubCol();
      unsubDel();
      unsubExp();
    };
  }, [tenantId, chartFilter]);

  const { balanceChartData, expenseChartData, stats } = useMemo(() => {
    const todayStr = dayjs().format('YYYY-MM-DD');

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

    let custTotal = 0;
    customers.forEach(doc => {
      custTotal += doc.balance || 0;
    });

    const balData = [
      { name: 'Payables (Farmers)', value: pendTotal },
      { name: 'Receivables (Customers)', value: custTotal }
    ];

    let expTotal = 0;
    const expMap = new Map<string, number>();
    expenses.forEach(e => {
      expTotal += e.amount || 0;
      const cat = e.category || 'Other';
      expMap.set(cat, (expMap.get(cat) || 0) + (e.amount || 0));
    });
    
    const expData = Array.from(expMap.entries()).map(([name, value]) => ({ name, value }));

    const st = {
      todayCollection: colTodayKg,
      todaySales: delTodayKg,
      pendingPayments: pendTotal,
      totalProfit: delTodayAmt - (expTotal / 30) // Simplified
    };

    return { balanceChartData: balData, expenseChartData: expData, stats: st };
  }, [collections, deliveries, farmers, customers, expenses]);

  const { chartData, financialChartData, qualityChartData } = useMemo(() => {
    let aggregated: any[] = [];
    let finAggregated: any[] = [];
    let qualityAggregated: any[] = [];

    if (chartFilter === 'daily') {
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return dayjs(d).format('YYYY-MM-DD');
      });
      aggregated = last7Days.map(date => ({
        name: t(dayjs(date).format('ddd').toLowerCase() as any),
        collection: collections.filter(c => c.date === date).reduce((acc, curr) => acc + (curr.quantity || 0), 0),
        sales: deliveries.filter(d => d.date === date).reduce((acc, curr) => acc + (curr.quantity || 0), 0)
      }));
      finAggregated = last7Days.map(date => ({
        name: t(dayjs(date).format('ddd').toLowerCase() as any),
        revenue: deliveries.filter(d => d.date === date).reduce((acc, curr) => acc + (curr.amount || 0), 0),
        expense: expenses.filter(e => e.date === date).reduce((acc, curr) => acc + (curr.amount || 0), 0)
      }));
      qualityAggregated = last7Days.map(date => {
        const dayCols = collections.filter(c => c.date === date);
        const avgFat = dayCols.length ? dayCols.reduce((acc, curr) => acc + (curr.fat || 0), 0) / dayCols.length : 0;
        const avgSnf = dayCols.length ? dayCols.reduce((acc, curr) => acc + (curr.snf || 0), 0) / dayCols.length : 0;
        return {
          name: t(dayjs(date).format('ddd').toLowerCase() as any),
          fat: parseFloat(avgFat.toFixed(1)),
          snf: parseFloat(avgSnf.toFixed(1))
        };
      });
    } else if (chartFilter === 'weekly') {
      for (let i = 3; i >= 0; i--) {
        const weekEnd = new Date();
        weekEnd.setDate(weekEnd.getDate() - (i * 7));
        const weekStart = new Date(weekEnd);
        weekStart.setDate(weekStart.getDate() - 6);
        const startStr = dayjs(weekStart).format('YYYY-MM-DD');
        const endStr = dayjs(weekEnd).format('YYYY-MM-DD');

        const weekCols = collections.filter(c => c.date >= startStr && c.date <= endStr);
        aggregated.push({
          name: `W${4 - i}`,
          collection: weekCols.reduce((acc, curr) => acc + (curr.quantity || 0), 0),
          sales: deliveries.filter(d => d.date >= startStr && d.date <= endStr).reduce((acc, curr) => acc + (curr.quantity || 0), 0)
        });
        finAggregated.push({
          name: `W${4 - i}`,
          revenue: deliveries.filter(d => d.date >= startStr && d.date <= endStr).reduce((acc, curr) => acc + (curr.amount || 0), 0),
          expense: expenses.filter(e => e.date >= startStr && e.date <= endStr).reduce((acc, curr) => acc + (curr.amount || 0), 0)
        });
        qualityAggregated.push({
          name: `W${4 - i}`,
          fat: parseFloat((weekCols.length ? weekCols.reduce((acc, curr) => acc + (curr.fat || 0), 0) / weekCols.length : 0).toFixed(1)),
          snf: parseFloat((weekCols.length ? weekCols.reduce((acc, curr) => acc + (curr.snf || 0), 0) / weekCols.length : 0).toFixed(1))
        });
      }
    } else if (chartFilter === 'monthly') {
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date();
        monthDate.setMonth(monthDate.getMonth() - i);
        const monthStrPrefix = dayjs(monthDate).format('YYYY-MM');

        const monthCols = collections.filter(c => c.date && c.date.startsWith(monthStrPrefix));
        aggregated.push({
          name: t(dayjs(monthDate).format('MMM').toLowerCase() as any),
          collection: monthCols.reduce((acc, curr) => acc + (curr.quantity || 0), 0),
          sales: deliveries.filter(d => d.date && d.date.startsWith(monthStrPrefix)).reduce((acc, curr) => acc + (curr.quantity || 0), 0)
        });
        finAggregated.push({
          name: t(dayjs(monthDate).format('MMM').toLowerCase() as any),
          revenue: deliveries.filter(d => d.date && d.date.startsWith(monthStrPrefix)).reduce((acc, curr) => acc + (curr.amount || 0), 0),
          expense: expenses.filter(e => e.date && e.date.startsWith(monthStrPrefix)).reduce((acc, curr) => acc + (curr.amount || 0), 0)
        });
        qualityAggregated.push({
          name: t(dayjs(monthDate).format('MMM').toLowerCase() as any),
          fat: parseFloat((monthCols.length ? monthCols.reduce((acc, curr) => acc + (curr.fat || 0), 0) / monthCols.length : 0).toFixed(1)),
          snf: parseFloat((monthCols.length ? monthCols.reduce((acc, curr) => acc + (curr.snf || 0), 0) / monthCols.length : 0).toFixed(1))
        });
      }
    }

    return { chartData: aggregated, financialChartData: finAggregated, qualityChartData: qualityAggregated };
  }, [collections, deliveries, expenses, chartFilter, t]);

  const StatCard = memo(({ icon: Icon, title, value, color, unit = "" }: any) => (
    <div className="bg-white p-4 rounded-none border border-slate-200 flex items-start justify-between">
      <div>
        <p className="text-black text-[10px] tracking-tight mb-0.5">{title}</p>
        <h3 className="text-xl text-slate-900 font-bold">{value.toLocaleString()} {unit}</h3>
      </div>
      <div className={`p-2.5 rounded-none border border-slate-200 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
    </div>
  ));

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
            {dayjs().format('dddd, D MMMM YYYY')}
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
        <Suspense fallback={
          <div className="lg:col-span-2 xl:col-span-1 h-60 flex items-center justify-center bg-white border border-slate-200">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        }>
          <DashboardCharts 
            t={t}
            chartFilter={chartFilter}
            setChartFilter={setChartFilter}
            chartData={chartData}
            qualityChartData={qualityChartData}
            financialChartData={financialChartData}
            balanceChartData={balanceChartData}
            expenseChartData={expenseChartData}
          />
        </Suspense>

        {/* Recent Activity */}
        <div className="bg-white p-4 border border-slate-200 flex flex-col h-full lg:col-span-2 xl:col-span-1">
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
    </div>
  );
}
