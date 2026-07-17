import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zofatjejtcjdocggvtid.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvZmF0amVqdGNqZG9jZ2d2dGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NDA2NzcsImV4cCI6MjA5MzUxNjY3N30.SbFRE2jzNyS5EimmNCAWgJGzLppsGAIMNhk_i-JTb4E';

const supabase = createClient(supabaseUrl, supabaseKey);

// Prefix calculation logic from BillForm.tsx
function calculatePrefix(nameToUse, userId) {
  let prefix = 'INV';
  if (nameToUse) {
    const words = nameToUse.trim().split(/[-_ ]+/);
    let initials = '';
    if (words.length >= 2 && words[0] && words[1]) {
      initials = (words[0][0] + words[1][0]).toUpperCase();
    } else if (nameToUse.length >= 2) {
      initials = nameToUse.substring(0, 2).toUpperCase();
    } else {
      initials = nameToUse.toUpperCase();
    }
    const userHash = userId ? userId.substring(0, 3).toUpperCase() : '';
    prefix = `${initials}${userHash}`;
  } else if (userId) {
    prefix = `C${userId.substring(0, 4).toUpperCase()}`;
  }
  return prefix;
}

function getBaseBillNumber(billNumber, id) {
  let bNo = billNumber || `TEMP-${id}`;
  if (/^\d+-\d+$/.test(bNo)) {
    bNo = bNo.split('-')[0];
  } else {
    const parts = bNo.split('-');
    if (parts.length > 1) {
      const last = parts[parts.length - 1];
      const secondLast = parts[parts.length - 2];
      if (/^\d{4,}$/.test(secondLast) && /^\d+$/.test(last)) {
        bNo = bNo.substring(0, bNo.lastIndexOf('-'));
      }
    }
  }
  return bNo;
}

async function migrate() {
  console.log("Starting legacy bill migration...");

  // 1. Fetch all profiles to map userId -> name
  const { data: profiles, error: pError } = await supabase.from('profiles').select('id, name');
  if (pError) throw pError;
  const profileMap = new Map();
  profiles.forEach(p => profileMap.set(p.id, p.name));

  // 2. Fetch all bills
  const { data: bills, error: bError } = await supabase.from('bills').select('*');
  if (bError) throw bError;
  
  console.log(`Fetched ${bills.length} bills.`);

  // 3. Group by counter_id
  const counterGroups = new Map();
  bills.forEach(bill => {
    const counterId = bill.counter_id;
    if (!counterId) return;
    if (!counterGroups.has(counterId)) counterGroups.set(counterId, []);
    counterGroups.get(counterId).push(bill);
  });

  const updates = [];

  for (const [counterId, counterBills] of counterGroups.entries()) {
    const counterName = profileMap.get(counterId) || '';
    const prefix = calculatePrefix(counterName, counterId);
    
    // Group bills within counter by (baseBillNumber + created_at) to identify unique logical bills
    const logicalBillsMap = new Map();
    
    counterBills.forEach(item => {
      const baseNo = getBaseBillNumber(item.bill_number, item.id);
      const timeStr = (item.created_at || '').substring(0, 16);
      const uniqueGroupKey = `${baseNo}_${timeStr}`;
      
      if (!logicalBillsMap.has(uniqueGroupKey)) {
        logicalBillsMap.set(uniqueGroupKey, {
          created_at: item.created_at,
          items: []
        });
      }
      logicalBillsMap.get(uniqueGroupKey).items.push(item);
    });

    // Sort logical bills by created_at
    const sortedLogicalBills = Array.from(logicalBillsMap.values()).sort((a, b) => {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    // Re-sequence
    let seq = 1;
    for (const logicalBill of sortedLogicalBills) {
      const paddedSeq = seq.toString().padStart(4, '0');
      const newBaseNumber = `${prefix}-${paddedSeq}`;
      
      // Sort items by created_at (or id) to ensure consistent suffixing
      logicalBill.items.sort((a, b) => a.id.localeCompare(b.id));
      
      const isMultiItem = logicalBill.items.length > 1;
      
      logicalBill.items.forEach((item, index) => {
        const newBillNumber = isMultiItem ? `${newBaseNumber}-${index + 1}` : newBaseNumber;
        if (item.bill_number !== newBillNumber) {
          updates.push({
            id: item.id,
            oldNumber: item.bill_number,
            newNumber: newBillNumber
          });
        }
      });
      
      seq++;
    }
  }

  console.log(`Found ${updates.length} bills that need number correction.`);
  if (updates.length > 0) {
    console.log("Preview of first 5 updates:");
    console.log(updates.slice(0, 5));
    
    console.log("Executing updates...");
    
    // Process in small batches to avoid timeout or overwhelming the DB
    const batchSize = 10;
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      // Update each item individually. Bulk upsert might be tricky if we don't have all fields.
      const promises = batch.map(async (u) => {
        const { error } = await supabase.from('bills').update({ bill_number: u.newNumber }).eq('id', u.id);
        if (error) {
          console.error(`Failed to update ${u.id}:`, error.message);
          failCount++;
        } else {
          successCount++;
        }
      });
      await Promise.all(promises);
      process.stdout.write(`\rProgress: ${successCount + failCount}/${updates.length}`);
    }
    
    console.log(`\nMigration completed. Success: ${successCount}, Failed: ${failCount}`);
  } else {
    console.log("No updates required. All bills are perfectly formatted.");
  }
}

migrate().catch(console.error);
