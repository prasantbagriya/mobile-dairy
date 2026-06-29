import React, { memo } from 'react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

const formatYValue = (v: number) => {
  if (Math.abs(v) >= 10000000) return (v / 10000000).toFixed(1) + 'Cr';
  if (Math.abs(v) >= 100000) return (v / 100000).toFixed(1) + 'L';
  if (Math.abs(v) >= 1000) return (v / 1000).toFixed(1) + 'K';
  return v;
};

const DonutChart = ({ data, title, formatValue, customTotal }: any) => {
  const dataTotal = data.reduce((sum: number, item: any) => sum + item.value, 0);
  const displayTotal = customTotal !== undefined ? customTotal : dataTotal;
  let currentOffset = 0;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="flex-1 min-h-0 flex flex-col items-center justify-center relative pb-8 md:pb-0">
      {data.length > 0 && dataTotal > 0 ? (
        <div className="relative w-full max-w-[160px] aspect-square flex items-center justify-center mx-auto">
          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
            {data.sort((a: any, b: any) => b.value - a.value).map((item: any, index: number) => {
              const percentage = item.value / dataTotal;
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
                  stroke={item.color || COLORS[index % COLORS.length]}
                  strokeWidth="15"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={-offset}
                  className="transition-all duration-500 ease-in-out"
                />
              );
            })}
          </svg>
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-[9px] text-slate-500 uppercase font-bold tracking-widest leading-tight">{title}</span>
            <span className="text-sm font-bold text-slate-900">
              {formatValue ? formatValue(displayTotal) : displayTotal.toLocaleString()}
            </span>
          </div>
        </div>
      ) : (
         <div className="text-center text-black text-[10px] tracking-widest">No data</div>
      )}
      {data.length > 0 && (
        <div className="w-full mt-2 sm:mt-4 flex flex-wrap gap-1 sm:gap-2 justify-center max-h-[60px] overflow-y-auto no-scrollbar pb-2">
          {data.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-1 text-[8px] font-bold text-slate-700">
              <div className="w-2 h-2" style={{ backgroundColor: entry.color || COLORS[index % COLORS.length] }}></div>
              {entry.name}: {formatValue ? formatValue(entry.value) : entry.value.toLocaleString()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

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

  const colTotal = chartData.reduce((acc, curr) => acc + (curr.collection || 0), 0);
  const salesTotal = chartData.reduce((acc, curr) => acc + (curr.sales || 0), 0);
  const colSalesData = [
    { name: t("collection_vs_sales"), value: colTotal, color: '#3b82f6' },
    { name: t("today_sales"), value: salesTotal, color: '#10b981' }
  ].filter(d => d.value > 0);

  const fatAvg = qualityChartData.length ? qualityChartData.reduce((acc, curr) => acc + (curr.fat || 0), 0) / qualityChartData.length : 0;
  const snfAvg = qualityChartData.length ? qualityChartData.reduce((acc, curr) => acc + (curr.snf || 0), 0) / qualityChartData.length : 0;
  const qualData = [
    { name: "Avg FAT", value: parseFloat(fatAvg.toFixed(1)), color: '#f59e0b' },
    { name: "Avg SNF", value: parseFloat(snfAvg.toFixed(1)), color: '#8b5cf6' }
  ].filter(d => d.value > 0);

  const revTotal = financialChartData.reduce((acc, curr) => acc + (curr.revenue || 0), 0);
  const expTotal = financialChartData.reduce((acc, curr) => acc + (curr.expense || 0), 0);
  const finData = [
    { name: "Revenue", value: revTotal, color: '#10b981' },
    { name: "Expenses", value: expTotal, color: '#ef4444' }
  ].filter(d => d.value > 0);

  return (
    <>
      {/* Collection Trend */}
      <div className="bg-white p-2 sm:p-4 border border-slate-200 col-span-2 lg:col-span-1 flex flex-col h-[300px]">
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 mb-2 sm:mb-4">
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
        <DonutChart data={colSalesData} title="Total" formatValue={(v: number) => v.toLocaleString() + " L"} />
      </div>

      {/* Milk Quality Trend (New) */}
      <div className="bg-white p-2 sm:p-4 border border-slate-200 col-span-2 lg:col-span-1 flex flex-col h-[300px]">
        <div className="shrink-0 flex items-center justify-between gap-2 mb-2 sm:mb-4">
          <h3 className="text-xs sm:text-sm text-slate-900 tracking-wide font-bold">{t("milk_quality_trend", "Milk Quality Trend")} (FAT & SNF)</h3>
        </div>
        <DonutChart data={qualData} title="Quality" customTotal="Avg" formatValue={(v: any) => v} />
      </div>

      {/* Revenue vs Expenses */}
      <div className="bg-white p-2 sm:p-4 border border-slate-200 col-span-2 lg:col-span-1 flex flex-col h-[300px]">
        <div className="shrink-0 flex items-center justify-between gap-2 mb-2 sm:mb-4">
          <h3 className="text-xs sm:text-sm text-slate-900 tracking-wide font-bold">Revenue vs Expenses (₹)</h3>
        </div>
        <DonutChart data={finData} title="Total" formatValue={(v: number) => "₹" + formatYValue(v)} />
      </div>

      {/* Expenses Breakdown */}
      <div className="bg-white p-2 sm:p-4 border border-slate-200 col-span-2 lg:col-span-1 flex flex-col h-[300px]">
        <div className="shrink-0 flex items-center justify-between gap-2 mb-2 sm:mb-4">
          <h3 className="text-xs sm:text-sm text-slate-900 tracking-wide font-bold">Expenses Breakdown</h3>
        </div>
        <DonutChart data={expenseChartData.map((d: any, i: number) => ({...d, color: COLORS[i % COLORS.length]}))} title="Expenses" formatValue={(v: number) => "₹" + formatYValue(v)} />
      </div>
    </>
  );
});

export default DashboardCharts;
