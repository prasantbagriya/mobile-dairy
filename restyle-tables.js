const fs = require('fs');
const path = require('path');

const files = ['src/views/Farmers.tsx', 'src/views/Customers.tsx'];

for (const file of files) {
  const filePath = path.join(__dirname, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Revert the empty state logic
  if (file.includes('Farmers.tsx')) {
    content = content.replace(/\{filteredFarmers\.length === 0 \? \([\s\S]*?\) : viewMode === 'grid' \? \(/, `{viewMode === 'grid' ? (`);
  }
  if (file.includes('Customers.tsx')) {
    content = content.replace(/\{\(\(\) => \{\s*if \(filteredCustomers\.length === 0\) \{[\s\S]*?\}\s*if \(viewMode === 'grid'\) \{/, 
`{(() => {
            if (viewMode === 'grid') {`);
  }

  // Update table headers to match SharedLedger
  // From: <th className="px-2 md:px-6 py-3 md:py-4 text-[10px] text-black font-semibold capitalize tracking-widest whitespace-nowrap">{t("seq_no")}</th>
  // To: <th className="px-4 py-3 border-b border-slate-200 text-black text-sm font-semibold whitespace-nowrap">{t("seq_no")}</th>
  
  // First, we replace the `thead` styling
  content = content.replace(/<thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-100 shadow-sm">/, '<thead className="bg-slate-50 sticky top-0 text-black text-sm font-semibold border-b border-slate-200 z-10">');
  
  // Replace all the th elements
  const thRegex = /<th className="[^"]*text-\[10px\][^"]*">/g;
  
  content = content.replace(thRegex, (match) => {
     let newClass = 'px-4 py-3 border-b border-slate-200 text-black text-sm font-semibold whitespace-nowrap';
     if (match.includes('text-right')) {
         newClass += ' text-right';
     }
     if (match.includes('text-center')) {
         newClass += ' text-center';
     }
     return `<th className="${newClass}">`;
  });

  // Table wrapper styling
  content = content.replace(/className="w-full xl:w-max text-left border-collapse min-w-\[800px\] relative"/, 'className="w-full text-left border-collapse border border-slate-200 min-w-[800px]"');

  fs.writeFileSync(filePath, content, 'utf8');
}
