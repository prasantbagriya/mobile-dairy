# Security Specification for Milk Management System

## Data Invariants
1. A MilkCollection must be associated with a valid Farmer.
2. A MilkDelivery must be associated with a valid Customer.
3. Transactions must have a valid personId and personType.
4. Farmer and Customer balances can only be updated via the system logic (implemented in client/server correctly).
5. All records must have timestamps and follow strict schema constraints.

## The "Dirty Dozen" Payloads (Denial Examples)
1. Creating a MilkCollection with a non-existent farmerId.
2. Updating a Farmer's balance directly to a huge number.
3. Creating a Customer with a mobile number of 1MB string.
4. Deleting an AdminConfig document by a non-admin.
5. Creating an Expense with a negative amount.
6. Reading other users' PII (though in this app, we assume internal data).
7. Updating a transaction's historical date.
8. Injecting extra fields (ghost fields) into a Farmer document.
9. Moving an Expense to another user.
10. Creating a MilkDelivery with quantity 0.
11. Reading the entire farmers collection without being logged in.
12. Modifying the 'role' field in AdminConfig by a non-admin.

## Access Tiers
- Admin: Full Read/Write on all collections.
- Manager: Read/Write on Collection, Delivery, Expenses, Farmers, Customers.
- Operator: Create and Read only on Collection and Delivery. No Delete.

## Rules Draft Strategy
Using isValid[Entity] functions for every entity.
Checking isAdmin() using the /admin_configs/ collection.
The user provided email at runtime (prashantbagriya7877@gmail.com) will be the bootstrapped admin.
