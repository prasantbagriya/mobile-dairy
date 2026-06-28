const fs = require('fs');

function removeOrderBy(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix DairySales.tsx
  content = content.replace(
    /query\(collection\(db, 'dairy_sales'\), where\('userId', '==', tenantId\), orderBy\('date', 'desc'\)\)/g,
    `query(collection(db, 'dairy_sales'), where('userId', '==', tenantId))`
  );
  content = content.replace(
    /setSales\(snap\.docs\.map\(doc => \(\{ id: doc\.id, \.\.\.doc\.data\(\) \}\)\)\);/g,
    `setSales(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));`
  );

  // Fix Dashboard.tsx
  content = content.replace(
    /query\(collection\(db, 'transactions'\), where\('userId', '==', tenantId\), orderBy\('date', 'desc'\), limit\(5\)\)/g,
    `query(collection(db, 'transactions'), where('userId', '==', tenantId))`
  );
  content = content.replace(
    /setRecentTransactions\(transSnap\.docs\.map\(d => \(\{ id: d\.id, \.\.\.d\.data\(\) \}\)\)\);/g,
    `setRecentTransactions(transSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5));`
  );

  // Fix Deliveries.tsx
  content = content.replace(
    /query\(collection\(db, 'customers'\), where\('userId', '==', tenantId\), orderBy\('sequence', 'asc'\), orderBy\('name', 'asc'\)\)/g,
    `query(collection(db, 'customers'), where('userId', '==', tenantId))`
  );
  content = content.replace(
    /setCustomers\(cusList\);/g,
    `setCustomers(cusList.sort((a, b) => (a.sequence || 0) - (b.sequence || 0) || a.name.localeCompare(b.name)));`
  );
  content = content.replace(
    /query\(collection\(db, 'milk_deliveries'\), where\('userId', '==', tenantId\), orderBy\('date', 'desc'\), limit\(15\)\)/g,
    `query(collection(db, 'milk_deliveries'), where('userId', '==', tenantId))`
  );
  content = content.replace(
    /setRecentDeliveries\(delSnap\.docs\.map\(d => \(\{ id: d\.id, \.\.\.d\.data\(\) \}\)\)\);/g,
    `setRecentDeliveries(delSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 15));`
  );

  // Fix Expenses.tsx
  content = content.replace(
    /query\(collection\(db, 'expenses'\), where\('userId', '==', tenantId\), orderBy\('date', 'desc'\)\)/g,
    `query(collection(db, 'expenses'), where('userId', '==', tenantId))`
  );
  content = content.replace(
    /setExpenses\(snap\.docs\.map\(doc => \(\{ id: doc\.id, \.\.\.doc\.data\(\) \}\)\)\);/g,
    `setExpenses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));`
  );

  // Fix Payments.tsx
  content = content.replace(
    /query\(collection\(db, 'farmers'\), where\('userId', '==', tenantId\), orderBy\('name'\)\)/g,
    `query(collection(db, 'farmers'), where('userId', '==', tenantId))`
  );
  content = content.replace(
    /setFarmers\(farSnap\.docs\.map\(d => \(\{ id: d\.id, \.\.\.d\.data\(\) \}\)\)\);/g,
    `setFarmers(farSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => a.name.localeCompare(b.name)));`
  );
  content = content.replace(
    /query\(collection\(db, 'customers'\), where\('userId', '==', tenantId\), orderBy\('name'\)\)/g,
    `query(collection(db, 'customers'), where('userId', '==', tenantId))`
  );
  content = content.replace(
    /setCustomers\(cusSnap\.docs\.map\(d => \(\{ id: d\.id, \.\.\.d\.data\(\) \}\)\)\);/g,
    `setCustomers(cusSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => a.name.localeCompare(b.name)));`
  );
  content = content.replace(
    /query\(collection\(db, 'transactions'\), where\('userId', '==', tenantId\), orderBy\('date', 'desc'\), limit\(30\)\)/g,
    `query(collection(db, 'transactions'), where('userId', '==', tenantId))`
  );
  content = content.replace(
    /setRecentTransactions\(transSnap\.docs\.map\(d => \(\{ id: d\.id, \.\.\.d\.data\(\) \}\)\)\);/g,
    `setRecentTransactions(transSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 30));`
  );

  // Fix Reports.tsx
  content = content.replace(
    /orderBy\('date', 'desc'\)/g,
    `/* removed order by */`
  );
  
  // Also we need to sort locally in Reports.tsx after fetch
  content = content.replace(
    /const collectionData = snap\.docs\.map\(d => \(\{ id: d\.id, \.\.\.d\.data\(\) \} as MilkCollection\);/g,
    `const collectionData = snap.docs.map(d => ({ id: d.id, ...d.data() } as MilkCollection)).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());`
  );
  content = content.replace(
    /const expData = snap\.docs\.map\(d => \(\{ id: d\.id, \.\.\.d\.data\(\) \}\);/g,
    `const expData = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());`
  );


  fs.writeFileSync(filePath, content, 'utf8');
}

removeOrderBy('src/views/DairySales.tsx');
removeOrderBy('src/views/Dashboard.tsx');
removeOrderBy('src/views/Deliveries.tsx');
removeOrderBy('src/views/Expenses.tsx');
removeOrderBy('src/views/Payments.tsx');
removeOrderBy('src/views/Reports.tsx');
console.log("Done modifying files");
