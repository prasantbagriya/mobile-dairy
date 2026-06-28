import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useI18n } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { db } from '../lib/firebase';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { FileText, Download, Table as TableIcon, Sparkles, Filter } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import InfoTooltip from '../components/InfoTooltip';

export default function Reports() {
  const { t } = useI18n();
  const { user , tenantId } = useAuth();
  const [reportType, setReportType] = useState('collections');
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
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
    const doc = new jsPDF() as any;
    doc.text(`Milk Master - ${reportType.toUpperCase()} REPORT`, 14, 15);
    doc.text(`Range: ${dateRange.start} to ${dateRange.end}`, 14, 22);

    const headers = reportType === 'collections' 
      ? [['Date', 'Farmer', 'Session', 'Qty (L)', 'Fat/SNF', 'Rate', 'Amount']]
      : reportType === 'deliveries'
        ? [['Date', 'Customer', 'Session', 'Qty (L)', 'Rate', 'Amount']]
        : reportType === 'transactions'
          ? [['Date', 'Person', 'Role', 'Method', 'Type', 'Amount']]
          : reportType === 'inventory'
            ? [['Item Name', 'Category', 'Quantity', 'Unit', 'Rate', 'Value']]
            : [['Date', 'Dairy Name', 'Fat', 'Qty (L)', 'Rate', 'Amount']];

    const rows = data.map(item => reportType === 'collections'
      ? [item.date, item.farmerName, item.session, item.quantity, `${item.fat}/${item.snf}`, item.rate, `₹${item.amount}`]
      : reportType === 'deliveries'
        ? [item.date, item.customerName, item.session, item.quantity, item.rate, `₹${item.amount}`]
        : reportType === 'transactions'
          ? [item.date, item.personName, item.personType === 'farmer' ? 'Farmer' : 'Customer', item.method, item.type === 'debit' ? 'Debit' : 'Credit', `₹${item.amount}`]
          : reportType === 'inventory'
            ? [item.itemName, item.category, item.quantity, item.unit, `₹${item.rate || 0}`, `₹${((item.quantity || 0) * (item.rate || 0)).toFixed(2)}`]
            : [item.date, item.dairyName, item.fat, item.quantity, item.rate, `₹${item.amount}`]
    );

    doc.autoTable({
      head: headers,
      body: rows,
      startY: 30,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    });

    doc.save(`${reportType}_report_${dateRange.start}_to_${dateRange.end}.pdf`);
  };

  const exportExcel = () => {
    const exportData = data.map(item => {
      if (reportType === 'collections') return { Date: item.date, Farmer: item.farmerName, Session: item.session, 'Qty (L)': item.quantity, Fat: item.fat, SNF: item.snf, Rate: item.rate, Amount: item.amount };
      if (reportType === 'deliveries') return { Date: item.date, Customer: item.customerName, Session: item.session, 'Qty (L)': item.quantity, Rate: item.rate, Amount: item.amount };
      if (reportType === 'transactions') return { Date: item.date, Person: item.personName, Role: item.personType, Method: item.method, Type: item.type, Amount: item.amount };
      if (reportType === 'inventory') return { Item: item.itemName, Category: item.category, Quantity: item.quantity, Unit: item.unit, Rate: item.rate, Value: (item.quantity || 0) * (item.rate || 0) };
      return { Date: item.date, 'Dairy Name': item.dairyName, Fat: item.fat, 'Qty (L)': item.quantity, Rate: item.rate, Amount: item.amount };
    });
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${reportType}_report.xlsx`);
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
          <div className="flex w-full md:w-auto items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              <button onClick={exportPDF} className="flex items-center gap-1 md:gap-2 bg-slate-900 text-white px-2.5 py-2 md:px-3 rounded-none text-[10px] uppercase">
                <FileText className="w-3 h-3 md:w-3.5 md:h-3.5" /> PDF
              </button>
              <button onClick={exportExcel} className="flex items-center gap-1 md:gap-2 bg-emerald-600 text-white px-2.5 py-2 md:px-3 rounded-none text-[10px] uppercase">
                <TableIcon className="w-3 h-3 md:w-3.5 md:h-3.5" /> Excel
              </button>
              <button onClick={runAIAnalysis} disabled={analyzing || data.length === 0} className="flex items-center gap-1 md:gap-2 bg-blue-600 text-white px-2.5 py-2 md:px-3 rounded-none text-[10px] uppercase disabled:opacity-50">
                <Sparkles className="w-3 h-3 md:w-3.5 md:h-3.5" /> AI
              </button>
            </div>
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
          <div className="flex flex-col md:flex-row md:items-end gap-3 bg-white p-3 md:p-3 rounded-none border border-slate-200">
            <div className="w-full md:w-auto">
              <label className="text-[9px] text-black uppercase tracking-widest block mb-0.5">Report</label>
              <select className="w-full p-2 bg-slate-50 border border-slate-200 rounded-none outline-none text-xs" value={reportType} onChange={e => setReportType(e.target.value)}>
                <option value="collections">{t('collections')}</option>
                <option value="deliveries">{t('deliveries')}</option>
                <option value="dairy_sales">Dairy Sales</option>
                <option value="transactions">Full Detail</option>
                <option value="inventory">Inventory</option>
              </select>
            </div>
            {reportType !== 'inventory' && (
              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="flex-1">
                  <label className="text-[9px] text-black uppercase tracking-widest block mb-0.5">Start</label>
                  <input type="date" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-none text-xs" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} />
                </div>
                <span className="text-slate-400 self-end mb-2 shrink-0">-</span>
                <div className="flex-1">
                  <label className="text-[9px] text-black uppercase tracking-widest block mb-0.5">End</label>
                  <input type="date" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-none text-xs" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} />
                </div>
              </div>
            )}
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
