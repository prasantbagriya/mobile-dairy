import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { db } from '../lib/db';
import { collection, getDocs, query, where } from 'firebase/firestore';
import dayjs from 'dayjs';
import { Filter, TrendingUp, TrendingDown, DollarSign, Wallet, Package, Activity } from 'lucide-react';
import InfoTooltip from '../components/InfoTooltip';
import { useI18n } from '../lib/i18n';

export default function ProfitLoss() {
  const { tenantId } = useAuth();
  const { t } = useI18n();

  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: dayjs().startOf('month').format('YYYY-MM-DD'),
    end: dayjs().format('YYYY-MM-DD')
  });

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    income: {
      milkSales: 0,
      dairySales: 0,
      inventorySales: 0,
      total: 0
    },
    expenses: {
      milkPurchases: 0,
      inventoryPurchases: 0,
      otherExpenses: 0,
      total: 0
    },
    netProfit: 0
  });

  useEffect(() => {
    if (!tenantId) return;
    loadFinancialData();
  }, [tenantId, dateRange]);

  async function loadFinancialData() {
    setLoading(true);
    try {
      // 1. Milk Collections (Expense)
      const colSnap = await getDocs(query(
        collection(db, 'milk_collections'),
        where('userId', '==', tenantId),
        where('date', '>=', dateRange.start),
        where('date', '<=', dateRange.end)
      ));
      const milkPurchases = colSnap.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);

      // 2. Milk Deliveries (Income)
      const delSnap = await getDocs(query(
        collection(db, 'milk_deliveries'),
        where('userId', '==', tenantId),
        where('date', '>=', dateRange.start),
        where('date', '<=', dateRange.end)
      ));
      const milkSales = delSnap.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);

      // 3. Dairy Sales (Income)
      const dsSnap = await getDocs(query(
        collection(db, 'dairy_sales'),
        where('userId', '==', tenantId),
        where('date', '>=', dateRange.start),
        where('date', '<=', dateRange.end)
      ));
      const dairySales = dsSnap.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);

      // 4. Expenses & Inventory Purchases (Expense)
      const expSnap = await getDocs(query(
        collection(db, 'expenses'),
        where('userId', '==', tenantId),
        where('date', '>=', dateRange.start),
        where('date', '<=', dateRange.end)
      ));
      let inventoryPurchases = 0;
      let otherExpenses = 0;
      expSnap.docs.forEach(doc => {
        const d = doc.data();
        if (d.category === 'Inventory Purchase') {
          inventoryPurchases += (d.amount || 0);
        } else {
          otherExpenses += (d.amount || 0);
        }
      });

      // 5. Inventory Sales (Income - from transactions)
      const trSnap = await getDocs(query(
        collection(db, 'transactions'),
        where('userId', '==', tenantId),
        where('date', '>=', dateRange.start),
        where('date', '<=', dateRange.end)
      ));
      let inventorySales = 0;
      trSnap.docs.forEach(doc => {
        const d = doc.data();
        if (d.method === 'Item Sale') {
          inventorySales += (d.amount || 0);
        }
      });

      const totalIncome = milkSales + dairySales + inventorySales;
      const totalExpense = milkPurchases + inventoryPurchases + otherExpenses;

      setData({
        income: { milkSales, dairySales, inventorySales, total: totalIncome },
        expenses: { milkPurchases, inventoryPurchases, otherExpenses, total: totalExpense },
        netProfit: totalIncome - totalExpense
      });
    } catch (e) {
      console.error("Error loading financial data", e);
    } finally {
      setLoading(false);
    }
  }

  function setPreset(type: 'thisMonth' | 'lastMonth' | 'year') {
    const now = new Date();
    if (type === 'thisMonth') {
      setDateRange({
        start: dayjs(now).startOf('month').format('YYYY-MM-DD'),
        end: dayjs(now).format('YYYY-MM-DD')
      });
    } else if (type === 'lastMonth') {
      const lm = dayjs(now).subtract(1, 'month').toDate();
      setDateRange({
        start: dayjs(lm).startOf('month').format('YYYY-MM-DD'),
        end: dayjs(lm).endOf('month').format('YYYY-MM-DD')
      });
    } else {
      setDateRange({
        start: dayjs(new Date(now.getFullYear(), 0, 1)).format('YYYY-MM-DD'),
        end: dayjs(now).format('YYYY-MM-DD')
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-center justify-between w-full xl:w-auto">
          <div>
            <h2 className="text-lg md:text-xl text-slate-900 tracking-tight flex items-center gap-2 font-bold">
              {t('profit_loss')} <InfoTooltip text={t('profit_loss_desc')} />
            </h2>
            <p className="text-black text-xs mt-0.5 font-medium">{t('financial_performance')}</p>
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="xl:hidden flex items-center gap-2 bg-slate-100 text-slate-900 px-3 py-2 rounded-none text-xs uppercase tracking-wider font-bold border border-slate-200"
          >
            <Filter className="w-4 h-4" /> {t('filter')}
          </button>
        </div>

        <div className={`${showFilters ? 'flex' : 'hidden'} xl:flex flex-col md:flex-row flex-wrap md:items-end gap-3 bg-white p-3 md:p-3 rounded-none border border-slate-200`}>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="flex-1">
              <label className="text-[9px] text-black uppercase tracking-widest block mb-0.5">{t('start')}</label>
              <input type="date" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-none text-xs" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} />
            </div>
            <span className="text-slate-400 self-end mb-2 shrink-0">-</span>
            <div className="flex-1">
              <label className="text-[9px] text-black uppercase tracking-widest block mb-0.5">{t('end')}</label>
              <input type="date" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-none text-xs" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} />
            </div>
          </div>
          <div className="flex items-center gap-2 border-slate-200 md:border-l md:pl-2 w-full md:w-auto justify-between md:justify-start">
            <button onClick={() => setPreset('thisMonth')} className="flex-1 md:flex-none px-2 py-2 md:px-3 bg-slate-900 text-white text-[9px] md:text-[10px] capitalize tracking-wider hover:bg-slate-800">{t('this_month')}</button>
            <button onClick={() => setPreset('lastMonth')} className="flex-1 md:flex-none px-2 py-2 md:px-3 bg-slate-900 text-white text-[9px] md:text-[10px] capitalize tracking-wider hover:bg-slate-800">{t('last_month')}</button>
            <button onClick={() => setPreset('year')} className="flex-1 md:flex-none px-2 py-2 md:px-3 bg-slate-900 text-white text-[9px] md:text-[10px] capitalize tracking-wider hover:bg-slate-800">{t('this_year')}</button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 uppercase tracking-widest text-xs">{t('calculating_financials')}</div>
      ) : (
        <>
          {/* Top Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 p-5 border-l-4 border-l-emerald-500">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3"/> {t('total_income')}</p>
              <h3 className="text-3xl text-slate-900">₹ {data.income.total.toLocaleString()}</h3>
            </div>
            <div className="bg-white border border-slate-200 p-5 border-l-4 border-l-red-500">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1"><TrendingDown className="w-3 h-3"/> {t('total_expenses')}</p>
              <h3 className="text-3xl text-slate-900">₹ {data.expenses.total.toLocaleString()}</h3>
            </div>
            <div className={`bg-slate-900 border border-slate-900 p-5 border-l-4 ${data.netProfit >= 0 ? 'border-l-blue-400' : 'border-l-red-400'} text-white`}>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Activity className="w-3 h-3"/> {t('net_profit')}</p>
              <h3 className="text-3xl">₹ {data.netProfit.toLocaleString()}</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Income Breakdown */}
            <div className="bg-white border border-slate-200 p-5">
               <h3 className="text-sm font-semibold border-b border-slate-100 pb-2 mb-4 flex items-center gap-2 text-emerald-700">
                 <DollarSign className="w-4 h-4"/> {t('income_breakdown')}
               </h3>
               <div className="space-y-4">
                 <div className="flex justify-between items-center">
                   <span className="text-sm text-slate-600">{t('milk_sales_customers')}</span>
                   <span className="text-sm font-medium">₹ {data.income.milkSales.toLocaleString()}</span>
                 </div>
                 <div className="flex justify-between items-center">
                   <span className="text-sm text-slate-600">{t('dairy_products')}</span>
                   <span className="text-sm font-medium">₹ {data.income.dairySales.toLocaleString()}</span>
                 </div>
                 <div className="flex justify-between items-center">
                   <span className="text-sm text-slate-600">{t('inventory_sales')}</span>
                   <span className="text-sm font-medium">₹ {data.income.inventorySales.toLocaleString()}</span>
                 </div>
               </div>
               <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center bg-emerald-50 p-2">
                 <span className="text-xs uppercase tracking-widest font-bold text-emerald-800">{t('total_income')}</span>
                 <span className="font-bold text-emerald-800">₹ {data.income.total.toLocaleString()}</span>
               </div>
            </div>

            {/* Expense Breakdown */}
            <div className="bg-white border border-slate-200 p-5">
               <h3 className="text-sm font-semibold border-b border-slate-100 pb-2 mb-4 flex items-center gap-2 text-red-700">
                 <Wallet className="w-4 h-4"/> {t('expense_breakdown')}
               </h3>
               <div className="space-y-4">
                 <div className="flex justify-between items-center">
                   <span className="text-sm text-slate-600">{t('milk_purchases_farmers')}</span>
                   <span className="text-sm font-medium">₹ {data.expenses.milkPurchases.toLocaleString()}</span>
                 </div>
                 <div className="flex justify-between items-center">
                   <span className="text-sm text-slate-600">{t('inventory_purchases')}</span>
                   <span className="text-sm font-medium">₹ {data.expenses.inventoryPurchases.toLocaleString()}</span>
                 </div>
                 <div className="flex justify-between items-center">
                   <span className="text-sm text-slate-600">{t('operational_expenses')}</span>
                   <span className="text-sm font-medium">₹ {data.expenses.otherExpenses.toLocaleString()}</span>
                 </div>
               </div>
               <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center bg-red-50 p-2">
                 <span className="text-xs uppercase tracking-widest font-bold text-red-800">{t('total_expenses')}</span>
                 <span className="font-bold text-red-800">₹ {data.expenses.total.toLocaleString()}</span>
               </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
