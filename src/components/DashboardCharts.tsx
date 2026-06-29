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
    <div ref={containerRef} style={{ width: '100%', height: '220px' }} className="mb-10">
      {size.width > 0 && (
        <UplotReact options={{ ...options, width: size.width, height: 220 }} data={data} />
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
      <div className="bg-white p-4 border border-slate-200 col-span-2 md:col-span-1">
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
      <div className="bg-white p-4 border border-slate-200 col-span-2 md:col-span-1">
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
      <div className="bg-white p-4 border border-slate-200 col-span-2 md:col-span-1">
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
        <div className="h-60 flex flex-col items-center justify-center">
          {balanceChartData.some(d => d.value > 0) ? (
            <div className="relative w-40 h-40 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                {(() => {
                  const total = balanceChartData.reduce((sum, item) => sum + Math.abs(item.value), 0);
                  let currentOffset = 0;
                  const radius = 40;
                  const circumference = 2 * Math.PI * radius; // ~251.327
                  
                  return balanceChartData.map((item, index) => {
                    if (item.value === 0) return null;
                    const percentage = Math.abs(item.value) / total;
                    const strokeDasharray = `${percentage * circumference} ${circumference}`;
                    const offset = currentOffset;
                    currentOffset += percentage * circumference;
                    
                    return (
                      <circle
                        key={index}
                        cx="50"
                        cy="50"
                        r={radius}
                        fill="transparent"
                        stroke={index === 0 ? '#ef4444' : '#10b981'}
                        strokeWidth="15"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={-offset}
                        className="transition-all duration-500 ease-in-out"
                      />
                    );
                  });
                })()}
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-[9px] text-slate-500 uppercase font-bold tracking-widest leading-tight">Total</span>
                <span className="text-sm font-bold text-slate-900">
                  ₹{balanceChartData.reduce((s, i) => s + Math.abs(i.value), 0).toLocaleString()}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center text-black text-[10px] tracking-widest">No pending balances</div>
          )}
          {balanceChartData.some(d => d.value > 0) && (
            <div className="flex flex-col gap-1 mt-4 w-full px-2">
               <div className="flex justify-between items-center text-[9px] font-bold">
                 <span className="text-red-600 flex items-center gap-1"><div className="w-2 h-2 bg-red-500"></div> Payables</span>
                 <span className="text-red-700">₹{balanceChartData[0].value.toLocaleString()}</span>
               </div>
               <div className="flex justify-between items-center text-[9px] font-bold">
                 <span className="text-emerald-600 flex items-center gap-1"><div className="w-2 h-2 bg-emerald-500"></div> Receivables</span>
                 <span className="text-emerald-700">₹{balanceChartData[1].value.toLocaleString()}</span>
               </div>
            </div>
          )}
        </div>
      </div>

      {/* Expenses Breakdown */}
      <div className="bg-white p-4 border border-slate-200">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h3 className="text-xs sm:text-sm text-slate-900 tracking-wide font-bold">Expenses Breakdown</h3>
        </div>
        <div className="h-60 flex flex-col items-center justify-center">
          {expenseChartData.length > 0 ? (
            <div className="relative w-40 h-40 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                {(() => {
                  const total = expenseChartData.reduce((sum, item) => sum + item.value, 0);
                  let currentOffset = 0;
                  const radius = 40;
                  const circumference = 2 * Math.PI * radius;
                  
                  return [...expenseChartData].sort((a, b) => b.value - a.value).map((item, index) => {
                    const percentage = item.value / total;
                    const strokeDasharray = `${percentage * circumference} ${circumference}`;
                    const offset = currentOffset;
                    currentOffset += percentage * circumference;
                    
                    return (
                      <circle
                        key={index}
                        cx="50"
                        cy="50"
                        r={radius}
                        fill="transparent"
                        stroke={COLORS[index % COLORS.length]}
                        strokeWidth="15"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={-offset}
                        className="transition-all duration-500 ease-in-out"
                      />
                    );
                  });
                })()}
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-[9px] text-slate-500 uppercase font-bold tracking-widest leading-tight">Expenses</span>
                <span className="text-sm font-bold text-slate-900">
                  ₹{expenseChartData.reduce((s, i) => s + i.value, 0).toLocaleString()}
                </span>
              </div>
            </div>
          ) : (
             <div className="text-center text-black text-[10px] tracking-widest">No expenses recorded</div>
          )}
          {expenseChartData.length > 0 && (
            <div className="w-full mt-4 flex flex-wrap gap-2 justify-center max-h-[80px] overflow-y-auto no-scrollbar">
              {[...expenseChartData].sort((a, b) => b.value - a.value).map((entry, index) => (
                <div key={index} className="flex items-center gap-1 text-[8px] font-bold text-slate-700">
                  <div className="w-2 h-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                  {entry.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </>
  );
});

export default DashboardCharts;
