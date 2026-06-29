const fs = require('fs');
const path = require('path');

const files = ['src/views/Farmers.tsx', 'src/views/Customers.tsx'];

for (const file of files) {
  const filePath = path.join(__dirname, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Redesign tabs
  const oldTabs = `<div className="flex items-center gap-2 border-l border-slate-200 pl-3">
          <button 
            onClick={() => setViewMode('grid')}
            className={\`px-3 py-1.5 md:py-2 text-[9px] md:text-[10px] capitalize tracking-wider flex items-center gap-1.5 transition-colors \${viewMode === 'grid' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}\`}
            title="Grid View"
          >
            <LayoutGrid className="w-3.5 h-3.5" /> <span className="hidden md:inline">Grid</span>
          </button>
          <button 
            onClick={() => setViewMode('list')}
            className={\`px-3 py-1.5 md:py-2 text-[9px] md:text-[10px] capitalize tracking-wider flex items-center gap-1.5 transition-colors \${viewMode === 'list' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}\`}
            title="List View"
          >
            <ListIcon className="w-3.5 h-3.5" /> <span className="hidden md:inline">List</span>
          </button>
        </div>`;

  const newTabs = `<div className="flex items-center p-1 bg-slate-100/80 rounded-lg ml-2 md:ml-4 border border-slate-200">
          <button 
            onClick={() => setViewMode('grid')}
            className={\`flex items-center justify-center gap-1.5 px-3 md:px-4 py-1.5 rounded-md text-[10px] md:text-xs font-semibold transition-all duration-200 \${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}\`}
            title="Grid View"
          >
            <LayoutGrid className="w-3.5 h-3.5 md:w-4 md:h-4" /> <span className="hidden sm:inline">Grid</span>
          </button>
          <button 
            onClick={() => setViewMode('list')}
            className={\`flex items-center justify-center gap-1.5 px-3 md:px-4 py-1.5 rounded-md text-[10px] md:text-xs font-semibold transition-all duration-200 \${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}\`}
            title="List View"
          >
            <ListIcon className="w-3.5 h-3.5 md:w-4 md:h-4" /> <span className="hidden sm:inline">List</span>
          </button>
        </div>`;

  content = content.replace(oldTabs, newTabs);

  // Fix empty state
  if (file.includes('Farmers.tsx')) {
    // Current layout:
    // {viewMode === 'grid' ? ( <div className="grid ..."> ... </div> ) : ( <div ref={tableContainerRef}...> ... </div> )}
    // Followed by:
    // {filteredFarmers.length === 0 && ( <div className="py-12 ..."> ... </div> )}
    // We want to replace all this with:
    // {filteredFarmers.length === 0 ? ( <div className="py-12 ..."> ... </div> ) : viewMode === 'grid' ? ( <div className="grid ..."> ... </div> ) : ( <div ref={tableContainerRef}...> ... </div> )}
    
    content = content.replace(/{viewMode === 'grid' \? \(/g, 
`{filteredFarmers.length === 0 ? (
            <div className="py-16 text-center bg-white border border-slate-100 rounded-2xl mx-2 shadow-sm">
               <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                 <Users className="w-8 h-8 text-slate-300" />
               </div>
               <p className="text-slate-600 text-sm font-medium tracking-wide mb-1">{t('no_records')}</p>
               <p className="text-slate-400 text-xs">Add new farmers to see them here.</p>
            </div>
          ) : viewMode === 'grid' ? (`);
          
    // Remove the trailing empty state
    content = content.replace(/\{\s*filteredFarmers\.length === 0 && \([\s\S]*?<\/div>\s*\)\s*\}/, '');
  }

  if (file.includes('Customers.tsx')) {
    content = content.replace(/\{\(\(\) => \{\s*if \(viewMode === 'grid'\) \{/, 
`{(() => {
            if (filteredCustomers.length === 0) {
              return (
                <div className="py-16 text-center bg-white border border-slate-100 rounded-2xl mx-2 shadow-sm">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <UserCircle className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="text-slate-600 text-sm font-medium tracking-wide mb-1">{t('no_records')}</p>
                  <p className="text-slate-400 text-xs">Add new customers to see them here.</p>
                </div>
              );
            }
            if (viewMode === 'grid') {`);
            
    // Remove the trailing empty state
    content = content.replace(/\{\s*filteredCustomers\.length === 0 && \([\s\S]*?<\/div>\s*\)\s*\}/, '');
    
    // add UserCircle import if not present
    if (!content.includes('UserCircle') && content.includes('lucide-react')) {
       content = content.replace(/import \{([^}]+)\} from 'lucide-react';/, "import {$1, UserCircle} from 'lucide-react';");
    }
  }

  fs.writeFileSync(filePath, content, 'utf8');
}
