const fs = require('fs');

const file = 'e:/Internship/Accessories Portal/src/hooks/useTeamLeadData.ts';
let content = fs.readFileSync(file, 'utf8');

const targetRegex = /const { error: updateTargetErr }[\s\S]*?if \(insertTargetErr\) throw new Error\(`Failed to insert target stock: \$\{insertTargetErr\.message\}`\);\s*\}/;

const replacement = `const { error: updateTargetErr } = await supabase.from('accessories').update({ quantity: targetData.quantity + item.quantity }).eq('id', targetData.id);
          if (updateTargetErr) {
            // ROLLBACK
            await supabase.from('accessories').update({ quantity: sourceData.quantity }).eq('id', item.id);
            throw new Error(\`Failed to update target stock (Rollback successful): \${updateTargetErr.message}\`);
          }
        } else {
          const { error: insertTargetErr } = await supabase.from('accessories').insert([{
            counter_id: targetCounterId,
            vehicle_model: sourceData.vehicle_model,
            name: sourceData.name,
            accessory_code: sourceData.accessory_code,
            price: sourceData.price,
            cgst_percent: sourceData.cgst_percent,
            sgst_percent: sourceData.sgst_percent,
            quantity: item.quantity
          }]);
          if (insertTargetErr) {
            // ROLLBACK
            await supabase.from('accessories').update({ quantity: sourceData.quantity }).eq('id', item.id);
            throw new Error(\`Failed to insert target stock (Rollback successful): \${insertTargetErr.message}\`);
          }
        }`;

if (targetRegex.test(content)) {
    content = content.replace(targetRegex, replacement);
    fs.writeFileSync(file, content);
    console.log('Fixed useTeamLeadData.ts successfully');
} else {
    console.log('Failed to find regex match in useTeamLeadData.ts');
}
