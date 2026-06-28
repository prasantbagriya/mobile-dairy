export interface BaseRecord {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
  syncPending?: boolean;
  isActive?: boolean;
}

export interface Farmer extends BaseRecord {
  name: string;
  mobile: string;
  address: string;
  village: string;
  bankDetails?: string; // Kept for legacy
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  balance: number;
  fixedFat?: number;
  fixedSnf?: number;
  fixedRate?: number;
  sequence?: number;
  fixedQty?: number;
  lastSettledDate?: string;
}

export interface AppSettings {
  avgPrice: number;
  peakFatRate: number;
  efficiency: number;
}

export interface Customer extends BaseRecord {
  name: string;
  mobile: string;
  address: string;
  balance: number;
  sequence?: number;
  defaultRate?: number;
  fixedQty?: number;
  lastSettledDate?: string;
}

export interface MilkCollection {
  id?: string;
  farmerId: string;
  farmerName?: string;
  date: string;
  session: 'morning' | 'evening';
  quantity: number;
  fat: number;
  snf: number;
  rate: number;
  amount: number;
  editCount?: number;
  createdAt?: string;
}

export interface MilkDelivery {
  id?: string;
  customerId: string;
  customerName?: string;
  date: string;
  session: 'morning' | 'evening';
  quantity: number;
  rate: number;
  amount: number;
  editCount?: number;
  createdAt?: string;
}

export interface Expense {
  id?: string;
  category: string;
  amount: number;
  date: string;
  description: string;
  userId?: string | null;
}

export interface Transaction {
  id?: string;
  personId: string;
  personType: 'farmer' | 'customer' | 'dairy' | 'other';
  type: 'credit' | 'debit';
  amount: number;
  date: string;
  description: string;
  method: string;
  createdAt?: string;
  userId?: string | null;
}

export type Role = 'admin' | 'manager' | 'operator';

export interface AdminConfig {
  email: string;
  role: Role;
  tenantId?: string;
  lastSyncedAt?: string;
  spreadsheetId?: string;
}

export interface InventoryItem extends BaseRecord {
  itemName: string;
  category?: string;
  quantity: number;
  unit: string;
  rate?: number;
  minStock?: number;
  userId?: string | null;
}
