const fs = require('fs');
const files = [
  'src/hooks/useTeamLeadData.ts',
  'src/hooks/useAdminData.ts',
  'src/hooks/useCounterData.ts'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  // Insert groupKey definition after bNo
  const bNoRegex = /const bNo = item\.bill_number[\s\S]*?: `TEMP-\$\{item\.id\}`;/;
  if (content.match(bNoRegex)) {
    content = content.replace(bNoRegex, match => `${match}\n      const groupKey = \`\${item.counter_id || 'unknown'}_\${bNo}_\${(item.created_at || '').substring(0, 16)}\`;`);
  }

  // Replace map.get(bNo), map.set(bNo), map.has(bNo) with groupKey
  // For useTeamLeadData (groupedBills)
  content = content.replace(/groupedBills\.has\(bNo\)/g, 'groupedBills.has(groupKey)');
  content = content.replace(/groupedBills\.set\(bNo,/g, 'groupedBills.set(groupKey,');
  content = content.replace(/groupedBills\.get\(bNo\)/g, 'groupedBills.get(groupKey)');

  // For useAdminData / useCounterData (map)
  content = content.replace(/map\.get\(bNo\)/g, 'map.get(groupKey)');
  content = content.replace(/map\.set\(bNo,/g, 'map.set(groupKey,');
  content = content.replace(/map\.has\(bNo\)/g, 'map.has(groupKey)');

  fs.writeFileSync(file, content);
}
console.log('Done');
