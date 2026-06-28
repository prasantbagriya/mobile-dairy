const fs = require('fs');
let code = fs.readFileSync('src/lib/auth.tsx', 'utf8');

code = code.replace(
  /linkedAt: new Date\(\)\.toISOString\(\)/g,
  "linkedAt: new Date().toISOString(),\n                tenantId: preRegData.tenantId || ''"
);

// We also need to add tenantId to the primary admin block so it exists.
code = code.replace(
  /const newAdmin = \{ \r?\n\s*email: u\.email!,\r?\n\s*role: 'admin' as Role,\r?\n\s*displayName: u\.displayName \|\| 'Primary Admin',\r?\n\s*createdAt: new Date\(\)\.toISOString\(\)\r?\n\s*\};/g,
  "const newAdmin = { \n                  email: u.email!, \n                  role: 'admin' as Role, \n                  displayName: u.displayName || 'Primary Admin',\n                  createdAt: new Date().toISOString(),\n                  tenantId: u.uid\n                };"
);

fs.writeFileSync('src/lib/auth.tsx', code);
