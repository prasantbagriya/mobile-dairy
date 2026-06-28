import re

with open('src/views/Inventory.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports
content = content.replace(
    "import { Package, Plus, Save, X, Edit2, Trash2 } from 'lucide-react';",
    "import { Package, Plus, Save, X, Edit2, Trash2, AlertTriangle, TrendingUp } from 'lucide-react';"
)

# 2. Form data state
content = content.replace(
    """  const [formData, setFormData] = useState({
    itemName: '',
    quantity: '',
    unit: 'bags'
  });""",
    """  const [formData, setFormData] = useState({
    itemName: '',
    category: 'Feed',
    quantity: '',
    unit: 'bags',
    rate: '',
    minStock: ''
  });"""
)

# 3. Handle Save
content = content.replace(
    """      const dataToSave = {
        itemName: formData.itemName,
        quantity: parseFloat(formData.quantity) || 0,
        unit: formData.unit,
        updatedAt: now
      };""",
    """      const dataToSave = {
        itemName: formData.itemName,
        category: formData.category || 'General',
        quantity: parseFloat(formData.quantity) || 0,
        unit: formData.unit,
        rate: parseFloat(formData.rate) || 0,
        minStock: parseFloat(formData.minStock) || 0,
        updatedAt: now
      };"""
)

content = content.replace(
    "setFormData({ itemName: '', quantity: '', unit: 'bags' });",
    "setFormData({ itemName: '', category: 'Feed', quantity: '', unit: 'bags', rate: '', minStock: '' });"
)

# 4. Handle Edit Click
content = content.replace(
    """    setFormData({
      itemName: item.itemName || '',
      quantity: item.quantity?.toString() || '',
      unit: item.unit || 'bags'
    });""",
    """    setFormData({
      itemName: item.itemName || '',
      category: item.category || 'Feed',
      quantity: item.quantity?.toString() || '',
      unit: item.unit || 'bags',
      rate: item.rate?.toString() || '',
      minStock: item.minStock?.toString() || ''
    });"""
)

# 5. Render mapping
old_render = """        ) : items.map(item => (
          <div key={item.id} className="bg-white p-6 rounded-none border border-slate-200 relative overflow-hidden group">
             <div className="flex justify-between items-start mb-4">
               <Package className="w-8 h-8 text-blue-500" />
               <div className="flex gap-2">
                 <button onClick={() => handleEditClick(item)} className="p-1.5 bg-slate-50 text-black hover:text-blue-600 hover:bg-blue-50 border border-slate-100">
                   <Edit2 className="w-3.5 h-3.5" />
                 </button>
                 <button onClick={() => handleDelete(item.id)} className="p-1.5 bg-slate-50 text-black hover:text-red-600 hover:bg-red-50 border border-slate-100">
                   <Trash2 className="w-3.5 h-3.5" />
                 </button>
               </div>
             </div>
             <h3 className=" text-slate-900 text-sm uppercase tracking-tight">{item.itemName}</h3>
             <p className="text-2xl  mt-2 text-slate-900">
               {item.quantity} <span className="text-xs  text-black uppercase tracking-widest">{item.unit}</span>
             </p>
          </div>
        ))"""

new_render = """        ) : items.map(item => {
          const isLowStock = item.minStock > 0 && item.quantity <= item.minStock;
          const value = (item.quantity * (item.rate || 0)).toFixed(2);
          
          return (
            <div key={item.id} className={`bg-white p-5 rounded-none border ${isLowStock ? 'border-red-300 ring-1 ring-red-100' : 'border-slate-200'} relative overflow-hidden group`}>
               {isLowStock && (
                 <div className="absolute top-0 right-0 bg-red-100 text-red-700 text-[9px] uppercase tracking-widest px-2 py-1 font-bold flex items-center gap-1">
                   <AlertTriangle className="w-3 h-3" /> Low Stock
                 </div>
               )}
               <div className="flex justify-between items-start mb-4">
                 <div className="flex items-center gap-3">
                   <div className={`p-2 ${isLowStock ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'} rounded-none`}>
                     <Package className="w-5 h-5" />
                   </div>
                   <div>
                     <span className="text-[9px] text-slate-500 uppercase tracking-widest bg-slate-100 px-1.5 py-0.5">{item.category || 'General'}</span>
                   </div>
                 </div>
                 <div className="flex gap-1">
                   <button onClick={() => handleEditClick(item)} className="p-1.5 bg-slate-50 text-black hover:text-blue-600 hover:bg-blue-50 border border-slate-100">
                     <Edit2 className="w-3.5 h-3.5" />
                   </button>
                   <button onClick={() => handleDelete(item.id)} className="p-1.5 bg-slate-50 text-black hover:text-red-600 hover:bg-red-50 border border-slate-100">
                     <Trash2 className="w-3.5 h-3.5" />
                   </button>
                 </div>
               </div>
               <h3 className=" text-slate-900 text-base font-medium tracking-tight truncate pr-4">{item.itemName}</h3>
               <div className="flex items-end justify-between mt-2">
                 <p className={`text-2xl ${isLowStock ? 'text-red-600' : 'text-slate-900'}`}>
                   {item.quantity} <span className="text-xs text-black uppercase tracking-widest">{item.unit}</span>
                 </p>
               </div>
               {item.rate > 0 && (
                 <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-black">
                   <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Rate: ₹{item.rate}/{item.unit}</span>
                   <span className="font-mono text-slate-800">Val: ₹{value}</span>
                 </div>
               )}
            </div>
          );
        })"""

content = content.replace(old_render, new_render)

# 6. Form Inputs
old_inputs = """                  <div>
                    <label className="text-[10px]  text-black uppercase tracking-widest block mb-1.5">Item Name</label>
                    <input 
                      type="text" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-none px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-black text-sm"
                      value={formData.itemName}
                      onChange={(e) => setFormData({...formData, itemName: e.target.value})}
                      placeholder="e.g. Cattle Feed, Milk Cans"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px]  text-black uppercase tracking-widest block mb-1.5">Quantity</label>
                      <input 
                        type="number" inputMode="decimal" pattern="[0-9]*" 
                        className="w-full bg-slate-50 border border-slate-200 rounded-none px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-black text-sm"
                        value={formData.quantity}
                        onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                        placeholder="0.0"
                      />
                    </div>
                    <div>
                      <label className="text-[10px]  text-black uppercase tracking-widest block mb-1.5">Unit</label>
                      <select 
                        className="w-full bg-slate-50 border border-slate-200 rounded-none px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-black text-sm"
                        value={formData.unit}
                        onChange={(e) => setFormData({...formData, unit: e.target.value})}
                      >
                        <option value="bags">Bags</option>
                        <option value="kg">kg</option>
                        <option value="litres">Litres</option>
                        <option value="units">Units / Cans</option>
                      </select>
                    </div>
                  </div>"""

new_inputs = """                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px]  text-black uppercase tracking-widest block mb-1.5">Item Name</label>
                      <input 
                        type="text" 
                        className="w-full bg-slate-50 border border-slate-200 rounded-none px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-black text-sm"
                        value={formData.itemName}
                        onChange={(e) => setFormData({...formData, itemName: e.target.value})}
                        placeholder="e.g. Cattle Feed"
                      />
                    </div>
                    <div>
                      <label className="text-[10px]  text-black uppercase tracking-widest block mb-1.5">Category</label>
                      <select 
                        className="w-full bg-slate-50 border border-slate-200 rounded-none px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-black text-sm"
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                      >
                        <option value="Feed">Feed</option>
                        <option value="Medicine">Medicine</option>
                        <option value="Equipment">Equipment</option>
                        <option value="General">General</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px]  text-black uppercase tracking-widest block mb-1.5">Quantity</label>
                      <input 
                        type="number" inputMode="decimal" pattern="[0-9]*" 
                        className="w-full bg-slate-50 border border-slate-200 rounded-none px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-black text-sm"
                        value={formData.quantity}
                        onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                        placeholder="0.0"
                      />
                    </div>
                    <div>
                      <label className="text-[10px]  text-black uppercase tracking-widest block mb-1.5">Unit</label>
                      <select 
                        className="w-full bg-slate-50 border border-slate-200 rounded-none px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-black text-sm"
                        value={formData.unit}
                        onChange={(e) => setFormData({...formData, unit: e.target.value})}
                      >
                        <option value="bags">Bags</option>
                        <option value="kg">kg</option>
                        <option value="litres">Litres</option>
                        <option value="units">Units / Cans</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px]  text-black uppercase tracking-widest block mb-1.5">Rate per unit (₹)</label>
                      <input 
                        type="number" inputMode="decimal" pattern="[0-9]*" 
                        className="w-full bg-slate-50 border border-slate-200 rounded-none px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-black text-sm"
                        value={formData.rate}
                        onChange={(e) => setFormData({...formData, rate: e.target.value})}
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <label className="text-[10px]  text-black uppercase tracking-widest block mb-1.5">Min Stock Alert</label>
                      <input 
                        type="number" inputMode="decimal" pattern="[0-9]*" 
                        className="w-full bg-slate-50 border border-slate-200 rounded-none px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-black text-sm"
                        value={formData.minStock}
                        onChange={(e) => setFormData({...formData, minStock: e.target.value})}
                        placeholder="0.0"
                      />
                    </div>
                  </div>"""

content = content.replace(old_inputs, new_inputs)

with open('src/views/Inventory.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
