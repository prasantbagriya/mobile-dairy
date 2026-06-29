const fs = require('fs');
const path = require('path');

const filesToFix = [
  'src/views/Farmers.tsx',
  'src/views/Customers.tsx',
  'src/views/Collections.tsx',
  'src/views/Deliveries.tsx',
  'src/views/Expenses.tsx',
  'src/views/Reports.tsx',
  'src/views/Payments.tsx',
  'src/views/Cashbook.tsx',
  'src/views/DairySales.tsx'
];

for (const file of filesToFix) {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) continue;
  
  let content = fs.readFileSync(filePath, 'utf8');

  if (file.includes('Farmers.tsx')) {
    content = content.replace(/font-normal capitalize/g, 'font-semibold capitalize');
    content = content.replace(/<table className="w-full text-left/g, '<table className="w-full xl:w-max text-left');
    
    if (content.includes(`filteredFarmers.length > 0 && viewMode === 'grid'`)) {
       content = content.replace(
         /\{filteredFarmers\.length > 0 && viewMode === 'grid' \? \(/g, 
         `{filteredFarmers.length === 0 ? (
            <div className="py-12 text-center bg-white border border-slate-100 rounded-none">
               <p className="text-black  text-xs tracking-widest">{t('no_records')}</p>
            </div>
          ) : viewMode === 'grid' ? (`
       );
       content = content.replace(
         /\{\s*filteredFarmers\.length === 0 && \(\s*<div className="py-12[^>]+>\s*<Building[^>]+>\s*<p[^>]+>\{t\('no_records'\)\}<\/p>\s*<\/div>\s*\)\s*\}/g,
         ''
       );
    }
  }
  
  if (file.includes('Customers.tsx')) {
    content = content.replace(/font-normal capitalize/g, 'font-semibold capitalize');
    content = content.replace(/<table className="w-full text-left/g, '<table className="w-full xl:w-max text-left');
    
    if (content.includes(`filteredCustomers.length > 0 && viewMode === 'grid'`)) {
       content = content.replace(
         /\{filteredCustomers\.length > 0 && viewMode === 'grid' \? \(/g, 
         `{filteredCustomers.length === 0 ? (
            <div className="py-12 text-center bg-white border border-slate-100 rounded-none">
               <p className="text-black  text-xs tracking-widest">{t('no_records')}</p>
            </div>
          ) : viewMode === 'grid' ? (`
       );
       content = content.replace(
         /\{\s*filteredCustomers\.length === 0 && \(\s*<div className="py-12[^>]+>\s*<Building[^>]+>\s*<p[^>]+>\{t\('no_records'\)\}<\/p>\s*<\/div>\s*\)\s*\}/g,
         ''
       );
    }
  }

  content = content.replace(/<thead className="([^"]*)uppercase/g, '<thead className="$1capitalize');
  content = content.replace(/<th className="([^"]*)uppercase/g, '<th className="$1capitalize');
  content = content.replace(/text-\[9px\] uppercase/g, 'text-[10px] capitalize');
  content = content.replace(/text-xs uppercase/g, 'text-xs capitalize');
  content = content.replace(/uppercase text-black/g, 'capitalize text-black');
  
  if (file.includes('Cashbook.tsx') || file.includes('Payments.tsx')) {
    content = content.replace(/uppercase/g, 'capitalize');
    content = content.replace(/text-xl text-slate-900 tracking-tight flex items-center gap-2/g, 'text-base text-slate-900 tracking-tight flex items-center gap-2');
  }

  if (file.includes('Expenses.tsx')) {
    content = content.replace(/uppercase/g, 'capitalize');
  }
  
  if (file.includes('Reports.tsx')) {
    content = content.replace(/uppercase/g, 'capitalize');
  }
  
  if (file.includes('Collections.tsx')) {
    content = content.replace(
      /<div className="max-h-\[calc\(100vh-220px\)\] md:max-h-\[600px\] overflow-y-auto overflow-x-auto custom-scrollbar">([\s\S]*?)<\/div>/,
      (match, inner) => {
        if (inner.includes('recentCollections.length === 0')) {
          const tableMatch = inner.match(/<table[\s\S]*?<\/tbody>/);
          if (tableMatch) {
            return match.replace(
              /<table[\s\S]*?<\/table>\s*\{recentCollections\.length === 0 && \([\s\S]*?<\/div>\s*\)\}/,
              `{recentCollections.length === 0 ? (
                 <div className="p-12 text-center text-black text-[10px] tracking-widest">{t('no_recent_collections', 'No recent collections')}</div>
               ) : (
                 <table className="w-full text-left order-collapse min-w-[500px]">
                   ${tableMatch[0]}
                 </table>
               )}`
            );
          }
        }
        return match;
      }
    );
  }

  if (file.includes('Deliveries.tsx')) {
    content = content.replace(
      /<div className="max-h-\[calc\(100vh-220px\)\] md:max-h-\[600px\] overflow-y-auto overflow-x-auto custom-scrollbar">([\s\S]*?)<\/div>/,
      (match, inner) => {
        if (inner.includes('recentDeliveries.length === 0')) {
          const tableMatch = inner.match(/<table[\s\S]*?<\/tbody>/);
          if (tableMatch) {
            return match.replace(
              /<table[\s\S]*?<\/table>\s*\{recentDeliveries\.length === 0 && \([\s\S]*?<\/div>\s*\)\}/,
              `{recentDeliveries.length === 0 ? (
                 <div className="p-12 text-center text-black text-[10px] tracking-widest">{t('no_recent_deliveries')}</div>
               ) : (
                 <table className="w-full text-left border-collapse min-w-[500px]">
                   ${tableMatch[0]}
                 </table>
               )}`
            );
          }
        }
        return match;
      }
    );
  }

  fs.writeFileSync(filePath, content, 'utf8');
}
