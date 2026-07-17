const fs = require('fs');

const file = 'e:/Internship/Accessories Portal/src/hooks/useAdminData.ts';
let content = fs.readFileSync(file, 'utf8');

const targetRegex = /if \(existingTarget\) \{\s*await supabase\.from\('accessories'\)\s*\.update\(\{ quantity: existingTarget\.quantity \+ item\.transferQuantity \}\)\s*\.eq\('id', existingTarget\.id\);\s*\} else \{\s*await supabase\.from\('accessories'\)\.insert\(\{\s*counter_id: targetCounterId,\s*vehicle_model: item\.vehicle_model,\s*name: item\.name,\s*accessory_code: item\.accessory_code,\s*price: item\.price,\s*cgst_percent: item\.cgst_percent,\s*sgst_percent: item\.sgst_percent,\s*quantity: item\.transferQuantity\s*\}\);\s*\}/;

const replacement = `if (existingTarget) {
          const { error: updateErr } = await supabase.from('accessories')
            .update({ quantity: existingTarget.quantity + item.transferQuantity })
            .eq('id', existingTarget.id);
            
          if (updateErr) {
             // Rollback
             await supabase.from('accessories')
              .update({ quantity: item.quantity }) // Restore original quantity
              .eq('id', item.id);
             throw updateErr;
          }
        } else {
          const { error: insertErr } = await supabase.from('accessories').insert({
            counter_id: targetCounterId,
            vehicle_model: item.vehicle_model,
            name: item.name,
            accessory_code: item.accessory_code,
            price: item.price,
            cgst_percent: item.cgst_percent,
            sgst_percent: item.sgst_percent,
            quantity: item.transferQuantity
          });
          
          if (insertErr) {
             // Rollback
             await supabase.from('accessories')
              .update({ quantity: item.quantity }) // Restore original quantity
              .eq('id', item.id);
             throw insertErr;
          }
        }`;

if (targetRegex.test(content)) {
    content = content.replace(targetRegex, replacement);
    fs.writeFileSync(file, content);
    console.log('Fixed useAdminData.ts successfully');
} else {
    console.log('Failed to find regex match in useAdminData.ts');
}
