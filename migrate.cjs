const fs = require('fs');
const path = require('path');

function walkSync(dir, filelist = []) {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    try { filelist = walkSync(dirFile, filelist); }
    catch (err) { if (err.code === 'ENOTDIR' || err.code === 'EBADF') filelist.push(dirFile); }
  });
  return filelist;
}

const files = walkSync('src').filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));

let totalModifications = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // 1. Ensure user is extracted from useAuth
  if (content.includes('useAuth()') && !content.includes('user } = useAuth()') && !content.includes('user: currentUser')) {
    content = content.replace(/const { ([^}]+) } = useAuth\(\)/, 'const { $1, user } = useAuth()');
  } else if (content.includes('useAuth()') && content.includes('{ accessToken }')) {
     content = content.replace('{ accessToken }', '{ accessToken, user }');
  }

  // 2. Ensure `where` is imported
  if (content.includes('firebase/firestore') && !content.includes('where,') && !content.includes(' where}')) {
      content = content.replace("import { ", "import { where, ");
  }

  // 3. Replace reads (getDocs and onSnapshot)
  // E.g. collection(db, 'farmers') -> query(collection(db, 'farmers'), where('userId', '==', user?.uid))
  // Except for admin_configs which uses ID directly, and settings which we will also scope.
  const targetCollections = ['farmers', 'customers', 'milk_collections', 'milk_deliveries', 'expenses', 'transactions', 'dairy_sales', 'inventory', 'settings'];
  
  targetCollections.forEach(col => {
    // Basic getDocs(collection(...))
    const regex1 = new RegExp(`getDocs\\(collection\\(db, '${col}'\\)\\)`, 'g');
    content = content.replace(regex1, `getDocs(query(collection(db, '${col}'), where('userId', '==', user?.uid)))`);

    // query(collection(...), ...)
    const regex2 = new RegExp(`query\\(collection\\(db, '${col}'\\), `, 'g');
    content = content.replace(regex2, `query(collection(db, '${col}'), where('userId', '==', user?.uid), `);

    // query(collection(...))
    const regex3 = new RegExp(`query\\(collection\\(db, '${col}'\\)\\)`, 'g');
    content = content.replace(regex3, `query(collection(db, '${col}'), where('userId', '==', user?.uid))`);

    // collection(db, 'colName') alone used as a reference inside queries that didn't get caught
    // Only if it's not already wrapped in where('userId'. We have to be careful with string replacements.
  });

  // 4. Update writes (addDoc)
  targetCollections.forEach(col => {
    const regexAdd = new RegExp(`await addDoc\\(collection\\(db, '${col}'\\), \\{`, 'g');
    content = content.replace(regexAdd, `await addDoc(collection(db, '${col}'), { userId: user?.uid,`);
    
    // Sometimes it's passed a variable: await addDoc(collection(db, 'farmers'), farmerData);
    const regexAddVar = new RegExp(`await addDoc\\(collection\\(db, '${col}'\\), ([a-zA-Z0-9_]+)\\);`, 'g');
    content = content.replace(regexAddVar, `await addDoc(collection(db, '${col}'), { ...$1, userId: user?.uid });`);
  });

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log("Updated", file);
    totalModifications++;
  }
});

console.log("Total files updated:", totalModifications);
