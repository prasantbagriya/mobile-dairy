const fs = require('fs');
const files = [
  'src/components/EditDeliveryModal.tsx',
  'src/components/EditMilkModal.tsx',
  'src/components/SellItemModal.tsx',
  'src/views/CustomerDashboard.tsx',
  'src/views/Customers.tsx',
  'src/views/FarmerDashboard.tsx',
  'src/views/Farmers.tsx'
];

files.forEach(f => {
  if (!fs.existsSync(f)) return;
  let content = fs.readFileSync(f, 'utf8');
  let changed = false;
  
  if (content.includes('className="bg-white w-full max-w-md overflow-hidden border border-slate-200"')) {
    content = content.replace('className="bg-white w-full max-w-md overflow-hidden border border-slate-200"', 'className="bg-white w-full max-w-md max-h-[90vh] overflow-y-auto border border-slate-200 flex flex-col"');
    changed = true;
  } else if (content.includes('className="bg-white w-full max-w-md overflow-hidden"')) {
    content = content.replace('className="bg-white w-full max-w-md overflow-hidden"', 'className="bg-white w-full max-w-md max-h-[90vh] overflow-y-auto flex flex-col"');
    changed = true;
  }
  
  if (changed) {
    fs.writeFileSync(f, content);
    console.log('Fixed', f);
  } else {
    console.log('Pattern not found in', f);
  }
});
