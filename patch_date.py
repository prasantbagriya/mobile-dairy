import os
import re

src_dir = r"e:\mobile-dairy-main\src"

def patch_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    if 'date-fns' not in content:
        return

    # Replace import
    # This might match import { ... } from 'date-fns'
    content = re.sub(r"import\s*\{[^}]*\}\s*from\s*['\"]date-fns['\"];?", "import dayjs from 'dayjs';", content)

    # 1. format(expr, 'fmt') -> dayjs(expr).format('fmt')
    # Be careful with nested parentheses. Simple regex might fail, let's just do common ones.
    # Actually, we can use a simpler approach for the exact usages.

    # 2. subMonths(expr, N) -> dayjs(expr).subtract(N, 'month').toDate()
    content = re.sub(r"subMonths\(([^,]+),\s*(\d+)\)", r"dayjs(\1).subtract(\2, 'month').toDate()", content)

    # 3. startOfMonth(expr) -> dayjs(expr).startOf('month').toDate()
    content = re.sub(r"startOfMonth\(([^)]+)\)", r"dayjs(\1).startOf('month').toDate()", content)

    # 4. endOfMonth(expr) -> dayjs(expr).endOf('month').toDate()
    content = re.sub(r"endOfMonth\(([^)]+)\)", r"dayjs(\1).endOf('month').toDate()", content)
    
    # 5. format(startOfMonth(new Date()), 'yyyy-MM-dd') -> dayjs().startOf('month').format('YYYY-MM-DD')
    content = content.replace("format(startOfMonth(new Date()), 'yyyy-MM-dd')", "dayjs().startOf('month').format('YYYY-MM-DD')")
    
    # format(new Date(), 'yyyy-MM-dd') -> dayjs().format('YYYY-MM-DD')
    content = content.replace("format(new Date(), 'yyyy-MM-dd')", "dayjs().format('YYYY-MM-DD')")
    
    # format(new Date(), 'yyyy-MM') -> dayjs().format('YYYY-MM')
    content = content.replace("format(new Date(), 'yyyy-MM')", "dayjs().format('YYYY-MM')")
    
    # Other formats
    content = content.replace("'yyyy-MM-dd'", "'YYYY-MM-DD'")
    content = content.replace("'yyyy-MM'", "'YYYY-MM'")
    content = content.replace("'dd MMM yyyy'", "'DD MMM YYYY'")
    content = content.replace("'MMM yyyy'", "'MMM YYYY'")
    
    # format(date, 'MMM') -> dayjs(date).format('MMM')
    content = re.sub(r"format\(([^,]+),\s*'([^']+)'\)", r"dayjs(\1).format('\2')", content)
    
    # format(new Date(date), ...) -> dayjs(date).format(...) handled mostly above but fix format(new Date(item.date), ...)
    content = content.replace("dayjs(new Date(item.date)).format", "dayjs(item.date).format")
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

for root, _, files in os.walk(src_dir):
    for file in files:
        if file.endswith(('.tsx', '.ts')):
            patch_file(os.path.join(root, file))

print("Patching complete.")
