import React, { memo, useEffect, useRef, useState } from 'react';
import UplotReact from 'uplot-react';
import 'uplot/dist/uPlot.min.css';

const ResponsiveUplot = ({ options, data }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 240 });

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      {size.width > 0 && (
        <UplotReact options={{ ...options, width: size.width, height: size.height }} data={data} />
      )}
    </div>
  );
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];
const BALANCE_COLORS = ['#f43f5e', '#10b981']; // Red for payable, Green for receivable

interface DashboardChartsProps {
  t: (key: string) => string;
  chartFilter: 'daily' | 'weekly' | 'monthly';
  setChartFilter: (filter: 'daily' | 'weekly' | 'monthly') => void;
  chartData: any[];
  qualityChartData: any[];
  financialChartData: any[];
  balanceChartData: any[];
  expenseChartData: any[];
}

const DashboardCharts: React.FC<DashboardChartsProps> = memo(({
  t,
  chartFilter,
  setChartFilter,
  chartData,
  qualityChartData,
  financialChartData,
  balanceChartData,
  expenseChartData
}) => {
  return (
    <>
      {/* Collection Trend */}
      <div className="bg-white p-4 border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h3 className="text-xs sm:text-sm text-slate-900 tracking-wide font-bold flex-1">{t("collection_vs_sales")} (L)</h3>
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
          <ResponsiveUplot 
            data={(() => {
              if (!chartData.length) return [[], [], []];
              return [
                chartData.map((_, i) => i),
                chartData.map(d => d.collection || 0),
                chartData.map(d => d.sales || 0)
              ];
            })()}
            options={{
              scales: { x: { time: false } },
              axes: [
                { values: (u, vals) => vals.map(v => chartData[v]?.name || ''), grid: { show: false }, font: '10px Arial' },
                { grid: { stroke: '#e2e8f0', dash: [3, 3] }, font: '10px Arial' }
              ],
              series: [
                {},
                { label: t("collection_vs_sales"), stroke: '#3b82f6', width: 2 },
                { label: t("today_sales"), stroke: '#10b981', width: 2 }
              ]
            }}
          />
        </div>
      </div>

      {/* Milk Quality Trend (New) */}
      <div className="bg-white p-4 border border-slate-200">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h3 className="text-xs sm:text-sm text-slate-900 tracking-wide font-bold">{t("milk_quality_trend", "Milk Quality Trend")} (FAT & SNF)</h3>
        </div>
        <div className="h-60">
          <ResponsiveUplot 
            data={(() => {
              if (!qualityChartData.length) return [[], [], []];
              return [
                qualityChartData.map((_, i) => i),
                qualityChartData.map(d => d.fat || 0),
                qualityChartData.map(d => d.snf || 0)
              ];
            })()}
            options={{
              scales: { x: { time: false } },
              axes: [
                { values: (u, vals) => vals.map(v => qualityChartData[v]?.name || ''), grid: { show: false }, font: '10px Arial' },
                { grid: { stroke: '#e2e8f0', dash: [3, 3] }, font: '10px Arial' }
              ],
              series: [
                {},
                { label: "Avg FAT", stroke: '#f59e0b', width: 2 },
                { label: "Avg SNF", stroke: '#8b5cf6', width: 2 }
              ]
            }}
          />
        </div>
      </div>

      {/* Revenue vs Expenses */}
      <div className="bg-white p-4 border border-slate-200">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h3 className="text-xs sm:text-sm text-slate-900 tracking-wide font-bold">Revenue vs Expenses (₹)</h3>
        </div>
        <div className="h-60">
          <ResponsiveUplot 
            data={(() => {
              if (!financialChartData.length) return [[], [], []];
              return [
                financialChartData.map((_, i) => i),
                financialChartData.map(d => d.revenue || 0),
                financialChartData.map(d => d.expense || 0)
              ];
            })()}
            options={{
              scales: { x: { time: false } },
              axes: [
                { values: (u, vals) => vals.map(v => financialChartData[v]?.name || ''), grid: { show: false }, font: '10px Arial' },
                { grid: { stroke: '#e2e8f0', dash: [3, 3] }, font: '10px Arial' }
              ],
              series: [
                {},
                { label: "Revenue", stroke: '#10b981', width: 2 },
                { label: "Expenses", stroke: '#ef4444', width: 2 }
              ]
            }}
          />
        </div>
      </div>

      {/* Financial Balances (New) */}
      <div className="bg-white p-4 border border-slate-200">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h3 className="text-xs sm:text-sm text-slate-900 tracking-wide font-bold">Balances Overview (₹)</h3>
        </div>
        <div className="h-60 flex flex-col justify-center gap-4">
          {balanceChartData.some(d => d.value > 0) ? (
            balanceChartData.map((d, idx) => (
              <div key={idx} className={`p-4 border ${idx === 0 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                <p className={`text-[10px] uppercase tracking-widest font-bold ${idx === 0 ? 'text-red-600' : 'text-emerald-600'}`}>{d.name}</p>
                <p className={`text-2xl font-bold ${idx === 0 ? 'text-red-700' : 'text-emerald-700'}`}>₹{d.value.toLocaleString()}</p>
              </div>
            ))
          ) : (
            <div className="text-center text-black text-xs tracking-widest">No pending balances</div>
          )}
        </div>
      </div>

      {/* Expenses Breakdown */}
      <div className="bg-white p-4 border border-slate-200">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h3 className="text-xs sm:text-sm text-slate-900 tracking-wide font-bold">Expenses Breakdown</h3>
        </div>
        <div className="h-60 overflow-y-auto custom-scrollbar pr-2 space-y-4">
          {expenseChartData.length > 0 ? (
            [...expenseChartData].sort((a, b) => b.value - a.value).map((entry, index) => {
              const total = expenseChartData.reduce((sum, item) => sum + item.value, 0);
              const percentage = total === 0 ? 0 : Math.round((entry.value / total) * 100);
              return (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span>{entry.name}</span>
                    <span>₹{entry.value.toLocaleString()} ({percentage}%)</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 overflow-hidden">
                    <div 
                      className="h-full" 
                      style={{ width: `${percentage}%`, backgroundColor: COLORS[index % COLORS.length] }} 
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="h-full flex items-center justify-center text-black text-xs tracking-widest">No expenses recorded</div>
          )}
        </div>
      </div>
    </>
  );
});

export default DashboardCharts;
