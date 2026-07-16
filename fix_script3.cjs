const fs = require('fs');
const files = ['src/hooks/useTeamLeadData.ts', 'src/hooks/useAdminData.ts', 'src/hooks/useCounterData.ts'];
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/\(\/-\\d\+\$\/\.test\(item\.bill_number\)\s*\?\s*item\.bill_number\.replace\(\/-\\d\+\$\/,\s*''\)\s*:\s*item\.bill_number\)/g, "(/^\\d+-\\d+$/.test(item.bill_number) ? item.bill_number.split('-')[0] : (item.bill_number.split('-').length > 2 ? item.bill_number.substring(0, item.bill_number.lastIndexOf('-')) : item.bill_number))");
  fs.writeFileSync(file, content);
}
console.log('Done');
