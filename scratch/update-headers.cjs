const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src/views');

const titles = {
  "Dashboard.tsx": {
    search: /<h2 className="text-2xl font-black text-slate-900 tracking-tight">\s*\{t\('dashboard'\)\}\s*<\/h2>/,
    replace: `<h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">\n            {t('dashboard')}\n            <InfoTooltip text="Overview of your business metrics and daily summary." />\n          </h2>`
  },
  "Farmers.tsx": {
    search: /<h2 className="text-2xl font-black text-slate-900 tracking-tight">\{t\('farmers'\)\}<\/h2>/,
    replace: `<h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">{t('farmers')} <InfoTooltip text="Manage milk suppliers (farmers) and their ledger accounts." /></h2>`
  },
  "Customers.tsx": {
    search: /<h2 className="text-2xl font-black text-slate-900 tracking-tight">\{t\('customers'\)\}<\/h2>/,
    replace: `<h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">{t('customers')} <InfoTooltip text="Manage your regular milk buyers and their accounts." /></h2>`
  },
  "Deliveries.tsx": {
    search: /<h2 className="text-xl font-bold text-slate-900 tracking-tight">\{t\('deliveries'\)\}<\/h2>/,
    replace: `<h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">{t('deliveries')} <InfoTooltip text="Record milk sold/delivered to customers or walk-in sales." /></h2>`
  },
  "Expenses.tsx": {
    search: /<h2 className="text-2xl font-bold text-slate-900 tracking-tight">\{t\('expenses'\)\}<\/h2>/,
    replace: `<h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">{t('expenses')} <InfoTooltip text="Track daily business expenses like fuel, feed, and salaries." /></h2>`
  },
  "DairySales.tsx": {
    search: /<h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">\{t\('dairy_sales'\)\}<\/h2>/,
    replace: `<h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">{t('dairy_sales')} <InfoTooltip text="Record bulk milk sales to large Dairies (based on FAT)." /></h2>`
  },
  "Inventory.tsx": {
    search: /<h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">\{t\('inventory'\)\}<\/h2>/,
    replace: `<h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">{t('inventory')} <InfoTooltip text="Manage your items, stock, and product inventory." /></h2>`
  },
  "Payments.tsx": {
    search: /<h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">\{t\('payments'\)\} & \{t\('ledger'\)\}<\/h2>/,
    replace: `<h2 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">{t('payments')} & {t('ledger')} <InfoTooltip text="Manage incoming money from customers and outgoing to farmers." /></h2>`
  },
  "Reports.tsx": {
    search: /<h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">\{t\('reports'\)\}<\/h2>/,
    replace: `<h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">{t('reports')} <InfoTooltip text="View, analyze, and export business data as PDF/Excel." /></h2>`
  },
  "Sync.tsx": {
    search: /<h2 className="text-xl font-black text-slate-900 tracking-tight tracking-widest">Google Workspace Sync<\/h2>/,
    replace: `<h2 className="text-xl font-black text-slate-900 tracking-tight tracking-widest flex items-center gap-2">Google Workspace Sync <InfoTooltip text="Backup and synchronize your data to the cloud securely." /></h2>`
  },
  "Admin.tsx": {
    search: /<h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">\{t\('admin'\)\} Settings<\/h2>/,
    replace: `<h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">{t('admin')} Settings <InfoTooltip text="Manage users, settings, and business configurations." /></h2>`
  }
};

for (const [file, config] of Object.entries(titles)) {
  const filePath = path.join(srcDir, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if InfoTooltip is imported
    if (!content.includes('import InfoTooltip from')) {
      // Find the last import
      const importRegex = /^import.*?;?\n/gm;
      let lastImportIndex = 0;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        lastImportIndex = match.index + match[0].length;
      }
      if (lastImportIndex > 0) {
        content = content.slice(0, lastImportIndex) + "import InfoTooltip from '../components/InfoTooltip';\n" + content.slice(lastImportIndex);
      }
    }

    content = content.replace(config.search, config.replace);
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${file}`);
  }
}

// Special handling for Collections.tsx
const collectionsPath = path.join(srcDir, 'Collections.tsx');
if (fs.existsSync(collectionsPath)) {
    let content = fs.readFileSync(collectionsPath, 'utf8');
    if (!content.includes('import InfoTooltip from')) {
        const importRegex = /^import.*?;?\n/gm;
        let lastImportIndex = 0;
        let match;
        while ((match = importRegex.exec(content)) !== null) {
          lastImportIndex = match.index + match[0].length;
        }
        if (lastImportIndex > 0) {
          content = content.slice(0, lastImportIndex) + "import InfoTooltip from '../components/InfoTooltip';\n" + content.slice(lastImportIndex);
        }
    }
    // Collections doesn't have an h2. Add one above the tabs.
    const tabsRegex = /<div className="xl:col-span-12 mb-2 flex gap-2">/;
    if (content.match(tabsRegex) && !content.includes('<h2 className="text-2xl')) {
        const replaceStr = `<div className="xl:col-span-12 flex items-center justify-between mb-4">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            {t('collections')}
            <InfoTooltip text="Record milk purchased from farmers with FAT/SNF testing." />
          </h2>
        </div>\n        <div className="xl:col-span-12 mb-2 flex gap-2">`;
        content = content.replace(tabsRegex, replaceStr);
        fs.writeFileSync(collectionsPath, content);
        console.log("Updated Collections.tsx");
    }
}
