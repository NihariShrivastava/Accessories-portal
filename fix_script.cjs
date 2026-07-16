const fs = require('fs');
const files = ['src/hooks/useTeamLeadData.ts', 'src/hooks/useAdminData.ts', 'src/hooks/useCounterData.ts'];
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/item\.bill_number\.split\('-'\)\.length\s*>\s*2\s*\?\s*item\.bill_number\.substring\(0,\s*item\.bill_number\.lastIndexOf\('-'\)\)\s*:\s*item\.bill_number/g, "/-\\d+$/.test(item.bill_number) ? item.bill_number.replace(/-\\d+$/, '') : item.bill_number");
  fs.writeFileSync(file, content);
}
console.log('Done');
