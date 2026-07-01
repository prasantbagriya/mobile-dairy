import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useI18n } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { db } from '../lib/db';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { Sparkles, Filter, FileText, Download, Table as TableIcon, ChevronDown, TrendingUp, TrendingDown, Package } from 'lucide-react';
import dayjs from 'dayjs';
import InfoTooltip from '../components/InfoTooltip';

export default function Reports() {
  const { t } = useI18n();
  const { user , tenantId } = useAuth();
  const [reportType, setReportType] = useState('collections');
  const [dateRange, setDateRange] = useState({
    start: dayjs().startOf('month').format('YYYY-MM-DD'),
    end: dayjs().format('YYYY-MM-DD')
  });
  const [searchFilter, setSearchFilter] = useState('');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showActions, setShowActions] = useState(false);
  
  const [inventoryStats, setInventoryStats] = useState({ bought: 0, sold: 0, currentStockValue: 0 });

  async function loadReportData() {
    if (!tenantId) return;
    setLoading(true);
    setAnalysis(null);
    try {
      const collectionName = reportType === 'collections' 
        ? 'milk_collections' 
        : reportType === 'deliveries' 
          ? 'milk_deliveries' 
          : reportType === 'transactions'
            ? 'transactions'
            : reportType === 'inventory'
              ? 'inventory'
              : 'dairy_sales';
          
      let snap;
      if (reportType === 'inventory') {
        snap = await getDocs(query(
          collection(db, 'inventory'),
          where('userId', '==', tenantId)
        ));
      } else {
        snap = await getDocs(query(
          collection(db, collectionName),
          where('userId', '==', tenantId),
          where('date', '>=', dateRange.start),
          where('date', '<=', dateRange.end)
        ));
      }

      let fetchedData: any[] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (reportType === 'transactions') {
        const farSnap = await getDocs(query(collection(db, 'farmers'), where('userId', '==', tenantId)));
        const cusSnap = await getDocs(query(collection(db, 'customers'), where('userId', '==', tenantId)));
        const farmersMap = Object.fromEntries(farSnap.docs.map(d => [d.id, d.data().name]));
        const customersMap = Object.fromEntries(cusSnap.docs.map(d => [d.id, d.data().name]));
        
        fetchedData = fetchedData.map((item: any) => ({
          ...item,
          personName: item.personType === 'farmer' ? farmersMap[item.personId] : customersMap[item.personId]
        }));
      }

      fetchedData.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
      
      if (searchFilter) {
        const lowerSearch = searchFilter.toLowerCase();
        fetchedData = fetchedData.filter(item => 
          (item.farmerName || '').toLowerCase().includes(lowerSearch) ||
          (item.customerName || '').toLowerCase().includes(lowerSearch) ||
          (item.personName || '').toLowerCase().includes(lowerSearch) ||
          (item.dairyName || '').toLowerCase().includes(lowerSearch) ||
          (item.itemName || '').toLowerCase().includes(lowerSearch)
        );
      }
      
      if (reportType === 'inventory') {
        const trSnap = await getDocs(query(collection(db, 'transactions'), where('userId', '==', tenantId), where('method', '==', 'Item Sale')));
        let sold = 0;
        trSnap.docs.forEach(doc => { sold += (doc.data().amount || 0); });
        
        const expSnap = await getDocs(query(collection(db, 'expenses'), where('userId', '==', tenantId), where('category', '==', 'Inventory Purchase')));
        let bought = 0;
        expSnap.docs.forEach(doc => { bought += (doc.data().amount || 0); });
        
        const currentVal = fetchedData.reduce((sum, item) => sum + ((item.quantity || 0) * (item.rate || 0)), 0);
        setInventoryStats({ bought, sold, currentStockValue: currentVal });
      }

      setData(fetchedData);
    } catch (e: any) {
      console.error(e);
      toast.error('Read Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (tenantId) {
      loadReportData();
    }
  }, [reportType, dateRange, tenantId, searchFilter]);

  const exportPDF = () => {
    window.print();
  };

  const exportExcel = () => {
    if (data.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = reportType === 'collections'
      ? ['Date', 'Farmer', 'Session', 'Qty (L)', 'Fat', 'SNF', 'Rate', 'Amount']
      : reportType === 'deliveries'
        ? ['Date', 'Customer', 'Session', 'Qty (L)', 'Rate', 'Amount']
        : reportType === 'transactions'
          ? ['Date', 'Person', 'Role', 'Method', 'Type', 'Amount']
          : reportType === 'inventory'
            ? ['Item Name', 'Category', 'Quantity', 'Unit', 'Rate', 'Value']
            : ['Date', 'Dairy Name', 'Fat', 'Qty (L)', 'Rate', 'Amount'];

    const rows = data.map(item => {
      if (reportType === 'collections') return [item.date, item.farmerName || '', item.session || '', item.quantity || 0, item.fat || 0, item.snf || 0, item.rate || 0, item.amount || 0];
      if (reportType === 'deliveries') return [item.date, item.customerName || '', item.session || '', item.quantity || 0, item.rate || 0, item.amount || 0];
      if (reportType === 'transactions') return [item.date, item.personName || '', item.personType || '', item.method || '', item.type || '', item.amount || 0];
      if (reportType === 'inventory') return [item.itemName || '', item.category || '', item.quantity || 0, item.unit || '', item.rate || 0, (item.quantity || 0) * (item.rate || 0)];
      return [item.date, item.dairyName || '', item.fat || 0, item.quantity || 0, item.rate || 0, item.amount || 0];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${reportType}_report_${dateRange.start}_to_${dateRange.end}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  async function runAIAnalysis() {
    setAnalyzing(true);
    try {
      const resp = await fetch("/api/reports/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: data,
          context: `This is a ${reportType} report for a dairy business from ${dateRange.start} to ${dateRange.end}.`
        })
      });
      const result = await resp.json();
      setAnalysis(result.analysis);
    } catch (e) {
      setAnalysis("Error running analysis.");
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        {/* Header Section: Title and Buttons */}
        <div className="flex items-center justify-between gap-2 md:gap-4">
          <div className="flex items-center">
            <h2 className="app-title">
              {t('reports')} 
              <span className="hidden md:inline"><InfoTooltip text="View, analyze, and export business data as PDF/Excel." /></span>
            </h2>
          </div>
          <div className="flex items-stretch justify-end gap-2 flex-1 md:flex-none">
            {/* Filter Toggle Button for mobile and desktop */}
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="flex shrink-0 items-center gap-1 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 px-2 md:px-3 py-2 rounded-none text-[10px] capitalize font-semibold transition-colors"
            >
              <Filter className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Filter</span>
            </button>
            
            {/* Actions Dropdown */}
            <div className="relative shrink-0 flex items-stretch">
              <button 
                onClick={() => setShowActions(!showActions)} 
                className="h-full flex items-center justify-between gap-1 md:gap-2 bg-slate-900 text-white px-2 md:px-4 py-2 border border-slate-900 hover:bg-slate-800 text-[10px] capitalize font-bold tracking-widest transition-colors"
              >
                Actions <ChevronDown className={`w-3 h-3 md:w-4 md:h-4 transition-transform ${showActions ? 'rotate-180' : ''}`} />
              </button>
              
              {showActions && (
                <div className="absolute right-0 top-full mt-1 w-40 md:w-48 bg-white border border-slate-200 shadow-xl z-50 flex flex-col">
                  <button 
                    onClick={() => { exportPDF(); setShowActions(false); }} 
                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left text-xs capitalize tracking-widest font-bold text-slate-700 border-b border-slate-100"
                  >
                    <FileText className="w-4 h-4" /> Export PDF
                  </button>
                  <button 
                    onClick={() => { exportExcel(); setShowActions(false); }} 
                    className="flex items-center gap-3 px-4 py-3 hover:bg-emerald-50 text-left text-xs capitalize tracking-widest font-bold text-emerald-700 border-b border-slate-100"
                  >
                    <TableIcon className="w-4 h-4" /> Export Excel
                  </button>
                  <button 
                    onClick={() => { runAIAnalysis(); setShowActions(false); }} 
                    disabled={analyzing || data.length === 0} 
                    className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 text-left text-xs capitalize tracking-widest font-bold text-blue-700 disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" /> AI Analysis
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filter Section */}
        <div className={`${showFilters ? 'block' : 'hidden'}`}>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 bg-white p-3 md:p-4 rounded-none border border-slate-200 w-full shadow-sm">
            <div className="flex flex-col md:flex-row md:items-end gap-3 w-full flex-1">
              <div className="w-full md:w-48 shrink-0">
                <label className="text-[9px] text-black capitalize tracking-widest block mb-0.5">Report Type</label>
                <select className="w-full p-2 bg-slate-50 border border-slate-200 rounded-none outline-none text-xs font-bold" value={reportType} onChange={e => setReportType(e.target.value)}>
                  <option value="collections">{t('collections')}</option>
                  <option value="deliveries">{t('deliveries')}</option>
                  <option value="dairy_sales">Dairy Sales</option>
                  <option value="transactions">All Transactions</option>
                  <option value="inventory">Inventory Dashboard</option>
                </select>
              </div>
              {reportType !== 'inventory' && (
                <div className="w-full md:w-auto shrink-0">
                  <label className="text-[9px] text-black capitalize tracking-widest block mb-0.5">Date Range</label>
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-2">
                    <input id="auto-input-68" name="auto-input-68" type="date" className="p-1.5 bg-transparent text-xs font-bold outline-none" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} />
                    <span className="text-slate-400 text-xs">-</span>
                    <input id="auto-input-69" name="auto-input-69" type="date" className="p-1.5 bg-transparent text-xs font-bold outline-none" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} />
                  </div>
                </div>
              )}
              <div className="w-full md:w-auto flex-1">
                <label className="text-[9px] text-black capitalize tracking-widest block mb-0.5">Individual Filter (Search)</label>
                <input id="auto-input-70" name="auto-input-70" type="text" placeholder="Farmer/Customer/Item Name..." className="w-full p-2 bg-slate-50 border border-slate-200 rounded-none text-xs font-bold outline-none focus:border-blue-500" value={searchFilter} onChange={e => setSearchFilter(e.target.value)} />
              </div>
            </div>

          </div>
        </div>
      </div>

      {reportType === 'inventory' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-white border border-slate-200 p-4 border-l-4 border-l-emerald-500">
            <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3"/> Total Sold</p>
            <h3 className="text-xl text-slate-900 font-bold">₹ {inventoryStats.sold.toLocaleString()}</h3>
          </div>
          <div className="bg-white border border-slate-200 p-4 border-l-4 border-l-red-500">
            <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1"><TrendingDown className="w-3 h-3"/> Total Purchased</p>
            <h3 className="text-xl text-slate-900 font-bold">₹ {inventoryStats.bought.toLocaleString()}</h3>
          </div>
          <div className="bg-slate-900 border border-slate-900 p-4 border-l-4 border-l-blue-400 text-white">
            <p className="text-[9px] text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Package className="w-3 h-3"/> Current Stock Value</p>
            <h3 className="text-xl font-bold">₹ {inventoryStats.currentStockValue.toLocaleString()}</h3>
          </div>
        </div>
      )}

      {analysis && (
        <div className="bg-blue-50 border border-blue-100 p-6 rounded-none relative">
          <Sparkles className="absolute top-4 right-4 w-6 h-6 text-blue-200" />
          <h3 className="text-sm  text-blue-900 mb-3 capitalize tracking-widest flex items-center gap-2">AI Insights</h3>
          <div className="prose prose-blue max-w-none text-blue-800 text-xs whitespace-pre-wrap ">
            {analysis}
          </div>
        </div>
      )}

      <div className="app-table-container">
        <div className="p-4 border-b border-slate-50 flex items-center justify-between">
           <h3 className="text-sm font-bold text-slate-900 leading-tight">Data Preview</h3>
           <span className="app-subtitle">{data.length} Records</span>
        </div>
        <div className="w-full">
          {loading ? (
             <div className="p-12 text-center text-black  text-xs capitalize tracking-widest">Loading...</div>
          ) : data.length === 0 ? (
            <div className="p-12 text-center text-black  text-xs capitalize tracking-widest">No records found</div>
          ) : (
            <table className="app-table">
              <thead className="app-thead">
                <tr>
                  {reportType === 'inventory' ? (
                    <>
                      <th className="app-th">Item Name</th>
                      <th className="app-th">Category</th>
                      <th className="app-th">Quantity</th>
                      <th className="app-th">Unit</th>
                      <th className="app-th">Rate</th>
                      <th className="app-th">Value</th>
                    </>
                  ) : (
                    <>
                      <th className="app-th">Date</th>
                      <th className="app-th">{reportType === 'collections' ? 'Farmer' : reportType === 'deliveries' ? 'Customer' : reportType === 'transactions' ? 'Person' : 'Dairy Name'}</th>
                      <th className="app-th">{reportType === 'dairy_sales' ? 'Fat' : reportType === 'transactions' ? 'Method' : 'Session'}</th>
                      <th className="app-th">{reportType === 'transactions' ? 'Role' : 'Quantity'}</th>
                      <th className="app-th">{reportType === 'transactions' ? 'Type' : 'Rate'}</th>
                      <th className="app-th">Amount</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="app-tbody">
                {data.map(item => (
                  <tr key={item.id} className="app-tr text-sm">
                    {reportType === 'inventory' ? (
                      <>
                        <td className="app-td font-medium">{item.itemName}</td>
                        <td className="app-td text-xs capitalize">{item.category}</td>
                        <td className="app-td font-bold">{item.quantity}</td>
                        <td className="app-td text-xs capitalize">{item.unit}</td>
                        <td className="app-td">₹{item.rate || 0}</td>
                        <td className="app-td font-bold text-emerald-700">₹{((item.quantity || 0) * (item.rate || 0)).toFixed(2)}</td>
                      </>
                    ) : (
                      <>
                        <td className="app-td">{item.date}</td>
                        <td className="app-td">{item.farmerName || item.customerName || item.dairyName || item.personName}</td>
                        <td className="app-td text-xs capitalize text-black">{reportType === 'dairy_sales' ? item.fat : reportType === 'transactions' ? item.method : item.session}</td>
                        <td className="app-td">{reportType === 'transactions' ? <span className="capitalize text-xs">{item.personType}</span> : `${item.quantity} L`}</td>
                        <td className="app-td text-black">{reportType === 'transactions' ? <span className={item.type === 'debit' ? 'text-red-500 capitalize text-xs' : 'text-emerald-500 capitalize text-xs'}>{item.type}</span> : `₹ ${item.rate}`}</td>
                        <td className="app-td ">₹ {item.amount}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
