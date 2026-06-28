const fs = require('fs');
const path = require('path');

const files = [
  "src/views/Farmers.tsx",
  "src/views/Customers.tsx",
  "src/views/Collections.tsx",
  "src/views/Deliveries.tsx",
  "src/views/Expenses.tsx",
  "src/views/Payments.tsx",
  "src/views/DairySales.tsx",
  "src/views/Inventory.tsx",
  "src/views/Dashboard.tsx",
  "src/views/Reports.tsx",
  "src/components/FarmerLedger.tsx",
  "src/components/CustomerLedger.tsx"
];

for (const filepath of files) {
  if (!fs.existsSync(filepath)) continue;
  let content = fs.readFileSync(filepath, 'utf8');

  // 1. Add `user` to useAuth()
  content = content.replace('const { accessToken } = useAuth();', 'const { accessToken, user } = useAuth();');

  // 2. Add `where` to imports
  if (!content.includes('where,')) {
    content = content.replace("import { collection,", "import { collection, where,");
    content = content.replace("import { collection,", "import { collection, where,"); // just in case
  }

  // 3. Patch specific files based on exact known strings

  // Farmers
  if (filepath.includes('Farmers.tsx')) {
    content = content.replace(
      "const snap = await getDocs(collection(db, 'farmers'));",
      "const snap = await getDocs(query(collection(db, 'farmers'), where('userId', '==', user?.uid)));"
    );
    content = content.replace(
      "farmerData[key] = value;\n            }",
      "farmerData[key] = value;\n            }\n          });\n          farmerData.userId = user?.uid;"
    );
    // Remove the extra '});' that we just matched poorly
    content = content.replace(
      "farmerData[key] = value;\n            }\n          });\n          farmerData.userId = user?.uid;\n          });",
      "farmerData[key] = value;\n            }\n          });\n          farmerData.userId = user?.uid;"
    );
    
    content = content.replace(
      "farmerData.syncPending = true;\n        await addDoc(collection(db, 'farmers'), farmerData);",
      "farmerData.syncPending = true;\n        farmerData.userId = user?.uid;\n        await addDoc(collection(db, 'farmers'), farmerData);"
    );
  }

  // Customers
  if (filepath.includes('Customers.tsx')) {
    if (!content.includes('const { user } = useAuth()')) {
        content = content.replace('const { t } = useI18n();', 'const { t } = useI18n();\n  const { user } = useAuth();');
    }
    content = content.replace(
      "const snap = await getDocs(collection(db, 'customers'));",
      "const snap = await getDocs(query(collection(db, 'customers'), where('userId', '==', user?.uid)));"
    );
    content = content.replace(
      "customerData[key] = value;\n            }\n          });",
      "customerData[key] = value;\n            }\n          });\n          customerData.userId = user?.uid;"
    );
    content = content.replace(
      "customerData.syncPending = true;\n        const newRef",
      "customerData.syncPending = true;\n        customerData.userId = user?.uid;\n        const newRef"
    );
  }

  // Collections
  if (filepath.includes('Collections.tsx')) {
    content = content.replace('const { accessToken } = useAuth();', 'const { accessToken, user } = useAuth();');
    content = content.replace(
      "const q = query(collection(db, 'milk_collections'), where('date', '==', formData.date));",
      "const q = query(collection(db, 'milk_collections'), where('userId', '==', user?.uid), where('date', '==', formData.date));"
    );
    content = content.replace(
      "const fSnap = await getDocs(query(collection(db, 'farmers'), orderBy('name')));",
      "const fSnap = await getDocs(query(collection(db, 'farmers'), where('userId', '==', user?.uid), orderBy('name')));"
    );
    content = content.replace(
      "const mSnap = await getDocs(query(collection(db, 'milk_collections'), orderBy('date', 'desc'), limit(50)));",
      "const mSnap = await getDocs(query(collection(db, 'milk_collections'), where('userId', '==', user?.uid), orderBy('date', 'desc'), limit(50)));"
    );
    content = content.replace(
      "await addDoc(collection(db, 'milk_collections'), {\n        ...formData,",
      "await addDoc(collection(db, 'milk_collections'), {\n        ...formData, userId: user?.uid,"
    );
  }

  // Deliveries
  if (filepath.includes('Deliveries.tsx')) {
    content = content.replace('const { accessToken } = useAuth();', 'const { accessToken, user } = useAuth();');
    content = content.replace(
      "const q = query(collection(db, 'milk_deliveries'), where('date', '==', formData.date));",
      "const q = query(collection(db, 'milk_deliveries'), where('userId', '==', user?.uid), where('date', '==', formData.date));"
    );
    content = content.replace(
      "const cSnap = await getDocs(query(collection(db, 'customers'), orderBy('name')));",
      "const cSnap = await getDocs(query(collection(db, 'customers'), where('userId', '==', user?.uid), orderBy('name')));"
    );
    content = content.replace(
      "const dSnap = await getDocs(query(collection(db, 'milk_deliveries'), orderBy('date', 'desc'), limit(50)));",
      "const dSnap = await getDocs(query(collection(db, 'milk_deliveries'), where('userId', '==', user?.uid), orderBy('date', 'desc'), limit(50)));"
    );
    content = content.replace(
      "await addDoc(collection(db, 'milk_deliveries'), {\n        ...formData,",
      "await addDoc(collection(db, 'milk_deliveries'), {\n        ...formData, userId: user?.uid,"
    );
  }

  // Expenses
  if (filepath.includes('Expenses.tsx')) {
    if (!content.includes('const { user } = useAuth()')) {
        content = content.replace('const { t } = useI18n();', 'const { t } = useI18n();\n  const { user } = useAuth();');
    }
    content = content.replace(
      "const snap = await getDocs(query(collection(db, 'expenses'), orderBy('date', 'desc')));",
      "const snap = await getDocs(query(collection(db, 'expenses'), where('userId', '==', user?.uid), orderBy('date', 'desc')));"
    );
    content = content.replace(
      "await addDoc(collection(db, 'expenses'), {\n        ...formData,",
      "await addDoc(collection(db, 'expenses'), {\n        ...formData, userId: user?.uid,"
    );
  }

  // Payments
  if (filepath.includes('Payments.tsx')) {
    if (!content.includes('const { user } = useAuth()')) {
        content = content.replace('const { t } = useI18n();', 'const { t } = useI18n();\n  const { user } = useAuth();');
    }
    content = content.replace(
      "const farSnap = await getDocs(query(collection(db, 'farmers'), orderBy('name')));",
      "const farSnap = await getDocs(query(collection(db, 'farmers'), where('userId', '==', user?.uid), orderBy('name')));"
    );
    content = content.replace(
      "const cusSnap = await getDocs(query(collection(db, 'customers'), orderBy('name')));",
      "const cusSnap = await getDocs(query(collection(db, 'customers'), where('userId', '==', user?.uid), orderBy('name')));"
    );
    content = content.replace(
      "const transSnap = await getDocs(query(collection(db, 'transactions'), orderBy('date', 'desc'), limit(30)));",
      "const transSnap = await getDocs(query(collection(db, 'transactions'), where('userId', '==', user?.uid), orderBy('date', 'desc'), limit(30)));"
    );
    content = content.replace(
      "await addDoc(collection(db, 'transactions'), transactionData);",
      "await addDoc(collection(db, 'transactions'), { ...transactionData, userId: user?.uid });"
    );
  }

  // DairySales
  if (filepath.includes('DairySales.tsx')) {
    if (!content.includes('const { user } = useAuth()')) {
        content = content.replace('const { t } = useI18n();', 'const { t } = useI18n();\n  const { user } = useAuth();');
    }
    content = content.replace(
      "const snap = await getDocs(query(collection(db, 'dairy_sales'), orderBy('date', 'desc')));",
      "const snap = await getDocs(query(collection(db, 'dairy_sales'), where('userId', '==', user?.uid), orderBy('date', 'desc')));"
    );
    content = content.replace(
      "await addDoc(collection(db, 'dairy_sales'), {\n        ...formData,",
      "await addDoc(collection(db, 'dairy_sales'), {\n        ...formData, userId: user?.uid,"
    );
  }

  // Inventory
  if (filepath.includes('Inventory.tsx')) {
    if (!content.includes('const { user } = useAuth()')) {
        content = content.replace('const { t } = useI18n();', 'const { t } = useI18n();\n  const { user } = useAuth();');
    }
    content = content.replace(
      "const snap = await getDocs(query(collection(db, 'inventory')));",
      "const snap = await getDocs(query(collection(db, 'inventory'), where('userId', '==', user?.uid)));"
    );
    content = content.replace(
      "await addDoc(collection(db, 'inventory'), dataToSave);",
      "await addDoc(collection(db, 'inventory'), { ...dataToSave, userId: user?.uid });"
    );
  }

  // Dashboard
  if (filepath.includes('Dashboard.tsx')) {
    if (!content.includes('const { user } = useAuth()')) {
        content = content.replace('const { t } = useI18n();', 'const { t } = useI18n();\n  const { user } = useAuth();');
    }
    content = content.replace(
      "const [farmersSnap, customersSnap, collectionsSnap, deliveriesSnap, expensesSnap, salesSnap] = await Promise.all([",
      "if(!user) return;\n      const [farmersSnap, customersSnap, collectionsSnap, deliveriesSnap, expensesSnap, salesSnap] = await Promise.all(["
    );
    content = content.replace(
      "getDocs(collection(db, 'farmers')),",
      "getDocs(query(collection(db, 'farmers'), where('userId', '==', user?.uid))),"
    );
    content = content.replace(
      "getDocs(collection(db, 'customers')),",
      "getDocs(query(collection(db, 'customers'), where('userId', '==', user?.uid))),"
    );
    content = content.replace(
      "getDocs(query(collection(db, 'milk_collections'), where('date', '>=', firstDayOfMonth))),",
      "getDocs(query(collection(db, 'milk_collections'), where('userId', '==', user?.uid), where('date', '>=', firstDayOfMonth))),"
    );
    content = content.replace(
      "getDocs(query(collection(db, 'milk_deliveries'), where('date', '>=', firstDayOfMonth))),",
      "getDocs(query(collection(db, 'milk_deliveries'), where('userId', '==', user?.uid), where('date', '>=', firstDayOfMonth))),"
    );
    content = content.replace(
      "getDocs(query(collection(db, 'expenses'), where('date', '>=', firstDayOfMonth))),",
      "getDocs(query(collection(db, 'expenses'), where('userId', '==', user?.uid), where('date', '>=', firstDayOfMonth))),"
    );
    content = content.replace(
      "getDocs(query(collection(db, 'dairy_sales'), where('date', '>=', firstDayOfMonth)))",
      "getDocs(query(collection(db, 'dairy_sales'), where('userId', '==', user?.uid), where('date', '>=', firstDayOfMonth)))"
    );
  }

  // Reports
  if (filepath.includes('Reports.tsx')) {
    if (!content.includes('const { user } = useAuth()')) {
        content = content.replace('const { t } = useI18n();', 'const { t } = useI18n();\n  const { user } = useAuth();');
    }
    content = content.replace(
      "let q = query(collection(db, reportType), orderBy('date', 'desc'));",
      "let q = query(collection(db, reportType), where('userId', '==', user?.uid), orderBy('date', 'desc'));"
    );
    content = content.replace(
      "q = query(collection(db, reportType), where('date', '>=', dateRange.start), where('date', '<=', dateRange.end), orderBy('date', 'desc'));",
      "q = query(collection(db, reportType), where('userId', '==', user?.uid), where('date', '>=', dateRange.start), where('date', '<=', dateRange.end), orderBy('date', 'desc'));"
    );
    content = content.replace(
      "const farSnap = await getDocs(collection(db, 'farmers'));",
      "const farSnap = await getDocs(query(collection(db, 'farmers'), where('userId', '==', user?.uid)));"
    );
    content = content.replace(
      "const cusSnap = await getDocs(collection(db, 'customers'));",
      "const cusSnap = await getDocs(query(collection(db, 'customers'), where('userId', '==', user?.uid)));"
    );
  }

  // FarmerLedger
  if (filepath.includes('FarmerLedger.tsx')) {
    if (!content.includes('const { user } = useAuth()')) {
        content = content.replace('export default function FarmerLedger', 'import { useAuth } from "../lib/auth";\nexport default function FarmerLedger');
        content = content.replace('const { t } = useI18n();', 'const { t } = useI18n();\n  const { user } = useAuth();');
    }
    content = content.replace(
      "const collSnap = await getDocs(query(collection(db, 'milk_collections'), where('farmerId', '==', farmer.id)));",
      "const collSnap = await getDocs(query(collection(db, 'milk_collections'), where('userId', '==', user?.uid), where('farmerId', '==', farmer.id)));"
    );
    content = content.replace(
      "const transSnap = await getDocs(query(collection(db, 'transactions'), where('personId', '==', farmer.id)));",
      "const transSnap = await getDocs(query(collection(db, 'transactions'), where('userId', '==', user?.uid), where('personId', '==', farmer.id)));"
    );
  }

  // CustomerLedger
  if (filepath.includes('CustomerLedger.tsx')) {
    if (!content.includes('const { user } = useAuth()')) {
        content = content.replace('export default function CustomerLedger', 'import { useAuth } from "../lib/auth";\nexport default function CustomerLedger');
        content = content.replace('const { t } = useI18n();', 'const { t } = useI18n();\n  const { user } = useAuth();');
    }
    content = content.replace(
      "const delSnap = await getDocs(query(collection(db, 'milk_deliveries'), where('customerId', '==', customer.id)));",
      "const delSnap = await getDocs(query(collection(db, 'milk_deliveries'), where('userId', '==', user?.uid), where('customerId', '==', customer.id)));"
    );
    content = content.replace(
      "const transSnap = await getDocs(query(collection(db, 'transactions'), where('personId', '==', customer.id)));",
      "const transSnap = await getDocs(query(collection(db, 'transactions'), where('userId', '==', user?.uid), where('personId', '==', customer.id)));"
    );
  }

  fs.writeFileSync(filepath, content);
  console.log("Patched", filepath);
}
