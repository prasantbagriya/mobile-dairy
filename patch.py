import os
import re

files_to_patch = [
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
    "src/views/Sync.tsx",
    "src/components/FarmerLedger.tsx",
    "src/components/CustomerLedger.tsx"
]

for filepath in files_to_patch:
    if not os.path.exists(filepath): continue
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # 1. Ensure `user` is imported in `useAuth()`
    if 'useAuth()' in content:
        if 'const { user ' not in content and 'const { user,' not in content and 'const { user:' not in content and '{user}' not in content.replace(' ', ''):
            content = re.sub(r'const\s*{\s*([^}]+?)\s*}\s*=\s*useAuth\(\);', r'const { \1, user } = useAuth();', content, 1)
        elif '{ accessToken }' in content and 'user' not in content:
            content = content.replace('{ accessToken }', '{ accessToken, user }')

    # 2. Ensure `where` is imported from firestore
    if 'from \'firebase/firestore\'' in content and 'where' not in content:
        content = content.replace('from \'firebase/firestore\'', ', where } from \'firebase/firestore\'')
        content = content.replace('}, where }', ', where }')

    # 3. Add `userId: user?.uid` to addDoc calls
    content = re.sub(r'await\s+addDoc\(\s*collection\(db,\s*\'([^\']+)\'\),\s*([a-zA-Z0-9_]+)\s*\);', r'await addDoc(collection(db, \'\1\'), { ...\2, userId: user?.uid });', content)
    content = re.sub(r'await\s+addDoc\(\s*collection\(db,\s*\'([^\']+)\'\),\s*\{', r'await addDoc(collection(db, \'\1\'), { userId: user?.uid, ', content)

    # 4. Modify getDocs(query(...)) to include where('userId', '==', user?.uid)
    def repl_query(match):
        col = match.group(1)
        if col == 'admin_configs': return match.group(0) # skip admin_configs
        rest = match.group(2)
        if 'userId' in rest: return match.group(0) # already patched
        return f"query(collection(db, '{col}'), where('userId', '==', user?.uid), {rest}"
        
    content = re.sub(r'query\(\s*collection\(db,\s*\'([^\']+)\'\)\s*,\s*(.*?)\)', repl_query, content)

    # 5. Modify getDocs(collection(...)) to getDocs(query(collection(...), where(...)))
    def repl_col(match):
        col = match.group(1)
        if col == 'admin_configs': return match.group(0)
        return f"query(collection(db, '{col}'), where('userId', '==', user?.uid))"
        
    content = re.sub(r'(?<!query\()collection\(db,\s*\'([^\']+)\'\)(?!\s*,)', repl_col, content)

    # 6. Deal with doc(collection(db, 'farmers')) inside batches where they are created.
    # In Farmers.tsx: const newRef = doc(collection(db, 'farmers')); batch.set(newRef, farmerData);
    # In Customers.tsx similarly.
    # We will just inject it if we see `farmerData.userId` missing but we already handle addDoc. 
    # For batch.set, they use `farmerData` which we can manually patch if needed.
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Patched {filepath}")

print("Patch applied.")
