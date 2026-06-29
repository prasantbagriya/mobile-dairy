import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useI18n } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { db } from '../lib/db';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { Sparkles, Filter, FileText, Download, Table as TableIcon, ChevronDown } from 'lucide-react';
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
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showActions, setShowActions] = useState(false);
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

      fetchedData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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
  }, [reportType, dateRange, tenantId]);

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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg md:text-xl text-slate-900 uppercase tracking-tight flex items-center gap-2">{t('reports')} <InfoTooltip text="View, analyze, and export business data as PDF/Excel." /></h2>
          </div>
          <div className="flex w-full md:w-auto items-center justify-end gap-2">
            {/* Filter Toggle Button for mobile */}
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden flex shrink-0 items-center gap-1 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 px-3 py-2 rounded-none text-[10px] uppercase font-semibold"
            >
              <Filter className="w-3.5 h-3.5" /> Filter
            </button>
          </div>
        </div>

        {/* Filter Section */}
        <div className={`${showFilters ? 'block' : 'hidden'} md:block`}>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 bg-white p-3 md:p-4 rounded-none border border-slate-200 w-full shadow-sm">
            <div className="flex flex-col md:flex-row md:items-end gap-3 w-full md:w-auto flex-1">
              <div className="w-full md:w-48 shrink-0">
                <label className="text-[9px] text-black uppercase tracking-widest block mb-0.5">Report Type</label>
                <select className="w-full p-2 bg-slate-50 border border-slate-200 rounded-none outline-none text-xs font-bold" value={reportType} onChange={e => setReportType(e.target.value)}>
                  <option value="collections">{t('collections')}</option>
                  <option value="deliveries">{t('deliveries')}</option>
                  <option value="dairy_sales">Dairy Sales</option>
                  <option value="transactions">Full Detail</option>
                  <option value="inventory">Inventory</option>
                </select>
              </div>
              {reportType !== 'inventory' && (
                <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
                  <div className="flex-1 md:w-36">
                    <label className="text-[9px] text-black uppercase tracking-widest block mb-0.5">Start Date</label>
                    <input type="date" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-none text-xs font-bold" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} />
                  </div>
                  <span className="text-slate-400 self-end mb-2 shrink-0">-</span>
                  <div className="flex-1 md:w-36">
                    <label className="text-[9px] text-black uppercase tracking-widest block mb-0.5">End Date</label>
                    <input type="date" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-none text-xs font-bold" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} />
                  </div>
                </div>
              )}
            </div>

            {/* Actions Dropdown */}
            <div className="relative w-full md:w-auto shrink-0 mt-2 md:mt-0">
              <button 
                onClick={() => setShowActions(!showActions)} 
                className="w-full md:w-auto flex items-center justify-between gap-2 bg-slate-900 text-white px-4 py-2 border border-slate-900 hover:bg-slate-800 text-[10px] uppercase font-bold tracking-widest transition-colors"
              >
                Actions <ChevronDown className={`w-4 h-4 transition-transform ${showActions ? 'rotate-180' : ''}`} />
              </button>
              
              {showActions && (
                <div className="absolute right-0 top-full mt-1 w-full md:w-48 bg-white border border-slate-200 shadow-xl z-50 flex flex-col">
                  <button 
                    onClick={() => { exportPDF(); setShowActions(false); }} 
                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left text-xs uppercase tracking-widest font-bold text-slate-700 border-b border-slate-100"
                  >
                    <FileText className="w-4 h-4" /> Export PDF
                  </button>
                  <button 
                    onClick={() => { exportExcel(); setShowActions(false); }} 
                    className="flex items-center gap-3 px-4 py-3 hover:bg-emerald-50 text-left text-xs uppercase tracking-widest font-bold text-emerald-700 border-b border-slate-100"
                  >
                    <TableIcon className="w-4 h-4" /> Export Excel
                  </button>
                  <button 
                    onClick={() => { runAIAnalysis(); setShowActions(false); }} 
                    disabled={analyzing || data.length === 0} 
                    className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 text-left text-xs uppercase tracking-widest font-bold text-blue-700 disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" /> AI Analysis
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {analysis && (
        <div className="bg-blue-50 border border-blue-100 p-6 rounded-none relative">
          <Sparkles className="absolute top-4 right-4 w-6 h-6 text-blue-200" />
          <h3 className="text-sm  text-blue-900 mb-3 uppercase tracking-widest flex items-center gap-2">AI Insights</h3>
          <div className="prose prose-blue max-w-none text-blue-800 text-xs whitespace-pre-wrap ">
            {analysis}
          </div>
        </div>
      )}

      <div className="bg-white rounded-none border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-50 flex items-center justify-between">
           <h3 className="text-[10px] uppercase  tracking-widest text-slate-900 leading-tight">Data Preview</h3>
           <span className="bg-slate-100 px-2 py-0.5 rounded-none text-[9px]  uppercase text-black">{data.length} Records</span>
        </div>
        <div className="overflow-x-auto text-xs">
          {loading ? (
             <div className="p-12 text-center text-black  text-xs uppercase tracking-widest">Loading...</div>
          ) : data.length === 0 ? (
            <div className="p-12 text-center text-black  text-xs uppercase tracking-widest">No records found</div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[9px]  uppercase text-black tracking-widest">
                <tr>
                  {reportType === 'inventory' ? (
                    <>
                      <th className="px-4 py-3">Item Name</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Quantity</th>
                      <th className="px-4 py-3">Unit</th>
                      <th className="px-4 py-3">Rate</th>
                      <th className="px-4 py-3">Value</th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">{reportType === 'collections' ? 'Farmer' : reportType === 'deliveries' ? 'Customer' : reportType === 'transactions' ? 'Person' : 'Dairy Name'}</th>
                      <th className="px-4 py-3">{reportType === 'dairy_sales' ? 'Fat' : reportType === 'transactions' ? 'Method' : 'Session'}</th>
                      <th className="px-4 py-3">{reportType === 'transactions' ? 'Role' : 'Quantity'}</th>
                      <th className="px-4 py-3">{reportType === 'transactions' ? 'Type' : 'Rate'}</th>
                      <th className="px-4 py-3">Amount</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-black">
                {data.map(item => (
                  <tr key={item.id}>
                    {reportType === 'inventory' ? (
                      <>
                        <td className="px-4 py-3 font-medium">{item.itemName}</td>
                        <td className="px-4 py-3 text-[9px] uppercase">{item.category}</td>
                        <td className="px-4 py-3 font-bold">{item.quantity}</td>
                        <td className="px-4 py-3 text-[9px] uppercase">{item.unit}</td>
                        <td className="px-4 py-3">₹{item.rate || 0}</td>
                        <td className="px-4 py-3 font-bold text-emerald-700">₹{((item.quantity || 0) * (item.rate || 0)).toFixed(2)}</td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3">{item.date}</td>
                        <td className="px-4 py-3">{item.farmerName || item.customerName || item.dairyName || item.personName}</td>
                        <td className="px-4 py-3 text-[9px] uppercase text-black">{reportType === 'dairy_sales' ? item.fat : reportType === 'transactions' ? item.method : item.session}</td>
                        <td className="px-4 py-3">{reportType === 'transactions' ? <span className="uppercase text-[9px]">{item.personType}</span> : `${item.quantity} L`}</td>
                        <td className="px-4 py-3 text-black">{reportType === 'transactions' ? <span className={item.type === 'debit' ? 'text-red-500 uppercase text-[9px]' : 'text-emerald-500 uppercase text-[9px]'}>{item.type}</span> : `₹ ${item.rate}`}</td>
                        <td className="px-4 py-3">₹ {item.amount}</td>
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
